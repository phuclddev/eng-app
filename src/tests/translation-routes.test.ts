import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const requireAdminApiSession = vi.fn();
const extractTranslationChunk = vi.fn();
const saveTranslationChunk = vi.fn();
const recordTranslationReview = vi.fn();
const importTranslationCsv = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
  requireAdminApiSession,
}));

vi.mock("@/server/translation/translation-chunk-service", () => ({
  extractTranslationChunk,
  saveTranslationChunk,
}));

vi.mock("@/server/translation/translation-review-service", () => ({
  recordTranslationReview,
}));

vi.mock("@/server/translation/translation-script-service", () => ({
  importTranslationCsv,
  listTranslationScripts: vi.fn(),
  getTranslationScriptForUser: vi.fn(),
}));

let extractPost: typeof import("@/app/api/translation/extract-chunk/route").POST;
let savePost: typeof import("@/app/api/translation/save-chunk/route").POST;
let reviewPost: typeof import("@/app/api/translation/review/route").POST;
let importPost: typeof import("@/app/api/admin/translation/import/route").POST;

beforeAll(async () => {
  ({ POST: extractPost } = await import(
    "@/app/api/translation/extract-chunk/route"
  ));
  ({ POST: savePost } = await import("@/app/api/translation/save-chunk/route"));
  ({ POST: reviewPost } = await import("@/app/api/translation/review/route"));
  ({ POST: importPost } = await import(
    "@/app/api/admin/translation/import/route"
  ));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  requireAdminApiSession.mockReset();
  extractTranslationChunk.mockReset();
  saveTranslationChunk.mockReset();
  recordTranslationReview.mockReset();
  importTranslationCsv.mockReset();
});

const baseUser = { id: "user-1", email: "user-1@example.com", role: "USER" };

describe("translation extract route", () => {
  it("requires an approved user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await extractPost(
      new Request("http://localhost:3000/api/translation/extract-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: "sentence-1",
          englishPhrase: "wake up",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(extractTranslationChunk).not.toHaveBeenCalled();
  });

  it("validates the english phrase length", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await extractPost(
      new Request("http://localhost:3000/api/translation/extract-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentenceId: "sentence-1", englishPhrase: "" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns the extracted chunk on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    extractTranslationChunk.mockResolvedValue({
      chunk: "wake up at six",
      meaningVi: "thức dậy lúc 6 giờ",
      usage: "for daily routine",
      example: "I wake up at six on weekdays.",
      suggestedTopic: "Daily Life",
      bandEstimate: 6.5,
    });

    const response = await extractPost(
      new Request("http://localhost:3000/api/translation/extract-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: "sentence-1",
          englishPhrase: "wake up at six",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.extracted.chunk).toBe("wake up at six");
  });
});

describe("translation save-chunk route", () => {
  it("requires auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await savePost(
      new Request("http://localhost:3000/api/translation/save-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: "sentence-1",
          englishPhrase: "wake up",
          meaningVi: "thức dậy",
          example: "I wake up at six.",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(saveTranslationChunk).not.toHaveBeenCalled();
  });

  it("returns the mapping on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    saveTranslationChunk.mockResolvedValue({
      id: "mapping-1",
      sentenceId: "sentence-1",
      englishPhrase: "wake up at six",
      meaningVi: "thức dậy lúc 6 giờ",
      chunkId: "chunk-1",
      suggestedTopic: "Daily Life",
      bandEstimate: 6,
    });

    const response = await savePost(
      new Request("http://localhost:3000/api/translation/save-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: "sentence-1",
          englishPhrase: "wake up at six",
          meaningVi: "thức dậy lúc 6 giờ",
          example: "I wake up at six on weekdays.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mapping.chunkId).toBe("chunk-1");
  });
});

describe("translation review route", () => {
  it("requires auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await reviewPost(
      new Request("http://localhost:3000/api/translation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentenceId: "sentence-1", confidence: "EASY" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(recordTranslationReview).not.toHaveBeenCalled();
  });

  it("rejects an invalid confidence value", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await reviewPost(
      new Request("http://localhost:3000/api/translation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: "sentence-1",
          confidence: "AMAZING",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});

describe("translation admin import route", () => {
  it("requires admin", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const form = new FormData();
    const csvBlob = new Blob(["title,topic,bandLevel,englishText,vietnameseText\n"], {
      type: "text/csv",
    });
    form.append("file", new File([csvBlob], "translation.csv"));

    const response = await importPost(
      new Request("http://localhost:3000/api/admin/translation/import", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(403);
    expect(importTranslationCsv).not.toHaveBeenCalled();
  });

  it("rejects XLSX uploads", async () => {
    requireAdminApiSession.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
    });

    const form = new FormData();
    const blob = new Blob(["dummy"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    form.append("file", new File([blob], "translation.xlsx"));

    const response = await importPost(
      new Request("http://localhost:3000/api/admin/translation/import", {
        method: "POST",
        body: form,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(importTranslationCsv).not.toHaveBeenCalled();
  });
});
