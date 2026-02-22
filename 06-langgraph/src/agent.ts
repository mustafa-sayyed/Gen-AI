import { ChatGroq } from "@langchain/groq";
import {
  ConditionalEdgeRouter,
  END,
  GraphNode,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { state } from "./state";
import { toolsByName } from "./tools";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "langchain";
import rl from "readline-sync";

const model = new ChatGroq({
  model: "openai/gpt-oss-20b",
  apiKey: process.env.GROQ_API_KEY!,
});

const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);

const lllmCall: GraphNode<typeof state> = async (state) => {
  const response = await modelWithTools.invoke([
    new SystemMessage(
      `You are a helpful assistant named Caculish that can perform basic arithmetic operations using the provided tools. 

      Rules: 
      - Always use the tools for calculations, never do them in your head.
      - Give answer in plain text format, don't use markdown format.
      - If the question is not clear, ask for clarification instead of making assumptions.
      `,
    ),
    ...state.messages,
  ]);

  return {
    messages: [response],
    llmCalls: 1,
  };
};

const toolNode: GraphNode<typeof state> = async (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    if (!tool) continue;

    try {
      const observation = await tool.invoke(toolCall);
      result.push(observation);
    } catch (error) {
      result.push(
        new ToolMessage({
          tool_call_id: toolCall.id ?? "unknown tool call id",
          content: `Error: ${(error as Error).message}`,
        }),
      );
    }
  }

  return { messages: result };
};

const shouldContinue: ConditionalEdgeRouter<typeof state> = (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  return END;
};

const agent = new StateGraph(state)
  .addNode("llmCall", lllmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

while (true) {
  const question = rl.prompt({ min: 1, prompt: "Ask -> " });

  if (!question) {
    console.log("Please enter a question.");
    continue;
  }
  if (question === "exit") break;

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  const answer = result.messages.at(-1)?.content;
  console.log("AI: ", answer + "\n");

  // Details about the agent's process, including tool calls and their results
  //   for (const message of result.messages) {
  //     console.log(`${message.type}: ${message.content}`);

  //     if (message.type === "ai" && message?.tool_calls.length) {
  //       console.log("Tool calls in AI message:", message.tool_calls);
  //     }

  //     if (message.type === "tool") {
  //       console.log("Tool call Name:", message.name);
  //       console.log("Tool call Result:", JSON.stringify(message.lc_kwargs, null, 2));
  //     }
  //   }
}
