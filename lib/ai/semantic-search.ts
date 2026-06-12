import { prisma } from "@/lib/db";
import { getAiProvider } from "@/lib/ai/service";
import { hashEmbedding } from "@/lib/ai/providers/fallback";

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / ((Math.sqrt(normA) || 1) * (Math.sqrt(normB) || 1));
}

export async function embedText(input: string) {
  const provider = getAiProvider();
  if (provider.embed) return provider.embed(input);
  return hashEmbedding(input);
}

export async function semanticSearch(input: {
  clinicId: string;
  patientId?: string;
  query: string;
  limit?: number;
}) {
  const queryVector = await embedText(input.query);
  const embeddings = await prisma.embedding.findMany({
    where: {
      clinicId: input.clinicId,
      patientId: input.patientId
    },
    take: 200,
    orderBy: { createdAt: "desc" }
  });

  return embeddings
    .map((embedding) => ({
      id: embedding.id,
      patientId: embedding.patientId,
      noteId: embedding.noteId,
      documentChunkId: embedding.documentChunkId,
      contentPreview: embedding.contentPreview,
      score: cosineSimilarity(queryVector, embedding.vector as number[])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 8);
}
