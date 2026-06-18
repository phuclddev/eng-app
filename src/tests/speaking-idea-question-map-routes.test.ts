import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const createIdeaQuestionMap = vi.fn();
const updateIdeaQuestionMap = vi.fn();
const deleteIdeaQuestionMap = vi.fn();
const suggestIdeaQuestionMappings = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/speaking-ideas/question-map-service", () => ({
  createIdeaQuestionMap,
  updateIdeaQuestionMap,
  deleteIdeaQuestionMap,
  suggestIdeaQuestionMappings,
}));

let createPost: typeof import("@/app/api/admin/ideas/map-question/route").POST;
let patchMap: typeof import("@/app/api/admin/ideas/question-map/[id]/route").PATCH;
let deleteMap: typeof import("@/app/api/admin/ideas/question-map/[id]/route").DELETE;
let suggestPost: typeof import("@/app/api/admin/ideas/suggest-question-mapping/route").POST;

beforeAll(async () => {
  ({ POST: createPost } = await import("@/app/api/admin/ideas/map-question/route"));
  ({ PATCH: patchMap, DELETE: deleteMap } = await import(
    "@/app/api/admin/ideas/question-map/[id]/route"
  ));
  ({ POST: suggestPost } = await import(
    "@/app/api/admin/ideas/suggest-question-mapping/route"
  ));
});

beforeEach(() => {
  requireAdminApiSession.mockReset();
  createIdeaQuestionMap.mockReset();
  updateIdeaQuestionMap.mockReset();
  deleteIdeaQuestionMap.mockReset();
  suggestIdeaQuestionMappings.mockReset();
});

const adminUser = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

describe("idea-question mapping routes", () => {
  it("requires admin auth for create", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await createPost(
      new Request("http://localhost:3000/api/admin/ideas/map-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: "idea-1",
          questionId: "question-1",
          relevanceScore: 4,
          isPrimary: false,
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createIdeaQuestionMap).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await createPost(
      new Request("http://localhost:3000/api/admin/ideas/map-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: "",
          questionId: "question-1",
          relevanceScore: 10,
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("creates a mapping on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    createIdeaQuestionMap.mockResolvedValue({ id: "map-1" });

    const response = await createPost(
      new Request("http://localhost:3000/api/admin/ideas/map-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: "idea-1",
          questionId: "question-1",
          relevanceScore: 4,
          isPrimary: false,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mapping.id).toBe("map-1");
  });

  it("updates a mapping", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    updateIdeaQuestionMap.mockResolvedValue({ id: "map-1", isPrimary: true });

    const response = await patchMap(
      new Request("http://localhost:3000/api/admin/ideas/question-map/map-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      }),
      { params: Promise.resolve({ id: "map-1" }) },
    );

    expect(response.status).toBe(200);
  });

  it("deletes a mapping", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    deleteIdeaQuestionMap.mockResolvedValue(undefined);

    const response = await deleteMap(
      new Request("http://localhost:3000/api/admin/ideas/question-map/map-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "map-1" }) },
    );

    expect(response.status).toBe(200);
  });

  it("returns validation error for invalid suggestion payloads", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await suggestPost(
      new Request("http://localhost:3000/api/admin/ideas/suggest-question-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "QUESTION_TO_IDEAS" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("requires admin auth for suggestions", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await suggestPost(
      new Request("http://localhost:3000/api/admin/ideas/suggest-question-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "IDEA_TO_QUESTIONS",
          ideaId: "idea-1",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("returns suggestions on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    suggestIdeaQuestionMappings.mockResolvedValue([
      {
        targetId: "idea-1",
        relevanceScore: 5,
        isPrimary: true,
        aiReason: "Strong fit",
      },
    ]);

    const response = await suggestPost(
      new Request("http://localhost:3000/api/admin/ideas/suggest-question-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "QUESTION_TO_IDEAS",
          questionId: "question-1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(1);
  });

  it("passes through not-found errors on patch", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    updateIdeaQuestionMap.mockRejectedValue(new NotFoundError("missing"));

    const response = await patchMap(
      new Request("http://localhost:3000/api/admin/ideas/question-map/map-x", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relevanceScore: 4 }),
      }),
      { params: Promise.resolve({ id: "map-x" }) },
    );

    expect(response.status).toBe(404);
  });
});
