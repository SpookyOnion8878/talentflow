import { Prisma } from "@repo/db";
import type { PrismaClient } from "@repo/db";

const SERIALIZABLE_RETRY_LIMIT = 3;

export async function withSerializableTransaction<T>(
  prisma: PrismaClient,
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const isWriteConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!isWriteConflict || attempt === SERIALIZABLE_RETRY_LIMIT) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry limit exhausted");
}
