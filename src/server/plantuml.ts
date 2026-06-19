import { deflateRawSync } from "node:zlib";

import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";

const PLANTUML_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function append3Bytes(
  byte1: number,
  byte2: number,
  byte3: number,
) {
  const combined = (byte1 << 16) | (byte2 << 8) | byte3;
  const char1 = (combined >> 18) & 0x3f;
  const char2 = (combined >> 12) & 0x3f;
  const char3 = (combined >> 6) & 0x3f;
  const char4 = combined & 0x3f;

  return (
    PLANTUML_ALPHABET[char1] +
    PLANTUML_ALPHABET[char2] +
    PLANTUML_ALPHABET[char3] +
    PLANTUML_ALPHABET[char4]
  );
}

export function encodePlantumlSource(sourceText: string) {
  const compressed = deflateRawSync(Buffer.from(sourceText, "utf8"));
  let encoded = "";

  for (let index = 0; index < compressed.length; index += 3) {
    const byte1 = compressed[index] ?? 0;
    const byte2 = compressed[index + 1] ?? 0;
    const byte3 = compressed[index + 2] ?? 0;
    encoded += append3Bytes(byte1, byte2, byte3);
  }

  return encoded;
}

export function getPlantumlRenderUrl(sourceText: string, format: "svg" = "svg") {
  const env = getEnv();
  if (!env.PLANTUML_SERVER_URL) {
    throw new AppError(
      "PlantUML rendering is not configured. You can still save, copy, and download the .puml source.",
      503,
      "PLANTUML_NOT_CONFIGURED",
    );
  }

  const baseUrl = env.PLANTUML_SERVER_URL.replace(/\/+$/g, "");
  const encoded = encodePlantumlSource(sourceText);
  return `${baseUrl}/${format}/${encoded}`;
}
