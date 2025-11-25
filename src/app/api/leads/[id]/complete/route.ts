import { NextRequest } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";
import { completeLeadSchema } from "@/lib/validations/lead";
import { withErrorHandling, successResponse } from "@/lib/api-response";
import { withRateLimit } from "@/lib/rate-limiter";

export const POST = withRateLimit(
  withErrorHandling(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    const { realtorId } = completeLeadSchema.parse(body);

    const lead = await LeadDistributionService.completeLead(id, realtorId);
    return successResponse(lead, "Atendimento concludo com sucesso!");
  }),
  "leads"
);
