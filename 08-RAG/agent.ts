import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import rl from "readline-sync";
import { namespace, vectorStore } from "./index";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GOOGLE_API_KEY!,
});

const checkpointer = new MemorySaver();

const retrieve = tool(
  async ({ query }) => {
    const retrievedDocs = await vectorStore.similaritySearch(query, 10, {
      namespace,
    });
    const serialized = retrievedDocs
      .map((doc) => `Source: ${doc.metadata.source} \n Content: ${doc.pageContent}`)
      .join("\n");
    return [serialized, retrievedDocs];
  },
  {
    name: "retrieve",
    description: "Retrieve information related to a query.",
    schema: z.object({ query: z.string() }),
    responseFormat: "content_and_artifact",
  },
);

const agent = createAgent({
  model,
  tools: [retrieve],
  checkpointer,
  systemPrompt:
    "You are a helpful assistant for answering questions about the content of a PDF document. Use the 'retrieve' tool to get relevant information from the document based on the user's query.",
});

async function main() {
  while (true) {
    const query = rl.question("Ask: ");
    if (query === "exit") {
      break;
    }
    const response = await agent.stream(
      {
        messages: [{ role: "human", content: query }],
      },
      {
        streamMode: "values",
        configurable: { thread_id: "1" },
      },
    );

    for await (const step of response) {
      const lastMessage = step.messages.at(-1)!;
      if (lastMessage?.tool_calls) {
        console.log(
          `[${lastMessage.type}]: ${JSON.stringify(lastMessage.content, null, 2)}`,
        );
      } else {
        console.log(`[${lastMessage.type}]: ${lastMessage.content}`);
      }
      console.log("-----\n\n");
    }
  }
}
main();
