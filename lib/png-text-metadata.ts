const CRC_TABLE = new Uint32Array(256);

for (let index = 0; index < 256; index++) {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[index] = value;
}

const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeU32BE = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value, false);
};

const wrapChunk = (type: string, data: Uint8Array): Uint8Array => {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  writeU32BE(view, 0, data.length);
  const typeBytes = new TextEncoder().encode(type);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const crcPayload = new Uint8Array(4 + data.length);
  crcPayload.set(typeBytes, 0);
  crcPayload.set(data, 4);
  writeU32BE(view, 8 + data.length, crc32(crcPayload));
  return chunk;
};

const createTextChunk = (keyword: string, text: string): Uint8Array => {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  data.set(keywordBytes, 0);
  data[keywordBytes.length] = 0;
  data.set(textBytes, keywordBytes.length + 1);
  return wrapChunk('tEXt', data);
};

const createInternationalTextChunk = (
  keyword: string,
  text: string,
): Uint8Array => {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const data = new Uint8Array(
    keywordBytes.length + 1 + 1 + 1 + 1 + 1 + textBytes.length,
  );
  let offset = 0;
  data.set(keywordBytes, offset);
  offset += keywordBytes.length;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data[offset] = 0;
  offset += 1;
  data.set(textBytes, offset);
  return wrapChunk('iTXt', data);
};

const needsInternationalText = (value: string): boolean => {
  return /[^\x00-\x7f]/.test(value);
};

const findIendOffset = (bytes: Uint8Array): number => {
  for (let offset = bytes.length - 12; offset >= 8; offset--) {
    if (
      bytes[offset + 4] === 0x49 &&
      bytes[offset + 5] === 0x45 &&
      bytes[offset + 6] === 0x4e &&
      bytes[offset + 7] === 0x44
    ) {
      return offset;
    }
  }
  return -1;
};

export type PngTextChunkInput = {
  keyword: string;
  text: string;
};

export const embedPngTextChunks = async (
  blob: Blob,
  chunks: PngTextChunkInput[],
): Promise<Blob> => {
  if (chunks.length === 0) {
    return blob;
  }

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12 || bytes[0] !== 0x89) {
    return blob;
  }

  const iendOffset = findIendOffset(bytes);
  if (iendOffset < 0) {
    return blob;
  }

  const encodedChunks = chunks.map(({ keyword, text }) => {
    if (needsInternationalText(keyword) || needsInternationalText(text)) {
      return createInternationalTextChunk(keyword, text);
    }
    return createTextChunk(keyword, text);
  });

  const insertedLength = encodedChunks.reduce(
    (total, chunk) => total + chunk.length,
    0,
  );
  const output = new Uint8Array(iendOffset + insertedLength + 12);
  output.set(bytes.subarray(0, iendOffset), 0);

  let writeOffset = iendOffset;
  for (const chunk of encodedChunks) {
    output.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  output.set(bytes.subarray(iendOffset), writeOffset);
  return new Blob([output], { type: 'image/png' });
};
