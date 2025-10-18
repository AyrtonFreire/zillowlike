import { NextRequest } from "next/server";
import { LeadDistributionService } from "@/lib/lead-distribution-service";
import { rejectLeadSchema } from "@/lib/validations/lead";
import { withErrorHandling, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiter";

export const POST = withRateLimit(
  withErrorHandling(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const body = await request.json();
    const { realtorId } = rejectLeadSchema.parse(body);

    logger.info("Rejecting lead", { leadId: id, realtorId });
    const lead = await LeadDistributionService.rejectLead(id, realtorId);
    
    return successResponse(lead, "Lead recusado");
  }),
  "leads"
);
