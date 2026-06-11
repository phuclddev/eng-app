import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const startFamilyRoleplaySession = vi.fn();
const sendFamilyRoleplayMessage = vi.fn();
const finishFamilyRoleplaySession = vi.fn();
const archiveFamilyRoleplaySession = vi.fn();
const getFamilyRoleplaySessionForUser = vi.fn();
const listFamilyRoleplaySessions = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-roleplay-service", () => ({
  startFamilyRoleplaySession,
  sendFamilyRoleplayMessage,
  finishFamilyRoleplaySession,
  archiveFamilyRoleplaySession,
  getFamilyRoleplaySessionForUser,
  listFamilyRoleplaySessions,
}));

let startPost: typeof import("@/app/api/family/roleplay/start/route").POST;
let messagePost: typeof import("@/app/api/family/roleplay/message/route").POST;
let finishPost: typeof import("@/app/api/family/roleplay/finish/route").POST;
let archivePost: typeof import("@/app/api/family/roleplay/archive/route").POST;
let sessionsGet: typeof import("@/app/api/family/roleplay/sessions/route").GET;
let sessionDetailGet: typeof import("@/app/api/family/roleplay/sessions/[id]/route").GET;

beforeAll(async () => {
  ({ POST: startPost } = await import("@/app/api/family/roleplay/start/route"));
  ({ POST: messagePost } = await import(
    "@/app/api/family/roleplay/message/route"
  ));
  ({ POST: finishPost } = await import(
    "@/app/api/family/roleplay/finish/route"
  ));
  ({ POST: archivePost } = await import(
    "@/app/api/family/roleplay/archive/route"
  ));
  ({ GET: sessionsGet } = await import(
    "@/app/api/family/roleplay/sessions/route"
  ));
  ({ GET: sessionDetailGet } = await import(
    "@/app/api/family/roleplay/sessions/[id]/route"
  ));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  startFamilyRoleplaySession.mockReset();
  sendFamilyRoleplayMessage.mockReset();
  finishFamilyRoleplaySession.mockReset();
  archiveFamilyRoleplaySession.mockReset();
  getFamilyRoleplaySessionForUser.mockReset();
  listFamilyRoleplaySessions.mockReset();
});

const baseUser = { id: "user-1", email: "user-1@example.com" };

describe("family roleplay start route", () => {
  it("requires an approved user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await startPost(
      new Request("http://localhost:3000/api/family/roleplay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: "FATHER",
          aiRole: "KIWI",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(startFamilyRoleplaySession).not.toHaveBeenCalled();
  });

  it("rejects identical user and AI roles", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await startPost(
      new Request("http://localhost:3000/api/family/roleplay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: "FATHER",
          aiRole: "FATHER",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(startFamilyRoleplaySession).not.toHaveBeenCalled();
  });

  it("returns the new session on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    startFamilyRoleplaySession.mockResolvedValue({
      id: "session-1",
      userRole: "FATHER",
      aiRole: "KIWI",
      childFocus: "BOTH",
      targetLevel: "NATURAL",
      turnsLimit: 6,
      turnsTaken: 0,
      title: "Father ↔ Kiwi",
      status: "ACTIVE",
      messages: [],
    });

    const response = await startPost(
      new Request("http://localhost:3000/api/family/roleplay/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRole: "FATHER",
          aiRole: "KIWI",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.id).toBe("session-1");
  });
});

describe("family roleplay message route", () => {
  it("requires an approved user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await messagePost(
      new Request("http://localhost:3000/api/family/roleplay/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1", message: "hi" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(sendFamilyRoleplayMessage).not.toHaveBeenCalled();
  });

  it("propagates ownership errors with the right status", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    sendFamilyRoleplayMessage.mockRejectedValueOnce(
      new ForbiddenError("This family roleplay session does not belong to you."),
    );

    const response = await messagePost(
      new Request("http://localhost:3000/api/family/roleplay/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "session-other",
          message: "hello",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
  });
});

describe("family roleplay finish route", () => {
  it("validates sessionId", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await finishPost(
      new Request("http://localhost:3000/api/family/roleplay/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(finishFamilyRoleplaySession).not.toHaveBeenCalled();
  });
});

describe("family roleplay archive route", () => {
  it("requires auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await archivePost(
      new Request("http://localhost:3000/api/family/roleplay/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(archiveFamilyRoleplaySession).not.toHaveBeenCalled();
  });
});

describe("family roleplay sessions list route", () => {
  it("requires auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await sessionsGet();

    expect(response.status).toBe(401);
    expect(listFamilyRoleplaySessions).not.toHaveBeenCalled();
  });

  it("returns sessions for the current user", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    listFamilyRoleplaySessions.mockResolvedValue([
      { id: "session-1", title: "First" },
    ]);

    const response = await sessionsGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessions[0].id).toBe("session-1");
  });
});

describe("family roleplay sessions detail route", () => {
  it("requires auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await sessionDetailGet(
      new Request("http://localhost:3000/api/family/roleplay/sessions/session-1"),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(401);
    expect(getFamilyRoleplaySessionForUser).not.toHaveBeenCalled();
  });

  it("returns the owned session", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    getFamilyRoleplaySessionForUser.mockResolvedValue({
      id: "session-1",
      messages: [],
    });

    const response = await sessionDetailGet(
      new Request("http://localhost:3000/api/family/roleplay/sessions/session-1"),
      { params: Promise.resolve({ id: "session-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.id).toBe("session-1");
    expect(getFamilyRoleplaySessionForUser).toHaveBeenCalledWith({
      userId: "user-1",
      sessionId: "session-1",
    });
  });

  it("propagates forbidden errors", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    getFamilyRoleplaySessionForUser.mockRejectedValueOnce(
      new ForbiddenError("This family roleplay session does not belong to you."),
    );

    const response = await sessionDetailGet(
      new Request("http://localhost:3000/api/family/roleplay/sessions/session-1"),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(403);
  });
});
