import { processProviderWebhook } from "@/lib/payments/webhook";

// Preserve this exact signed notification path for existing DOKU payments.
export function POST(req: Request) {
  return processProviderWebhook(req, "doku");
}
