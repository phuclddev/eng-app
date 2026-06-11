import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const createTranslationScript = vi.fn();
const updateTranslationScript = vi.fn();
const deleteTranslationScript = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/translation/translation-script-service", () => ({
  createTranslationScript,
  updateTranslationScript,
  deleteTranslationScript,
}));

let createPost: typeof import("@/app/api/translation-recall/scripts/route").POST;
let updatePatch: typeof import("@/app/api/translation-recall/scripts/[id]/route").PATCH;
let deleteFn: typeof import("@/app/api/translation-recall/scripts/[id]/route").DELETE;

beforeAll(async () => {
  ({ POST: createPost } = await import(
    "@/app/api/translation-recall/scripts/route"
  ));
  ({ PATCH: updatePatch, DELETE: deleteFn } = await import(
    "@/app/api/translation-recall/scripts/[id]/route"
  ));
});

beforeEach(() => {
  requireAdminApiSession.mockReset();
  createTranslationScript.mockReset();
  updateTranslationScript.mockReset();
  deleteTranslationScript.mockReset();
});

const validPayload = {
  title: "Daily Routine",
  topic: "Daily Life",
  bandLevel: 6,
  sentences: [
    {
      english: "I usually wake up at six.",
      vietnamese: "Tôi thường thức dậy lúc 6 giờ.",
    },
  ],
};

const adminUser = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

describe("create translation script route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await createPost(
      new Request("http://localhost:3000/api/translation-recall/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(401);
    expect(createTranslationScript).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with 403", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await createPost(
      new Request("http://localhost:3000/api/translation-recall/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects payloads with missing title", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await createPost(
      new Request("http://localhost:3000/api/translation-recall/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, title: "" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(createTranslationScript).not.toHaveBeenCalled();
  });

  it("rejects empty sentence arrays", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await createPost(
      new Request("http://localhost:3000/api/translation-recall/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, sentences: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createTranslationScript).not.toHaveBeenCalled();
  });

  it("returns the created script on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    createTranslationScript.mockResolvedValue({
      id: "script-1",
      title: validPayload.title,
      topic: validPayload.topic,
      bandLevel: 6,
      notes: null,
      updatedAt: "2026-06-11T12:00:00.000Z",
      sentences: [],
      sourceType: "MANUAL",
      sourceQuestionId: null,
      version: 1,
      generatedByAi: false,
      usedChunkIds: [],
      usedChunks: [],
    });

    const response = await createPost(
      new Request("http://localhost:3000/api/translation-recall/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.script.id).toBe("script-1");
  });
});

describe("update + delete translation script routes", () => {
  it("PATCH requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await updatePatch(
      new Request("http://localhost:3000/api/translation-recall/scripts/script-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
      { params: Promise.resolve({ id: "script-1" }) },
    );

    expect(response.status).toBe(403);
    expect(updateTranslationScript).not.toHaveBeenCalled();
  });

  it("PATCH propagates not-found errors", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    updateTranslationScript.mockRejectedValueOnce(
      new NotFoundError("Translation script was not found."),
    );

    const response = await updatePatch(
      new Request("http://localhost:3000/api/translation-recall/scripts/missing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("PATCH returns the updated script", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    updateTranslationScript.mockResolvedValueOnce({
      id: "script-1",
      title: validPayload.title,
      topic: validPayload.topic,
      bandLevel: 6,
      notes: null,
      updatedAt: "2026-06-11T12:00:00.000Z",
      sentences: [],
      sourceType: "MANUAL",
      sourceQuestionId: null,
      version: 1,
      generatedByAi: false,
      usedChunkIds: [],
      usedChunks: [],
    });

    const response = await updatePatch(
      new Request("http://localhost:3000/api/translation-recall/scripts/script-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
      { params: Promise.resolve({ id: "script-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.script.id).toBe("script-1");
  });

  it("DELETE requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await deleteFn(
      new Request("http://localhost:3000/api/translation-recall/scripts/script-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "script-1" }) },
    );

    expect(response.status).toBe(401);
    expect(deleteTranslationScript).not.toHaveBeenCalled();
  });

  it("DELETE returns ok on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    deleteTranslationScript.mockResolvedValueOnce({
      ok: true,
      scriptId: "script-1",
    });

    const response = await deleteFn(
      new Request("http://localhost:3000/api/translation-recall/scripts/script-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "script-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
