import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express, { Request, Response } from 'express';
import { incidentIngestionLimiter, mediaUploadLimiter } from '../rateLimit.middleware';

void describe('rateLimit Middleware Tests (DEF-OPS-04 Tiered Rate Limiting)', () => {
  void it('enforces incidentIngestionLimiter after 30 requests when x-test-rate-limit is true', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(incidentIngestionLimiter);
    app.post('/api/incidents', (_req: Request, res: Response) => {
      res.status(201).json({ success: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/api/incidents`;

    try {
      // 30 requests succeed
      for (let i = 0; i < 30; i++) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-test-rate-limit': 'true',
            'x-forwarded-for': '203.0.113.10'
          }
        });
        assert.strictEqual(res.status, 201, `Request ${i + 1} should succeed with 201`);
      }

      // 31st request triggers 429
      const rateLimitedRes = await fetch(url, {
        method: 'POST',
        headers: {
          'x-test-rate-limit': 'true',
          'x-forwarded-for': '203.0.113.10'
        }
      });
      assert.strictEqual(rateLimitedRes.status, 429, '31st request must return HTTP 429');

      const body = (await rateLimitedRes.json()) as {
        success: boolean;
        code: string;
        error: string;
        retryAfterSeconds: number;
      };

      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'RATE_LIMIT_EXCEEDED');
      assert.ok(typeof body.error === 'string');
      assert.strictEqual(body.retryAfterSeconds, 60);
    } finally {
      server.close();
    }
  });

  void it('bypasses rate limit in test environment when x-test-rate-limit is absent', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(incidentIngestionLimiter);
    app.post('/api/incidents', (_req: Request, res: Response) => {
      res.status(201).json({ success: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/api/incidents`;

    try {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      try {
        for (let i = 0; i < 35; i++) {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'x-forwarded-for': '203.0.113.20' }
          });
          assert.strictEqual(res.status, 201);
        }
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    } finally {
      server.close();
    }
  });

  void it('enforces mediaUploadLimiter after 15 requests when x-test-rate-limit is true', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(mediaUploadLimiter);
    app.post('/api/incidents/upload', (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    const url = `http://127.0.0.1:${port}/api/incidents/upload`;

    try {
      for (let i = 0; i < 15; i++) {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-test-rate-limit': 'true',
            'x-forwarded-for': '203.0.113.30'
          }
        });
        assert.strictEqual(res.status, 200);
      }

      const overLimitRes = await fetch(url, {
        method: 'POST',
        headers: {
          'x-test-rate-limit': 'true',
          'x-forwarded-for': '203.0.113.30'
        }
      });
      assert.strictEqual(overLimitRes.status, 429);
      const body = (await overLimitRes.json()) as {
        success: boolean;
        code: string;
        error: string;
        retryAfterSeconds: number;
      };
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'RATE_LIMIT_EXCEEDED');
      assert.strictEqual(body.retryAfterSeconds, 60);
    } finally {
      server.close();
    }
  });
});
