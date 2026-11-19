import dns from 'node:dns/promises';
import net from 'node:net';
import env from '../config/env';
import logger from './logger';
import { logSecurityEvent } from './securityLogger';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const FETCH_TIMEOUT_MS = 8000; // 8 seconds

/**
 * Checks whether an IP string falls within private, loopback, link-local,
 * multicast, or cloud metadata reserved ranges.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;

  // Normalize IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  let normalizedIp = ip.trim();
  if (normalizedIp.startsWith('::ffff:')) {
    normalizedIp = normalizedIp.substring(7);
  }

  // Handle localhost name directly if passed as IP
  if (normalizedIp.toLowerCase() === 'localhost') {
    return true;
  }

  const ipVersion = net.isIP(normalizedIp);
  if (ipVersion === 4) {
    const parts = normalizedIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Treat malformed IPs as unsafe
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata: 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future use: 240.0.0.0 - 255.255.255.255)
    if (a >= 240) return true;

    return false;
  }

  if (ipVersion === 6) {
    const lower = normalizedIp.toLowerCase();
    // IPv6 Loopback (::1 or 0:0:0:0:0:0:0:1) and Unspecified (::)
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1' || lower === '::') {
      return true;
    }
    // fc00::/7 Unique Local Address (fc00:: - fdff:ffff:...)
    if (/^f[cd][0-9a-f]{2}:/i.test(lower) || lower.startsWith('fc') || lower.startsWith('fd')) {
      return true;
    }
    // fe80::/10 Link-Local Unicast (fe80:: - febf:...)
    if (/^fe[89ab][0-9a-f]:/i.test(lower) || lower.startsWith('fe80:')) {
      return true;
    }
    return false;
  }

  // Not an IP address
  return false;
}

/**
 * Validates whether a hostname matches an authorized domain or trusted subdomain boundary.
 */
export function isAllowedDomain(hostname: string, allowedDomains?: string[]): boolean {
  if (!hostname || typeof hostname !== 'string') return false;

  const allowed = allowedDomains || env.allowedImageDomains || [
    'res.cloudinary.com',
    'lh3.googleusercontent.com',
    'firebasestorage.googleapis.com'
  ];

  const lowerHost = hostname.toLowerCase();
  return allowed.some((domain) => {
    const lowerDomain = domain.toLowerCase();
    return lowerHost === lowerDomain || lowerHost.endsWith(`.${lowerDomain}`);
  });
}

/**
 * Synchronously validates that an image URL is safe and well-formed.
 * Throws descriptive Errors if protocol, domain whitelist, or format checks fail.
 */
export function validateSafeImageUrl(rawUrl: string): URL {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Image URL must be a non-empty string.');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  // Protocol check: strictly HTTPS unless explicitly in dev/test with local flag
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const allowHttpForLocal = isDevOrTest && process.env.ALLOW_HTTP_FOR_LOCAL_TESTING === 'true';

  if (parsed.protocol !== 'https:') {
    if (!(allowHttpForLocal && parsed.protocol === 'http:')) {
      throw new Error(`Invalid protocol '${parsed.protocol}'. Only HTTPS is permitted.`);
    }
  }

  // Hostname validation
  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error('Image URL missing hostname.');
  }

  // Block direct IP literal addresses in hostname for private/reserved/metadata ranges or localhost
  if (hostname.toLowerCase() === 'localhost' || (net.isIP(hostname) !== 0 && isPrivateOrReservedIP(hostname))) {
    logSecurityEvent({
      level: 'CRITICAL',
      eventType: 'SSRF_BLOCKED',
      details: { hostname, reason: 'Prohibited IP or private address in hostname' }
    });
    throw new Error(`Prohibited IP or private address in hostname: '${hostname}'.`);
  }

  // Hostname whitelist check
  const allowed = env.allowedImageDomains || [
    'res.cloudinary.com',
    'lh3.googleusercontent.com',
    'firebasestorage.googleapis.com'
  ];

  if (!isAllowedDomain(hostname, allowed)) {
    logSecurityEvent({
      level: 'WARN',
      eventType: 'SSRF_BLOCKED',
      details: { hostname, allowedDomains: allowed, reason: 'Untrusted image domain' }
    });
    throw new Error(
      `Untrusted image domain '${hostname}'. Domain must match or end with: ${allowed.join(', ')}`
    );
  }

  return parsed;
}

/**
 * Safely fetches an image buffer with comprehensive SSRF protection, DNS resolution checks,
 * redirect rejection, timeout, Content-Type enforcement, and stream byte size cap.
 */
export async function safeFetchImageBuffer(
  rawUrl: string,
  maxBytes: number = MAX_IMAGE_BYTES,
  fetchImpl: typeof fetch = fetch
): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: Syntactic & Domain validation
  const validUrl = validateSafeImageUrl(rawUrl);

  // Step 2: DNS Resolution & Private IP Blacklist Check
  let addresses: Array<{ address: string; family: number }> = [];
  try {
    addresses = await dns.lookup(validUrl.hostname, { all: true });
  } catch (dnsErr: unknown) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    throw new Error(`DNS resolution failed for host '${validUrl.hostname}': ${msg}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`No DNS records found for host '${validUrl.hostname}'.`);
  }

  for (const entry of addresses) {
    if (isPrivateOrReservedIP(entry.address)) {
      logger.warn(`[SSRF Defense] Blocked SSRF attempt: host '${validUrl.hostname}' resolved to private IP '${entry.address}'`);
      logSecurityEvent({
        level: 'CRITICAL',
        eventType: 'SSRF_BLOCKED',
        details: { hostname: validUrl.hostname, resolvedIp: entry.address, reason: 'DNS resolved to prohibited private IP' }
      });
      throw new Error(`SSRF attempt detected: Domain resolved to prohibited IP '${entry.address}'.`);
    }
  }

  // Step 3: Outbound fetch with safeguards
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(validUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'AICity-ImageFetcher/1.0',
        'Accept': ALLOWED_MIME_TYPES.join(', ')
      },
      redirect: 'error', // Reject all redirects to prevent SSRF bypass
      signal: controller.signal
    });
  } catch (err: unknown) {
    const errorObj = err as { name?: string; message?: string };
    if (errorObj?.name === 'AbortError') {
      throw new Error(`Image fetch timed out after ${FETCH_TIMEOUT_MS}ms.`);
    }
    throw new Error(`Image download request failed: ${errorObj?.message || String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} fetching image.`);
  }

  // Step 4: Content-Type Validation
  const contentType = response.headers.get('content-type') || '';
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Invalid content type '${mimeType}'. Only ${ALLOWED_MIME_TYPES.join(', ')} are permitted.`
    );
  }

  // Step 5: Content-Length fast-fail
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(declaredLength) && declaredLength > maxBytes) {
      throw new Error(`Image size ${declaredLength} bytes exceeds limit of ${maxBytes} bytes.`);
    }
  }

  // Step 6: Chunked Stream Consumption with Size Ceiling
  if (!response.body) {
    throw new Error('Image response body is empty.');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  let streamDone = false;
  try {
    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) {
        streamDone = true;
        break;
      }
      if (value) {
        totalBytes += value.length;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new Error(`Image stream exceeded maximum allowed size of ${maxBytes} bytes.`);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);
  return { buffer, mimeType };
}
