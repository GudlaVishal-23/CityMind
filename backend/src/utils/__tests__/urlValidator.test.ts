import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSafeImageUrl,
  safeFetchImageBuffer,
  isPrivateOrReservedIP,
  isAllowedDomain
} from '../urlValidator';

void describe('urlValidator Unit Tests (DEF-SEC-05 SSRF Defense)', () => {
  void describe('Protocol Enforcement', () => {
    void it('accepts valid HTTPS protocol on whitelisted domains', () => {
      const parsed = validateSafeImageUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg');
      assert.strictEqual(parsed.protocol, 'https:');
      assert.strictEqual(parsed.hostname, 'res.cloudinary.com');
    });

    void it('rejects HTTP protocol', () => {
      assert.throws(() => {
        validateSafeImageUrl('http://res.cloudinary.com/sample.jpg');
      }, /protocol|HTTPS/i);
    });

    void it('rejects unsupported protocols (ftp, file, javascript, data)', () => {
      assert.throws(() => validateSafeImageUrl('ftp://res.cloudinary.com/file.jpg'), /protocol|HTTPS/i);
      assert.throws(() => validateSafeImageUrl('file:///etc/passwd'), /protocol|HTTPS/i);
      assert.throws(() => validateSafeImageUrl('javascript:alert(1)'), /protocol|HTTPS/i);
      assert.throws(() => validateSafeImageUrl('data:image/png;base64,iVBORw0KGgo='), /protocol|HTTPS/i);
    });
  });

  void describe('Hostname / CDN Whitelist Enforcement', () => {
    void it('allows trusted domains (Cloudinary, Google, Firebase)', () => {
      assert.strictEqual(isAllowedDomain('res.cloudinary.com'), true);
      assert.strictEqual(isAllowedDomain('subdomain.res.cloudinary.com'), true);
      assert.strictEqual(isAllowedDomain('lh3.googleusercontent.com'), true);
      assert.strictEqual(isAllowedDomain('firebasestorage.googleapis.com'), true);
    });

    void it('rejects untrusted third-party domains', () => {
      assert.strictEqual(isAllowedDomain('evil-attacker.com'), false);
      assert.strictEqual(isAllowedDomain('notcloudinary.com'), false);
      assert.throws(() => validateSafeImageUrl('https://evil-attacker.com/malicious.jpg'), /whitelist|untrusted|domain/i);
      assert.throws(() => validateSafeImageUrl('https://notcloudinary.com/fake.jpg'), /whitelist|untrusted|domain/i);
    });

    void it('prevents subdomain boundary bypasses', () => {
      assert.strictEqual(isAllowedDomain('res.cloudinary.com.attacker.com'), false);
      assert.strictEqual(isAllowedDomain('lh3.googleusercontent.com.attacker.com'), false);
      assert.strictEqual(isAllowedDomain('evilres.cloudinary.com'), false);
      assert.throws(() => validateSafeImageUrl('https://res.cloudinary.com.attacker.com/evil.jpg'), /whitelist|untrusted|domain/i);
      assert.throws(() => validateSafeImageUrl('https://evilres.cloudinary.com/evil.jpg'), /whitelist|untrusted|domain/i);
    });
  });

  void describe('Private IP and Cloud Metadata Blacklist (SSRF Protection)', () => {
    void it('detects and blocks AWS/GCP cloud metadata IP 169.254.169.254', () => {
      assert.strictEqual(isPrivateOrReservedIP('169.254.169.254'), true);
      assert.throws(() => validateSafeImageUrl('https://169.254.169.254/latest/meta-data/'), /metadata|private|whitelist|prohibited/i);
    });

    void it('detects and blocks loopback and private IPv4 ranges', () => {
      assert.strictEqual(isPrivateOrReservedIP('127.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIP('10.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIP('172.16.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIP('172.31.255.255'), true);
      assert.strictEqual(isPrivateOrReservedIP('192.168.1.1'), true);
      assert.strictEqual(isPrivateOrReservedIP('0.0.0.0'), true);
    });

    void it('detects and blocks IPv6 loopback, link-local, and unique local ranges', () => {
      assert.strictEqual(isPrivateOrReservedIP('::1'), true);
      assert.strictEqual(isPrivateOrReservedIP('fc00::1'), true);
      assert.strictEqual(isPrivateOrReservedIP('fd00::1'), true);
      assert.strictEqual(isPrivateOrReservedIP('fe80::1'), true);
    });

    void it('detects IPv4-mapped IPv6 addresses for private ranges', () => {
      assert.strictEqual(isPrivateOrReservedIP('::ffff:127.0.0.1'), true);
      assert.strictEqual(isPrivateOrReservedIP('::ffff:169.254.169.254'), true);
      assert.strictEqual(isPrivateOrReservedIP('::ffff:10.0.0.1'), true);
    });

    void it('permits public IP addresses', () => {
      assert.strictEqual(isPrivateOrReservedIP('8.8.8.8'), false);
      assert.strictEqual(isPrivateOrReservedIP('1.1.1.1'), false);
    });
  });

  void describe('safeFetchImageBuffer Network Safeguards', () => {
    void it('enforces redirect: error and rejects redirects', async () => {
      let passedOptions: RequestInit | undefined;
      const mockFetch = async (_url: string | URL | Request, options?: RequestInit): Promise<Response> => {
        passedOptions = options;
        throw new TypeError('Failed to fetch due to redirect');
      };

      await assert.rejects(async () => {
        await safeFetchImageBuffer(
          'https://res.cloudinary.com/sample.jpg',
          10 * 1024 * 1024,
          mockFetch as unknown as typeof fetch
        );
      }, /redirect|failed/i);

      assert.strictEqual(passedOptions?.redirect, 'error');
    });

    void it('enforces stream byte size limit (maxBytes)', async () => {
      const mockFetch = async (): Promise<Response> => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(100));
            controller.enqueue(new Uint8Array(100));
            controller.close();
          }
        });
        return new Response(stream, {
          status: 200,
          headers: { 'content-type': 'image/jpeg' }
        });
      };

      await assert.rejects(async () => {
        await safeFetchImageBuffer(
          'https://res.cloudinary.com/sample.jpg',
          50, // max 50 bytes, but stream produces 200
          mockFetch as unknown as typeof fetch
        );
      }, /size|exceed|bytes/i);
    });

    void it('rejects non-image content-type (e.g. text/html)', async () => {
      const mockFetch = async (): Promise<Response> => {
        return new Response('<html><body>Fake Image</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      };

      await assert.rejects(async () => {
        await safeFetchImageBuffer(
          'https://res.cloudinary.com/test.html',
          1000,
          mockFetch as unknown as typeof fetch
        );
      }, /content type/i);
    });

    void it('successfully processes valid image stream within maxBytes', async () => {
      const mockFetch = async (): Promise<Response> => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([0xFF, 0xD8, 0xFF]));
            controller.close();
          }
        });
        return new Response(stream, {
          status: 200,
          headers: { 'content-type': 'image/jpeg' }
        });
      };

      const result = await safeFetchImageBuffer(
        'https://res.cloudinary.com/valid.jpg',
        1000,
        mockFetch as unknown as typeof fetch
      );
      assert.strictEqual(result.mimeType, 'image/jpeg');
      assert.strictEqual(result.buffer.length, 3);
    });
  });
});
