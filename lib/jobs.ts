import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/semantic-search";

export async function processDocumentJob(input: {
  clinicId: string;
  patientId: string;
  documentId: string;
  extractedText: string;
}) {
  await prisma.document.update({
    where: { id: input.documentId },
    data: { status: "PROCESSING" }
  });

  const chunks = input.extractedText.match(/[\s\S]{1,1200}/g) ?? [input.extractedText];
  for (const [index, chunk] of chunks.entries()) {
    const documentChunk = await prisma.documentChunk.create({
      data: {
        documentId: input.documentId,
        chunkIndex: index,
        content: chunk,
        metadata: { processor: "inline-worker" }
      }
    });
    const vector = await embedText(chunk);
    await prisma.embedding.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        documentChunkId: documentChunk.id,
        model: "configured-provider-or-local-hash",
        vector,
        contentPreview: chunk.slice(0, 240)
      }
    });
  }

  await prisma.document.update({
    where: { id: input.documentId },
    data: { status: "PROCESSED" }
  });
}
