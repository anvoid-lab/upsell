import { describe, expect, it, vi, afterEach } from "vitest";
import { formatDate, formatListTimestamp, formatRelative, formatTime } from "../../src/lib/format";

describe("formatTime", () => {
  it("renders 24h HH:mm", () => {
    expect(formatTime(new Date("2026-08-14T23:24:00"))).toBe("23:24");
  });

  it("pads single-digit hours and minutes", () => {
    expect(formatTime(new Date("2026-08-14T03:05:00"))).toBe("03:05");
  });
});

describe("formatDate", () => {
  afterEach(() => vi.useRealTimers());

  it("omits the year for a date in the current year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00"));
    expect(formatDate(new Date("2026-01-15T00:00:00"))).toBe("15 Jan");
  });

  it("includes the year for a date in a different year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00"));
    expect(formatDate(new Date("2025-01-15T00:00:00"))).toBe("15 Jan 2025");
  });
});

describe("formatListTimestamp", () => {
  afterEach(() => vi.useRealTimers());

  it("shows the time for a timestamp from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T18:00:00"));
    expect(formatListTimestamp(new Date("2026-08-14T09:15:00"))).toBe("09:15");
  });

  it("shows the date for a timestamp from a previous day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T18:00:00"));
    expect(formatListTimestamp(new Date("2026-08-13T09:15:00"))).toBe("13 Aug");
  });
});

describe("formatRelative", () => {
  afterEach(() => vi.useRealTimers());

  it("renders future instants with a leading 'in'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00Z"));
    expect(formatRelative(new Date("2026-08-14T18:00:00Z"))).toBe("in 6 hours");
  });

  it("renders past instants with a trailing 'ago'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00Z"));
    expect(formatRelative(new Date("2026-08-14T10:00:00Z"))).toBe("2 hours ago");
  });
});
