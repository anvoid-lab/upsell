import { InboxService } from "../../inbox.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return new InboxService().handleWebhook(request);
}
