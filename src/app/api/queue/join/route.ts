import { NextRequest } from "next/server";
import { QueueService } from "@/lib/queue-service";
import { joinQueueSchema } from "@/lib/validations/queue";
import { withErrorHandling, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiter";

export const POST = withRateLimit(
  withErrorHandling(async (request: NextRequest) => {
    const body = await request.json();
    const { realtorId } = joinQueueSchema.parse(body);

    logger.info("Realtor joining queue", { realtorId });
    const queue = await QueueService.joinQueue(realtorId);

    logger.info("Realtor joined queue successfully", { realtorId, position: queue.position });
    return successResponse(queue, "Você entrou na fila!", 201);
  }),
  "default"
);
