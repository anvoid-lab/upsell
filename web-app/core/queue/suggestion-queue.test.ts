import { describe, expect, it, vi } from "vitest";
import { enqueueSuggestionJob, drainDueSuggestionJobs } from "./suggestion-queue";

function client(rpc: ReturnType<typeof vi.fn>) {
  return async () => ({ rpc }) as never;
}

describe("enqueueSuggestionJob", () => {
  it("calls the enqueue RPC with the conversation and business ids", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await enqueueSuggestionJob(client(rpc), "biz-1", "42");

    expect(rpc).toHaveBeenCalledWith("enqueue_suggestion_job", {
      p_conversation_id: "42",
      p_business_id: "biz-1",
    });
  });

  it("wraps an RPC error in AppException", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("boom") });

    await expect(enqueueSuggestionJob(client(rpc), "biz-1", "42")).rejects.toMatchObject({
      name: "AppException",
    });
  });
});

describe("drainDueSuggestionJobs", () => {
  it("maps returned messages to conversationId/businessId, coercing the id to string", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        { conversation_id: 42, business_id: "biz-1" },
        { conversation_id: "43", business_id: "biz-2" },
      ],
      error: null,
    });

    const jobs = await drainDueSuggestionJobs(client(rpc));

    expect(jobs).toEqual([
      { conversationId: "42", businessId: "biz-1" },
      { conversationId: "43", businessId: "biz-2" },
    ]);
    expect(rpc).toHaveBeenCalledWith("drain_due_suggestion_jobs", { p_max: 20 });
  });

  it("returns an empty array when there is nothing due", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    const jobs = await drainDueSuggestionJobs(client(rpc));

    expect(jobs).toEqual([]);
  });

  it("wraps an RPC error in AppException", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("boom") });

    await expect(drainDueSuggestionJobs(client(rpc))).rejects.toMatchObject({
      name: "AppException",
    });
  });
});
