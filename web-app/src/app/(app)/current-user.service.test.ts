import { describe, expect, it, vi, beforeEach } from "vitest";

const { getUserMock, maybeSingleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

// current-user.service imports createSupabaseServerClient from @db/client, which
// calls next/headers cookies() — unavailable outside a request. Mocked out so
// the multi-tenancy business-resolution logic can be tested in isolation from
// Supabase's cookie/session plumbing.
vi.mock("@db/client", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
    })),
  })),
}));

const { currentUserService } = await import("./current-user.service");

describe("currentUserService.fetchCurrentUser", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it("returns null when there is no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await currentUserService.fetchCurrentUser();

    expect(result).toBeNull();
    // The RLS-scoped profile lookup should never even run without a session.
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it("resolves the business name from a joined object (single-row join shape)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "auth@example.com" } },
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "user-1",
        email: "profile@example.com",
        business_id: "biz-1",
        businesses: { name: "Shop & Go Luanda" },
      },
    });

    const result = await currentUserService.fetchCurrentUser();

    expect(result).toEqual({
      id: "user-1",
      email: "profile@example.com",
      business_id: "biz-1",
      business_name: "Shop & Go Luanda",
    });
  });

  it("resolves the business name when Supabase returns the join as an array", async () => {
    // supabase-js can shape a to-one foreign-table join as an array depending
    // on how the relationship is inferred; both shapes have to work.
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "auth@example.com" } },
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: "user-1",
        email: "profile@example.com",
        business_id: "biz-1",
        businesses: [{ name: "Shop & Go Luanda" }],
      },
    });

    const result = await currentUserService.fetchCurrentUser();

    expect(result?.business_name).toBe("Shop & Go Luanda");
  });

  it("falls back to the auth user when no profile row exists yet", async () => {
    // Happens mid-signup, in the gap before the handle_new_user trigger's
    // insert becomes visible, or if RLS hides the row for any other reason.
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "auth@example.com" } },
    });
    maybeSingleMock.mockResolvedValue({ data: null });

    const result = await currentUserService.fetchCurrentUser();

    expect(result).toEqual({
      id: "user-1",
      email: "auth@example.com",
      business_id: "",
      business_name: "auth@example.com",
    });
  });
});
