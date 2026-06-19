import { beforeEach, describe, expect, it, vi } from "vitest";

const getEnv = vi.fn();

vi.mock("@/lib/env", () => ({
  getEnv,
}));

let encodePlantumlSource: typeof import("@/server/plantuml").encodePlantumlSource;
let getPlantumlRenderUrl: typeof import("@/server/plantuml").getPlantumlRenderUrl;

beforeEach(async () => {
  getEnv.mockReset();
  ({ encodePlantumlSource, getPlantumlRenderUrl } = await import("@/server/plantuml"));
});

describe("PlantUML helpers", () => {
  it("encodes PlantUML source deterministically", () => {
    const encoded = encodePlantumlSource("@startmindmap\n* Idea\n@endmindmap");
    expect(encoded).toMatch(/^[0-9A-Za-z\-_]+$/);
    expect(encoded.length).toBeGreaterThan(10);
  });

  it("builds a private render URL from configured env", () => {
    getEnv.mockReturnValue({
      PLANTUML_SERVER_URL: "http://localhost:8080",
    });

    const url = getPlantumlRenderUrl("@startmindmap\n* Idea\n@endmindmap");
    expect(url).toMatch(/^http:\/\/localhost:8080\/svg\//);
  });
});
