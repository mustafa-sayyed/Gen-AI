import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-embedding-001",
});

const pinecone = new PineconeClient({
  apiKey: process.env.PINECONE_API_KEY!,
});
const pineconeIndex = pinecone.Index("rag-2");

export const namespace = "DSA";

export const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex,
  maxConcurrency: 5,
  namespace,
});

async function indexing() {
  const pdf = "dsa.pdf";
  const loader = new PDFLoader(pdf);
  const docs = await loader.load();
  console.log("PDF loaded...");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allSplits = await splitter.splitDocuments(docs);
  console.log("Chunked the Doc into: ", allSplits.length);

  const result = await vectorStore.addDocuments(allSplits, {
    namespace: namespace,
  });
  console.log("Stored in Vector DB, Indexing created on Document: ", result.length);
}
indexing();
