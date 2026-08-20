import { createHash } from "node:crypto";

import {
  createFootageVerifier,
  FootageVerificationError,
  type FootageVerifier,
} from "./footage-verifier.js";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class AssetContentVerificationError extends Error {
  constructor(
    readonly code: "invalid" | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "AssetContentVerificationError";
  }
}

export type VerifiedAssetContent = {
  width?: number;
  height?: number;
  durationMs?: number;
};

export type AssetContentVerifier = {
  verify(input: {
    kind: "product" | "logo" | "audio" | "reference" | "footage";
    bytes: Uint8Array;
    mimeType: string;
    checksumSha256: string;
  }): Promise<VerifiedAssetContent>;
};

function readUInt16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUInt32BigEndian(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! * 0x1000000)
    + ((bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!)
  );
}

function requireDimensions(width: number, height: number): { width: number; height: number } {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 65_535 || height > 65_535) {
    throw new AssetContentVerificationError("invalid", "The uploaded image has invalid dimensions.");
  }
  return { width, height };
}

function verifyJpeg(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new AssetContentVerificationError("invalid", "The uploaded file is not a valid JPG image.");
  }
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new AssetContentVerificationError("invalid", "The uploaded JPG image is malformed.");
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++]!;
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = readUInt16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      throw new AssetContentVerificationError("invalid", "The uploaded JPG image is malformed.");
    }
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xc3 || marker >= 0xc5 && marker <= 0xc7 || marker >= 0xc9 && marker <= 0xcb || marker >= 0xcd && marker <= 0xcf;
    if (isStartOfFrame) {
      if (segmentLength < 8) {
        throw new AssetContentVerificationError("invalid", "The uploaded JPG image is malformed.");
      }
      return requireDimensions(readUInt16BigEndian(bytes, offset + 5), readUInt16BigEndian(bytes, offset + 3));
    }
    offset += segmentLength;
  }
  throw new AssetContentVerificationError("invalid", "The uploaded JPG image could not be decoded.");
}

function verifyPng(bytes: Uint8Array): { width: number; height: number } {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 33 || !signature.every((value, index) => bytes[index] === value)) {
    throw new AssetContentVerificationError("invalid", "The uploaded file is not a valid PNG image.");
  }
  const ihdrLength = readUInt32BigEndian(bytes, 8);
  const ihdrType = String.fromCharCode(...bytes.subarray(12, 16));
  if (ihdrLength !== 13 || ihdrType !== "IHDR") {
    throw new AssetContentVerificationError("invalid", "The uploaded PNG image is malformed.");
  }
  return requireDimensions(readUInt32BigEndian(bytes, 16), readUInt32BigEndian(bytes, 20));
}

function readUInt24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}

function verifyWebp(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 30 || String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP") {
    throw new AssetContentVerificationError("invalid", "The uploaded file is not a valid WebP image.");
  }
  const chunk = String.fromCharCode(...bytes.subarray(12, 16));
  if (chunk === "VP8X" && bytes.length >= 30) {
    return requireDimensions(1 + readUInt24LittleEndian(bytes, 24), 1 + readUInt24LittleEndian(bytes, 27));
  }
  if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return requireDimensions(readUInt16BigEndian(bytes, 26) & 0x3fff, readUInt16BigEndian(bytes, 28) & 0x3fff);
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const value = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
    return requireDimensions((value & 0x3fff) + 1, ((value >> 14) & 0x3fff) + 1);
  }
  throw new AssetContentVerificationError("invalid", "The uploaded WebP image could not be decoded.");
}

function verifyImage(input: { bytes: Uint8Array; mimeType: string; checksumSha256: string }): VerifiedAssetContent {
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new AssetContentVerificationError("invalid", "Images must be JPG, PNG or WebP files.");
  }
  if (!input.bytes.byteLength || input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new AssetContentVerificationError("invalid", "Product images must be 12 MB or smaller.");
  }
  const checksum = createHash("sha256").update(input.bytes).digest("hex");
  if (checksum !== input.checksumSha256.trim().toLowerCase()) {
    throw new AssetContentVerificationError("invalid", "The uploaded image checksum does not match the saved asset.");
  }
  if (mimeType === "image/jpeg") return verifyJpeg(input.bytes);
  if (mimeType === "image/png") return verifyPng(input.bytes);
  return verifyWebp(input.bytes);
}

/** One server boundary validates all private upload bytes before a claim may advance. */
export function createAssetContentVerifier(options: { footageVerifier?: FootageVerifier } = {}): AssetContentVerifier {
  const footageVerifier = options.footageVerifier ?? createFootageVerifier();
  return {
    async verify(input) {
      if (input.kind === "footage") {
        try {
          const verified = await footageVerifier.verify(input);
          return { durationMs: verified.durationMs };
        } catch (error) {
          if (error instanceof FootageVerificationError) {
            throw new AssetContentVerificationError(error.code, error.message);
          }
          throw error;
        }
      }
      if (input.kind === "audio") {
        const checksum = createHash("sha256").update(input.bytes).digest("hex");
        if (!input.bytes.byteLength || checksum !== input.checksumSha256.trim().toLowerCase()) {
          throw new AssetContentVerificationError("invalid", "The uploaded audio checksum does not match the saved asset.");
        }
        return {};
      }
      return verifyImage(input);
    },
  };
}
