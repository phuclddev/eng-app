import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const importQuestionsFromCsv = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/question-import", () => ({
  importQuestionsFromCsv,
}));

let POST: typeof import("@/app/api/admin/questions/import/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/admin/questions/import/route"));
});

describe("question import route RBAC", () => {
  beforeEach(() => {
    requireAdminApiSession.mockReset();
    importQuestionsFromCsv.mockReset();
  });

  it("rejects unauthenticated or non-admin access", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const formData = new FormData();
    formData.append("file", new File(["a,b\n1,2"], "questions.csv", { type: "text/csv" }));

    const response = await POST(
      new Request("http://localhost:3000/api/admin/questions/import", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(importQuestionsFromCsv).not.toHaveBeenCalled();
  });

  it("allows admins to import and returns the summary payload", async () => {
    requireAdminApiSession.mockResolvedValue({
      user: {
        id: "admin-1",
      },
    });
    importQuestionsFromCsv.mockResolvedValue({
      totalRows: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      errors: [],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(
        [
          "skill,task_type,topic,sub_topic,difficulty,target_band,prompt,supporting_points,notes\nSPEAKING,PART_1,Work,Routine,1,5.0,Do you work or study?,,",
        ],
        "questions.csv",
        { type: "text/csv" },
      ),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/admin/questions/import", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(importQuestionsFromCsv).toHaveBeenCalledWith({
      actorId: "admin-1",
      csvText:
        "skill,task_type,topic,sub_topic,difficulty,target_band,prompt,supporting_points,notes\nSPEAKING,PART_1,Work,Routine,1,5.0,Do you work or study?,,",
    });
  });
});
