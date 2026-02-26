import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";


// Using LangChain's GoogleGenerativeAIEmbeddings to get embeddings
const model = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-embedding-001",
});

const result = await model.embedQuery("What is RAG?");
console.log("LangChain embedding length:", result.length);


// Directly using the Google GenAI SDK to get embeddings
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

const response = await ai.models.embedContent({
  model: "gemini-embedding-001",
  contents: "What is RAG?",
  config: {
    outputDimensionality: 768,
  },
});

console.log(response.embeddings);
console.log(response.embeddings[0]?.values?.length);
