import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const getPlantumlRenderUrl = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/plantuml", () => ({
  getPlantumlRenderUrl,
}));

global.fetch = fetchMock as typeof fetch;

let renderPost: typeof import("@/app/api/admin/ideas/plantuml/render/route").POST;

beforeAll(async () => {
  ({ POST: renderPost } = await import("@/app/api/admin/ideas/plantuml/render/route"));
});

beforeEach(() => {
  requireAdminApiSession.mockReset();
  getPlantumlRenderUrl.mockReset();
  fetchMock.mockReset();
});

describe("admin PlantUML render route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await renderPost(
      new Request("http://localhost:3000/api/admin/ideas/plantuml/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: "@startmindmap\n* Idea\n@endmindmap" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects non-admin users", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await renderPost(
      new Request("http://localhost:3000/api/admin/ideas/plantuml/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: "@startmindmap\n* Idea\n@endmindmap" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid payload", async () => {
    requireAdminApiSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });

    const response = await renderPost(
      new Request("http://localhost:3000/api/admin/ideas/plantuml/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: "bad" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("returns rendered svg on success", async () => {
    requireAdminApiSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    getPlantumlRenderUrl.mockReturnValue("http://plantuml.local/svg/encoded");
    fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue("<svg><text>Idea</text></svg>"),
    });

    const response = await renderPost(
      new Request("http://localhost:3000/api/admin/ideas/plantuml/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: "@startmindmap\n* Idea\n@endmindmap",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://plantuml.local/svg/encoded", {
      method: "GET",
      headers: {
        Accept: "image/svg+xml,text/plain;q=0.9,*/*;q=0.1",
      },
      cache: "no-store",
    });
    expect(body.svg).toContain("<svg>");
  });
});
