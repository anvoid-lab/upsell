import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }));

vi.mock("./drain-suggestions.service", () => ({
  drainSuggestionsService: { run: runMock },
}));

const SECRET = "segredo-de-teste";

function request(secretHeader: string | null): Request {
  const headers: Record<string, string> = {};
  if (secretHeader !== null) {
    headers["x-internal-secret"] = secretHeader;
  }
  return new Request("http://localhost:3000/api/jobs/drain-suggestions", {
    method: "POST",
    headers,
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("./route");
}

describe("POST /api/jobs/drain-suggestions", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_JOBS_SECRET", SECRET);
    runMock.mockReset();
    runMock.mockResolvedValue({ processed: 0, generated: 0, skipped: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs the drain and returns its result when the secret matches", async () => {
    runMock.mockResolvedValue({ processed: 2, generated: 1, skipped: 1 });
    const { POST } = await loadRoute();

    const response = await POST(request(SECRET) as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 2, generated: 1, skipped: 1 });
  });

  it("rejects a wrong secret", async () => {
    const { POST } = await loadRoute();

    const response = await POST(request("segredo-errado-completamente") as never);

    expect(response.status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("rejects a missing secret header", async () => {
    const { POST } = await loadRoute();

    const response = await POST(request(null) as never);

    expect(response.status).toBe(401);
    expect(runMock).not.toHaveBeenCalled();
  });

  it("refuses to run when INTERNAL_JOBS_SECRET is not configured", async () => {
    vi.stubEnv("INTERNAL_JOBS_SECRET", "");
    const { POST } = await loadRoute();

    const response = await POST(request(SECRET) as never);

    expect(response.status).toBe(503);
    expect(runMock).not.toHaveBeenCalled();
  });
});
