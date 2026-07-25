/**
 * Lightweight Zero-Dependency EXIF Metadata & GPS Distance Parser Utility
 * Extract GPS Latitude/Longitude, Timestamp, Camera Model from JPEG/PNG images
 * and calculate Haversine distance for location validation.
 */

export interface ExifMetadata {
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  dateTime?: string;
  cameraMake?: string;
  cameraModel?: string;
  rawGpsString?: string;
}

/**
 * Haversine Formula: Calculate distance in meters between two lat/lng coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Convert ArrayBuffer / DataURI to DataView and parse JPEG EXIF APP1 (0xFFE1) tags
 */
export function extractExifFromBuffer(buffer: ArrayBuffer): ExifMetadata {
  try {
    const view = new DataView(buffer);

    // Check for JPEG SOI marker (0xFFD8)
    if (view.getUint16(0, false) !== 0xffd8) {
      return { hasGps: false };
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 2) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP1 marker (0xFFE1)
      if (marker === 0xffe1) {
        const app1Length = view.getUint16(offset, false);
        offset += 2;

        // Check for 'Exif\0\0' (0x457869660000)
        const exifHeader = view.getUint32(offset, false);
        if (exifHeader === 0x45786966) {
          const tiffHeaderOffset = offset + 6;
          return parseTiffHeader(view, tiffHeaderOffset);
        }
        offset += app1Length - 2;
      } else if ((marker & 0xff00) === 0xff00) {
        // Skip other markers
        if (marker === 0xffda) break; // Start of Scan (SOS)
        const markerLength = view.getUint16(offset, false);
        offset += markerLength;
      } else {
        break;
      }
    }
  } catch (err) {
    console.warn('[ExifUtils] EXIF parsing error:', err);
  }

  return { hasGps: false };
}

/**
 * Helper to parse TIFF header and IFD tags for GPS and DateTime
 */
function parseTiffHeader(view: DataView, tiffOffset: number): ExifMetadata {
  const isLittleEndian = view.getUint16(tiffOffset, false) === 0x4949; // 'II' vs 'MM'
  const firstIfdOffset = view.getUint32(tiffOffset + 4, isLittleEndian);

  let result: ExifMetadata = { hasGps: false };
  if (!firstIfdOffset) return result;

  const ifd0Offset = tiffOffset + firstIfdOffset;
  const numEntries = view.getUint16(ifd0Offset, isLittleEndian);

  let gpsIfdOffset = 0;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifd0Offset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, isLittleEndian);

    // Tag 0x8825 = GPSInfo IFD Pointer
    if (tag === 0x8825) {
      gpsIfdOffset = tiffOffset + view.getUint32(entryOffset + 8, isLittleEndian);
    }
    // Tag 0x0110 = Model
    if (tag === 0x0110) {
      result.cameraModel = readStringTag(view, tiffOffset, entryOffset, isLittleEndian);
    }
    // Tag 0x010F = Make
    if (tag === 0x010f) {
      result.cameraMake = readStringTag(view, tiffOffset, entryOffset, isLittleEndian);
    }
  }

  if (gpsIfdOffset > 0) {
    const gpsData = parseGpsIfd(view, tiffOffset, gpsIfdOffset, isLittleEndian);
    if (gpsData.latitude !== undefined && gpsData.longitude !== undefined) {
      result.hasGps = true;
      result.latitude = gpsData.latitude;
      result.longitude = gpsData.longitude;
      result.rawGpsString = `${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`;
    }
  }

  return result;
}

function parseGpsIfd(view: DataView, tiffOffset: number, gpsOffset: number, littleEndian: boolean) {
  const numEntries = view.getUint16(gpsOffset, littleEndian);
  let latRef = 'N';
  let lngRef = 'E';
  let latVals: number[] = [];
  let lngVals: number[] = [];

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = gpsOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);

    if (tag === 0x0001) {
      // GPSLatitudeRef ('N' or 'S')
      latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    } else if (tag === 0x0002) {
      // GPSLatitude (3 rationals)
      latVals = readRationals(view, tiffOffset, entryOffset, littleEndian, 3);
    } else if (tag === 0x0003) {
      // GPSLongitudeRef ('E' or 'W')
      lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    } else if (tag === 0x0004) {
      // GPSLongitude (3 rationals)
      lngVals = readRationals(view, tiffOffset, entryOffset, littleEndian, 3);
    }
  }

  let latitude: number | undefined;
  let longitude: number | undefined;

  if (latVals.length === 3) {
    latitude = latVals[0] + latVals[1] / 60 + latVals[2] / 3600;
    if (latRef === 'S') latitude = -latitude;
  }
  if (lngVals.length === 3) {
    longitude = lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600;
    if (lngRef === 'W') longitude = -longitude;
  }

  return { latitude, longitude };
}

function readRationals(
  view: DataView,
  tiffOffset: number,
  entryOffset: number,
  littleEndian: boolean,
  count: number
): number[] {
  const valueOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
  const rationals: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(valueOffset + i * 8, littleEndian);
    const den = view.getUint32(valueOffset + i * 8 + 4, littleEndian);
    rationals.push(den === 0 ? 0 : num / den);
  }
  return rationals;
}

function readStringTag(
  view: DataView,
  tiffOffset: number,
  entryOffset: number,
  littleEndian: boolean
): string {
  const count = view.getUint32(entryOffset + 4, littleEndian);
  if (count <= 4) {
    let str = '';
    for (let i = 0; i < count; i++) {
      const charCode = view.getUint8(entryOffset + 8 + i);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }
    return str.trim();
  }
  const valueOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
  let str = '';
  for (let i = 0; i < count; i++) {
    const charCode = view.getUint8(valueOffset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

/**
 * Extract EXIF from File or Data URL in Browser
 */
export async function extractExifFromImage(fileOrDataUrl: File | string): Promise<ExifMetadata> {
  try {
    let buffer: ArrayBuffer;
    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('data:')) {
        const base64Str = fileOrDataUrl.split(',')[1];
        const binaryStr = atob(base64Str);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        buffer = bytes.buffer;
      } else {
        const res = await fetch(fileOrDataUrl);
        buffer = await res.arrayBuffer();
      }
    } else {
      buffer = await fileOrDataUrl.arrayBuffer();
    }
    return extractExifFromBuffer(buffer);
  } catch (err) {
    console.warn('[ExifUtils] Error reading image for EXIF:', err);
    return { hasGps: false };
  }
}
