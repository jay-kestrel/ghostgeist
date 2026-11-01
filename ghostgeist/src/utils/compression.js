import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

const COMPRESSION_THRESHOLD_BYTES = 1024; // 1 KB

/**
 * Conditionally compresses a JSON payload with gzip if size exceeds threshold.
 *
 * @param {string|Buffer|Object} payload - Raw payload
 * @returns {Promise<{ data: Buffer|string, isCompressed: boolean, originalSize: number, compressedSize: number }>}
 */
export async function compressPayload(payload) {
  const rawString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const rawBuffer = Buffer.from(rawString, 'utf8');
  const originalSize = rawBuffer.length;

  if (originalSize <= COMPRESSION_THRESHOLD_BYTES) {
    return {
      data: rawString,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize
    };
  }

  try {
    const compressedBuffer = await gzipAsync(rawBuffer);
    return {
      data: compressedBuffer,
      isCompressed: true,
      originalSize,
      compressedSize: compressedBuffer.length
    };
  } catch (err) {
    console.warn('Gzip compression failed, falling back to uncompressed:', err.message);
    return {
      data: rawString,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize
    };
  }
}

/**
 * Decompresses a gzip-encoded buffer back to a UTF-8 string.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function decompressPayload(buffer) {
  const decompressed = await gunzipAsync(buffer);
  return decompressed.toString('utf8');
}
