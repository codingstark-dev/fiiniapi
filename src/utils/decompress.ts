import { gunzipSync, inflateSync, brotliDecompressSync } from 'zlib';

export async function decompressResponse(response: Response): Promise<string> {
  const encoding = response.headers.get('content-encoding');
  const buffer = await response.arrayBuffer();
  let decompressed;

  switch (encoding) {
    case 'gzip':
      decompressed = gunzipSync(Buffer.from(buffer));
      break;
    case 'deflate':
      decompressed = inflateSync(Buffer.from(buffer));
      break;
    case 'br':
      decompressed = brotliDecompressSync(Buffer.from(buffer));
      break;
    default:
      decompressed = Buffer.from(buffer);
  }

  return decompressed.toString('utf-8');
}
