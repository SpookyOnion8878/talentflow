import type { PrismaClient, AgentConfig } from "@repo/db";
import type { AgentType } from "./types";

export async function fetchAgentConfig(
  prisma: PrismaClient,
  companyId: string,
  agentType: AgentType,
): Promise<AgentConfig | null> {
  return prisma.agentConfig.findUnique({
    where: { companyId_agentType: { companyId, agentType } },
  });
}
