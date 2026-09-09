import { Prisma, PrismaClient } from "@repo/db";
import type { ModelProvider } from "../providers/types";
import { buildChunks, type EmbeddingChunk } from "./chunks";

export type { EmbeddingChunk } from "./chunks";

export interface SearchHit {
  entityType: string;
  entityId: string;
  content: string;
  similarity: number;
}

/** Renders a provider vector as a numeric pgvector literal. */
function vectorLiteral(vector: number[]): string {
  return `'[${vector.join(",")}]'::vector`;
}

/**
 * Reindexes every company entity into the agent_embeddings table.
 * Stale chunks are removed so the index always reflects current state.
 */
export async function ingestCompanyData(
  prisma: PrismaClient,
  companyId: string,
  provider: ModelProvider,
): Promise<{ indexed: number; deleted: number }> {
  const chunks = await buildChunks(prisma, companyId);

  for (const chunk of chunks) {
    await upsertEmbedding(prisma, companyId, chunk, provider);
  }

  const seen = new Set(chunks.map((c) => `${c.entityType}:${c.entityId}`));
  const existing = await prisma.$queryRaw<
    Array<{ id: string; entityType: string; entityId: string }>
  >(
    Prisma.sql`SELECT id, "entityType", "entityId"
               FROM agent_embeddings WHERE "companyId" = ${companyId}`,
  );
  const staleIds = existing
    .filter((r) => !seen.has(`${r.entityType}:${r.entityId}`))
    .map((r) => r.id);

  let deleted = 0;
  if (staleIds.length) {
    deleted = staleIds.length;
    await prisma.$executeRaw(
      Prisma.sql`DELETE FROM agent_embeddings WHERE id IN (${Prisma.join(staleIds)})`,
    );
  }

  return { indexed: chunks.length, deleted };
}

/** Upserts one chunk using the unique company and entity identity. */
export async function upsertEmbedding(
  prisma: PrismaClient,
  companyId: string,
  chunk: EmbeddingChunk,
  provider: ModelProvider,
): Promise<void> {
  const vector = await provider.embed(chunk.content);
  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO agent_embeddings (id, "companyId", "entityType", "entityId", content, vector, "updatedAt")
               VALUES (gen_random_uuid(), ${companyId}, ${chunk.entityType}, ${chunk.entityId}, ${chunk.content}, ${Prisma.raw(vectorLiteral(vector))}, ${new Date()})
               ON CONFLICT ("companyId", "entityType", "entityId")
               DO UPDATE SET content = EXCLUDED.content, vector = EXCLUDED.vector, "updatedAt" = EXCLUDED."updatedAt"`,
  );
}

/** Clears a company's embedding index, such as when its data is deleted. */
export async function deleteCompanyEmbeddings(
  prisma: PrismaClient,
  companyId: string,
): Promise<number> {
  const result = await prisma.agentEmbedding.deleteMany({
    where: { companyId },
  });
  return result.count;
}

/**
 * Finds the chunks most semantically similar to a query.
 * Results use pgvector cosine distance and remain scoped to the caller's company.
 */
export async function searchEmbeddings(
  prisma: PrismaClient,
  companyId: string,
  query: string,
  provider: ModelProvider,
  topK = 5,
): Promise<SearchHit[]> {
  const vector = await provider.embed(query);
  const rows = await prisma.$queryRaw<
    Array<{
      entityType: string;
      entityId: string;
      content: string;
      similarity: number;
    }>
  >(
    Prisma.sql`SELECT "entityType", "entityId", content,
                     1 - ("vector" <=> ${Prisma.raw(vectorLiteral(vector))}) AS similarity
               FROM agent_embeddings
               WHERE "companyId" = ${companyId}
               ORDER BY "vector" <=> ${Prisma.raw(vectorLiteral(vector))}
               LIMIT ${topK}`,
  );
  return rows.map((r) => ({
    entityType: r.entityType,
    entityId: r.entityId,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}
