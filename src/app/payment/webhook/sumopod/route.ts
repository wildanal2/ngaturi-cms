import { processProviderWebhook } from "@/lib/payments/webhook";

export function POST(req: Request) {
  return processProviderWebhook(req, "sumopod");
}
