import { execSync } from "node:child_process";
import z from "zod";
import { ChatGroq } from "@langchain/groq";
import { createAgent, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import cli from "readline-sync";
import { ChatGoogle } from "@langchain/google";
import { platform } from "node:os";

const groqModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY!,
  model: "llama-3.3-70b-versatile",
});
const geminiModel = new ChatGoogle({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: "gemini-3-flash-preview",
});

const checkpointer = new MemorySaver();

const runCommand = tool(
  ({ command }) => {
    try {
      return execSync(command, { encoding: "utf-8" });
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  },
  {
    name: "run_command",
    description:
      "Run single shell/termial commands. Use this to create, edit, delete files adn folders, use it write code.",
    schema: z.object({
      command: z.string().describe("The command to run in terminal"),
    }),
  },
);

const agent = createAgent({
  model: geminiModel,
  tools: [runCommand],
  checkpointer,
  systemPrompt: ` You are an expert coding agent. Your task is generate code. you have to use run_commands tool to create files, write code in them and run them to check if they are working.

  Current user OS is ${platform()}. Use appropriate commands for this OS.
    `,
});


async function main() {
  while (true) {
    const question = cli.question("Ask Agent: ");
    if (!question) {
      console.log("No question provided.");
      continue;
    }

    const response = await agent.invoke(
      { messages: [{ role: "human", content: question }] },
      { configurable: { thread_id: "1" }, recursionLimit: 100 },
    );

    const state = await agent.getState({ configurable: { thread_id: "1" } });
    console.log("State:", state);

    const answer = response.messages.at(-1)?.content;
    response.messages.forEach((message) => {
      for (const message of response.messages) {
        if (message.type === "tool") {
          console.log("Tool call detected:");
          console.log(message.tool_calls);
          console.log("Uak: " + message.additional_kwargs.tool_calls);

          const toolName = message.tool_calls?.[0]?.name;
          const command = message.tool_calls?.[0]?.args.command;
          //   console.log(`Tool name: ${toolName}, Command: ${command}`);
        }
      }
    });

    console.log("AI: " + answer + "\n\n");
  }
}

main();
