import { AgentRunStatus } from "@repo/db";
import { z } from "zod";

export const agentActivityInputSchema = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(AgentRunStatus).optional(),
});
