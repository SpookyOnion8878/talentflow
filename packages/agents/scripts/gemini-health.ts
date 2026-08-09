import { GeminiProvider } from "../src/providers/gemini";

/**
 * Sanity check live ke Gemini API (native endpoint, format key baru "AQ.Ab").
 * Jalankan tanpa membagikan key ke pihak lain:
 *   $env:GEMINI_API_KEY="AQ.Ab....."; pnpm --filter @repo/agents exec tsx scripts/gemini-health.ts
 */
async function main(): Promise<void> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    console.error(
      "GEMINI_API_KEY kosong. Set dulu: $env:GEMINI_API_KEY='AQ.Ab...'",
    );
    process.exit(1);
  }

  const provider = new GeminiProvider(key);
  const model = (process.env.MODEL_FAST ?? "gemini-2.5-flash").trim();

  const chat = await provider.chat({
    model,
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
  });
  console.log(
    `CHAT  -> "${chat.content?.trim()}" (${chat.totalTokens} tokens, model=${model})`,
  );

  const emb = await provider.embed(
    "talentflow compliance insurance sanity check",
  );
  console.log(
    `EMBED -> ${emb.length} dims, head [${emb.slice(0, 3).join(", ")}]`,
  );

  console.log(
    "SANITY OK — key Gemini (format AQ.Ab) berfungsi via endpoint native",
  );
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error("SANITY FAIL:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
