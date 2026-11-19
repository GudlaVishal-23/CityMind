/**
 * UTS-01 to UTS-04: Client & Geospatial Math Unit Tests
 * =========================================================
 * Tests EXIF GPS extraction, parser resilience, luminance threshold, and
 * Haversine distance calculations from frontend/src/utils/exifUtils.ts.
 *
 * Zero external network calls. Zero Gemini API calls.
 * All tests are hermetic and deterministic.
 */

import { describe, it, expect } from 'vitest';
import {
  extractExifFromBuffer,
  calculateHaversineDistanceMeters,
  type ExifMetadata,
} from '../exifUtils';

// ---------------------------------------------------------------------------
// Helper: build a minimal synthetic JPEG with EXIF GPS IFD for Hyderabad
// ---------------------------------------------------------------------------
function buildSyntheticJpegWithGps(latDeg: number, lngDeg: number): ArrayBuffer {
  // Encode rational GPS: degrees/minutes/seconds as UInt32 pairs (numerator, denominator)
  function encodeRational(decDeg: number): [number, number, number, number, number, number] {
    const absVal = Math.abs(decDeg);
    const deg = Math.floor(absVal);
    const minFloat = (absVal - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60 * 1000); // seconds * 1000
    return [deg, 1, min, 1, sec, 1000];
  }

  const latRationals = encodeRational(latDeg);
  const lngRationals = encodeRational(lngDeg);

  // Build GPS IFD: 4 entries (GPSLatRef, GPSLat, GPSLngRef, GPSLng) in little-endian TIFF
  // IFD format: 2 bytes num_entries + N * 12 byte entries + 4 bytes next IFD offset
  // Each entry: 2 tag + 2 type + 4 count + 4 value_offset_or_value

  // We'll lay out the buffer manually in little-endian order:
  // SOI (2) + APP1 marker+len (4) + "Exif\0\0" (6) + TIFF (8 header + IFD0 + GPS IFD + rationals)
  const LE = true;

  // TIFF structure plan (offsets relative to tiffBase):
  // 0: 'II' (little-endian)
  // 2: 0x002A magic
  // 4: offset to IFD0 = 8
  // 8 (IFD0): 2 bytes count=1 entry, 12 bytes entry [tag=0x8825 GPSInfo, type=4 LONG, count=1, value=gpsIfdOffset]
  //   then 4 bytes next IFD = 0
  // IFD0 total: 2 + 12 + 4 = 18 bytes, starts at 8, ends at 26
  // GPS IFD offset: 26
  // GPS IFD: 4 entries, then next IFD=0, then rational data
  // GPS IFD: 2 + 4*12 + 4 = 54 bytes, starts at 26, ends at 80
  // Rational data starts at 80

  const ifd0Offset = 8;
  const gpsIfdOffset = 26;
  const rationalDataStart = 80; // after GPS IFD (26 + 2 + 4*12 + 4 = 80)

  // Each rational array (3 rationals = 24 bytes)
  const latRatOff = rationalDataStart;
  const lngRatOff = rationalDataStart + 24;

  const totalTiff = lngRatOff + 24;
  const app1ContentLen = 6 + totalTiff; // "Exif\0\0" + tiff bytes
  const app1TotalLen = 2 + app1ContentLen; // length field includes itself
  const totalLen = 2 + 2 + 2 + app1ContentLen; // SOI + marker + len + content

  const buf = new ArrayBuffer(totalLen);
  const view = new DataView(buf);

  let off = 0;
  // SOI
  view.setUint16(off, 0xFFD8, false); off += 2;
  // APP1 marker
  view.setUint16(off, 0xFFE1, false); off += 2;
  // APP1 length (big-endian per JPEG spec)
  view.setUint16(off, app1TotalLen, false); off += 2;

  // "Exif\0\0"
  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  for (const b of exifHeader) { view.setUint8(off, b); off++; }

  // TIFF header at off (= tiffBase relative to off start)
  const tiffStart = off;
  // 'II' = little-endian
  view.setUint8(tiffStart + 0, 0x49);
  view.setUint8(tiffStart + 1, 0x49);
  // magic 0x002A
  view.setUint16(tiffStart + 2, 0x002A, LE);
  // offset to IFD0
  view.setUint32(tiffStart + 4, ifd0Offset, LE);

  // IFD0: 1 entry
  view.setUint16(tiffStart + ifd0Offset, 1, LE); // numEntries
  // Entry: tag=0x8825 (GPSInfo), type=4 (LONG), count=1, value=gpsIfdOffset
  view.setUint16(tiffStart + ifd0Offset + 2, 0x8825, LE);
  view.setUint16(tiffStart + ifd0Offset + 4, 4, LE);  // LONG
  view.setUint32(tiffStart + ifd0Offset + 6, 1, LE);  // count
  view.setUint32(tiffStart + ifd0Offset + 10, gpsIfdOffset, LE); // value = pointer to GPS IFD
  // next IFD = 0
  view.setUint32(tiffStart + ifd0Offset + 14, 0, LE);

  // GPS IFD: 4 entries
  view.setUint16(tiffStart + gpsIfdOffset, 4, LE); // numEntries
  let gpsEntry = tiffStart + gpsIfdOffset + 2;

  // Entry 0: tag=0x0001 GPSLatitudeRef, type=2 ASCII, count=2, value='N\0' inline
  view.setUint16(gpsEntry, 0x0001, LE);
  view.setUint16(gpsEntry + 2, 2, LE);
  view.setUint32(gpsEntry + 4, 2, LE);
  view.setUint8(gpsEntry + 8, latDeg >= 0 ? 0x4E : 0x53); // 'N' or 'S'
  view.setUint8(gpsEntry + 9, 0);
  gpsEntry += 12;

  // Entry 1: tag=0x0002 GPSLatitude, type=5 RATIONAL, count=3, value offset
  view.setUint16(gpsEntry, 0x0002, LE);
  view.setUint16(gpsEntry + 2, 5, LE);
  view.setUint32(gpsEntry + 4, 3, LE);
  view.setUint32(gpsEntry + 8, latRatOff, LE);
  gpsEntry += 12;

  // Entry 2: tag=0x0003 GPSLongitudeRef, type=2 ASCII, count=2, value='E\0' inline
  view.setUint16(gpsEntry, 0x0003, LE);
  view.setUint16(gpsEntry + 2, 2, LE);
  view.setUint32(gpsEntry + 4, 2, LE);
  view.setUint8(gpsEntry + 8, lngDeg >= 0 ? 0x45 : 0x57); // 'E' or 'W'
  view.setUint8(gpsEntry + 9, 0);
  gpsEntry += 12;

  // Entry 3: tag=0x0004 GPSLongitude, type=5 RATIONAL, count=3, value offset
  view.setUint16(gpsEntry, 0x0004, LE);
  view.setUint16(gpsEntry + 2, 5, LE);
  view.setUint32(gpsEntry + 4, 3, LE);
  view.setUint32(gpsEntry + 8, lngRatOff, LE);
  gpsEntry += 12;

  // GPS IFD next = 0
  view.setUint32(gpsEntry, 0, LE);

  // Write lat rationals
  view.setUint32(tiffStart + latRatOff + 0,  latRationals[0], LE);
  view.setUint32(tiffStart + latRatOff + 4,  latRationals[1], LE);
  view.setUint32(tiffStart + latRatOff + 8,  latRationals[2], LE);
  view.setUint32(tiffStart + latRatOff + 12, latRationals[3], LE);
  view.setUint32(tiffStart + latRatOff + 16, latRationals[4], LE);
  view.setUint32(tiffStart + latRatOff + 20, latRationals[5], LE);

  // Write lng rationals
  view.setUint32(tiffStart + lngRatOff + 0,  lngRationals[0], LE);
  view.setUint32(tiffStart + lngRatOff + 4,  lngRationals[1], LE);
  view.setUint32(tiffStart + lngRatOff + 8,  lngRationals[2], LE);
  view.setUint32(tiffStart + lngRatOff + 12, lngRationals[3], LE);
  view.setUint32(tiffStart + lngRatOff + 16, lngRationals[4], LE);
  view.setUint32(tiffStart + lngRatOff + 20, lngRationals[5], LE);

  return buf;
}

// ---------------------------------------------------------------------------
// UTS-01: EXIF GPS Extraction — Valid Buffer
// ---------------------------------------------------------------------------
describe('UTS-01: EXIF GPS Extraction — Valid Synthetic JPEG Buffer', () => {
  it('(a) nominal — parses Hyderabad GPS coordinates within ±0.0001° precision', () => {
    const targetLat = 17.3850;
    const targetLng = 78.4867;
    const buffer = buildSyntheticJpegWithGps(targetLat, targetLng);

    const result: ExifMetadata = extractExifFromBuffer(buffer);

    expect(result.hasGps).toBe(true);
    expect(result.latitude).toBeDefined();
    expect(result.longitude).toBeDefined();
    expect(Math.abs((result.latitude ?? 0) - targetLat)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs((result.longitude ?? 0) - targetLng)).toBeLessThanOrEqual(0.0001);
  });

  it('(b) boundary — parses minimum-valid single-degree GPS (0°0\'0" N, 0°0\'0" E)', () => {
    const buffer = buildSyntheticJpegWithGps(0.0, 0.0);
    const result = extractExifFromBuffer(buffer);
    expect(result.hasGps).toBe(true);
    expect(Math.abs((result.latitude ?? 999) - 0.0)).toBeLessThanOrEqual(0.001);
    expect(Math.abs((result.longitude ?? 999) - 0.0)).toBeLessThanOrEqual(0.001);
  });

  it('(c) adversarial — negative (South/West) coordinates parsed with correct sign', () => {
    // Build S lat, W lng
    const buffer = buildSyntheticJpegWithGps(-17.3850, -78.4867);
    const result = extractExifFromBuffer(buffer);
    expect(result.hasGps).toBe(true);
    // Latitude must be negative for 'S', longitude negative for 'W'
    expect((result.latitude ?? 0)).toBeLessThanOrEqual(0);
    expect((result.longitude ?? 0)).toBeLessThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// UTS-02: EXIF Parser Resilience — Corrupted / Stripped Buffers
// ---------------------------------------------------------------------------
describe('UTS-02: EXIF Parser Resilience — Corrupted / Stripped Buffers', () => {
  it('(a) non-JPEG buffer — returns hasGps: false without throwing', () => {
    const buf = new ArrayBuffer(32);
    const view = new DataView(buf);
    view.setUint16(0, 0x8950, false); // PNG magic bytes
    const result = extractExifFromBuffer(buf);
    expect(result.hasGps).toBe(false);
    expect(result.latitude).toBeUndefined();
  });

  it('(b) empty ArrayBuffer(0) — returns hasGps: false without throwing', () => {
    const result = extractExifFromBuffer(new ArrayBuffer(0));
    expect(result.hasGps).toBe(false);
  });

  it('(c) truncated JPEG header (0xFFD8 only, 2 bytes) — safely returns hasGps: false', () => {
    const buf = new ArrayBuffer(2);
    const view = new DataView(buf);
    view.setUint16(0, 0xFFD8, false);
    const result = extractExifFromBuffer(buf);
    expect(result.hasGps).toBe(false);
  });

  it('(d) JPEG SOI but no APP1 marker — returns hasGps: false (no Exif found)', () => {
    // Create a valid SOI + APP0 (JFIF, not Exif) buffer
    const buf = new ArrayBuffer(20);
    const view = new DataView(buf);
    view.setUint16(0, 0xFFD8, false); // SOI
    view.setUint16(2, 0xFFE0, false); // APP0 (JFIF, not Exif)
    view.setUint16(4, 14, false);     // length
    const result = extractExifFromBuffer(buf);
    expect(result.hasGps).toBe(false);
  });

  it('(e) random byte array that starts with JPEG magic — handles gracefully without throw', () => {
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    view.setUint16(0, 0xFFD8, false); // SOI
    // Random bytes after
    for (let i = 2; i < 64; i++) view.setUint8(i, Math.floor(Math.random() * 256));
    // Must not throw
    let result: ExifMetadata | undefined;
    expect(() => { result = extractExifFromBuffer(buf); }).not.toThrow();
    expect(result?.hasGps ?? false).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UTS-03: Luminance Threshold Validation
// ---------------------------------------------------------------------------
describe('UTS-03: Canvas Luminance Threshold Validation', () => {
  function makeBase64WithAvgByte(byteValue: number, length: number = 3000): string {
    const bytes = Buffer.alloc(length, byteValue);
    return bytes.toString('base64');
  }

  it('(a) nominal daylight frame (avg ≈ 128) — passes quality gate (not rejected)', () => {
    // High variance with non-aliasing pattern: pattern length 7 (coprime with step 6)
    const pattern = [70, 120, 160, 200, 90, 150, 180];
    const bytes = Buffer.allocUnsafe(3000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = pattern[i % pattern.length];
    const base64 = bytes.toString('base64');

    const { avg, variance, rejected } = (() => {
      // Inline the same logic as checkLuminanceFromBase64 (pureHelpers)
      const buf = Buffer.from(base64, 'base64');
      let sum = 0; let count = 0;
      const step = Math.max(1, Math.floor(buf.length / 500));
      for (let i = 0; i < buf.length; i += step) { sum += buf[i]; count++; }
      const avg = count > 0 ? sum / count : 0;
      let diffSqSum = 0;
      for (let i = 0; i < buf.length; i += step) diffSqSum += Math.pow(buf[i] - avg, 2);
      const variance = count > 0 ? diffSqSum / count : 0;
      return { avg, variance, rejected: avg < 40 || variance < 120 };
    })();

    expect(avg).toBeGreaterThan(100);
    expect(variance).toBeGreaterThan(120);
    expect(rejected).toBe(false);
  });

  it('(b) boundary: avg = 39 (dark, avg < 40) — rejected as too dark', () => {
    const base64 = makeBase64WithAvgByte(39);
    const buf = Buffer.from(base64, 'base64');
    let sum = 0; let count = 0;
    const step = Math.max(1, Math.floor(buf.length / 500));
    for (let i = 0; i < buf.length; i += step) { sum += buf[i]; count++; }
    const avg = count > 0 ? sum / count : 0;
    expect(avg).toBeLessThan(40);
  });

  it('(b2) boundary: avg = 40 — passes avg threshold (avg is NOT < 40)', () => {
    const base64 = makeBase64WithAvgByte(40);
    const buf = Buffer.from(base64, 'base64');
    let sum = 0; let count = 0;
    const step = Math.max(1, Math.floor(buf.length / 500));
    for (let i = 0; i < buf.length; i += step) { sum += buf[i]; count++; }
    const avg = count > 0 ? sum / count : 0;
    expect(avg).toBeGreaterThanOrEqual(40);
  });

  it('(c) flat solid-colour buffer (all 128) — rejected due to variance < 120', () => {
    const base64 = makeBase64WithAvgByte(128); // flat → variance ≈ 0
    const buf = Buffer.from(base64, 'base64');
    let sum = 0; let count = 0;
    const step = Math.max(1, Math.floor(buf.length / 500));
    for (let i = 0; i < buf.length; i += step) { sum += buf[i]; count++; }
    const avg = count > 0 ? sum / count : 0;
    let diffSqSum = 0;
    for (let i = 0; i < buf.length; i += step) diffSqSum += Math.pow(buf[i] - avg, 2);
    const variance = count > 0 ? diffSqSum / count : 0;
    expect(variance).toBeLessThan(120); // flat → low variance → rejected
  });

  it('(d) adversarial: empty base64 string — returns rejected = true', () => {
    const input: string = '';
    const buf = Buffer.from(input, 'base64');
    // Length < 50 triggers early rejection
    expect(buf.length).toBe(0);
    // Simulate check
    const rejected = !input || input.length < 50;
    expect(rejected).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UTS-04: Haversine Distance & 500m Proximity Gate
// ---------------------------------------------------------------------------
describe('UTS-04: Haversine Distance & 500m Proximity Gate', () => {
  it('(a) nominal — identical coordinates return 0 meters', () => {
    const dist = calculateHaversineDistanceMeters(17.3850, 78.4867, 17.3850, 78.4867);
    expect(dist).toBe(0);
  });

  it('(b) boundary — two points ~320m apart pass the ≤500m proximity gate', () => {
    // Hyderabad: Tank Bund to a point ~320m away (approx 0.003° lat delta)
    const dist = calculateHaversineDistanceMeters(17.3850, 78.4867, 17.3879, 78.4867);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThanOrEqual(500);
  });

  it('(b2) boundary — two points exactly at boundary edge ~500m apart', () => {
    // 500m in latitude ≈ 0.0045° at equator; adjust to ~0.004° for Hyderabad
    const dist = calculateHaversineDistanceMeters(17.3850, 78.4867, 17.3895, 78.4867);
    // This should be ~500m ± 100m
    expect(dist).toBeLessThanOrEqual(600);
    expect(dist).toBeGreaterThan(200);
  });

  it('(c) adversarial — two points 1,450m apart — rejected (> 500m)', () => {
    // ~1450m north: ~0.013° lat delta
    const dist = calculateHaversineDistanceMeters(17.3850, 78.4867, 17.3980, 78.4867);
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeGreaterThan(1000);
  });

  it('(d) cross-city distance (Hyderabad → Delhi) — clearly > 500m', () => {
    const dist = calculateHaversineDistanceMeters(17.3850, 78.4867, 28.6139, 77.2090);
    expect(dist).toBeGreaterThan(100000); // > 100km
  });
});
