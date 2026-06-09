import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const getToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

let middleware: typeof import("../../middleware").middleware;

beforeAll(async () => {
  ({ middleware } = await import("../../middleware"));
});

describe("middleware RBAC", () => {
  beforeEach(() => {
    getToken.mockReset();
  });

  it("redirects unauthenticated protected requests into auto sign-in", async () => {
    getToken.mockResolvedValue(null);

    const dashboardResponse = await middleware(
      new NextRequest("http://localhost:3000/dashboard"),
    );

    expect(dashboardResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fdashboard&auto=true",
    );

    const questionsResponse = await middleware(
      new NextRequest("http://localhost:3000/questions"),
    );

    expect(questionsResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fquestions&auto=true",
    );

    const aiTutorResponse = await middleware(
      new NextRequest("http://localhost:3000/ai-tutor"),
    );

    expect(aiTutorResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fai-tutor&auto=true",
    );

    const simulatorResponse = await middleware(
      new NextRequest("http://localhost:3000/speaking-simulator"),
    );

    expect(simulatorResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fspeaking-simulator&auto=true",
    );

    const studyCoachResponse = await middleware(
      new NextRequest("http://localhost:3000/study-coach"),
    );

    expect(studyCoachResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Fstudy-coach&auto=true",
    );

    const familyHomeResponse = await middleware(
      new NextRequest("http://localhost:3000/family"),
    );

    expect(familyHomeResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Ffamily&auto=true",
    );

    const familyProfileResponse = await middleware(
      new NextRequest("http://localhost:3000/family/profile"),
    );

    expect(familyProfileResponse.headers.get("location")).toBe(
      "http://localhost:3000/signin?callbackUrl=%2Ffamily%2Fprofile&auto=true",
    );
  });

  it("routes pending and blocked users to the approval gate", async () => {
    getToken.mockResolvedValueOnce({
      role: "USER",
      status: "PENDING",
    });
    const pendingResponse = await middleware(
      new NextRequest("http://localhost:3000/review"),
    );

    expect(pendingResponse.headers.get("location")).toBe(
      "http://localhost:3000/auth/pending?status=PENDING",
    );

    getToken.mockResolvedValueOnce({
      role: "USER",
      status: "BLOCKED",
    });
    const blockedResponse = await middleware(
      new NextRequest("http://localhost:3000/review"),
    );

    expect(blockedResponse.headers.get("location")).toBe(
      "http://localhost:3000/auth/pending?status=BLOCKED",
    );
  });

  it("keeps approved non-admin users out of admin routes", async () => {
    getToken.mockResolvedValue({
      role: "USER",
      status: "APPROVED",
    });

    const response = await middleware(
      new NextRequest("http://localhost:3000/admin"),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard",
    );
  });

  it("allows approved admins through protected admin routes", async () => {
    getToken.mockResolvedValue({
      role: "ADMIN",
      status: "APPROVED",
    });

    const response = await middleware(
      new NextRequest("http://localhost:3000/admin"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows approved users through family routes", async () => {
    getToken.mockResolvedValue({
      role: "USER",
      status: "APPROVED",
    });

    const response = await middleware(
      new NextRequest("http://localhost:3000/family/profile"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
