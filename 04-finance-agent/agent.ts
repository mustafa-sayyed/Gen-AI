import "dotenv/config";
import { Groq } from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/src/resources/chat.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const messageHistory: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: `You are a helpful assistant for finance-related questions. your name is Fintify. 
        You have access to a tool called getTotalExpenses which can be used to get the total expenses for using from date and to date.
        Current date and time is: ${new Date().toUTCString()}.
        `,
  },
  {
    role: "user",
    content: "What are my current expenses in this month?",
  },
];

const toolMap: { [key: string]: (...args: any[]) => string } = {
  getTotalExpenses: getTotalExpenses,
};

async function startAgent() {
  const chatCompletion = await groq.chat.completions.create({
    messages: messageHistory,
    model: "openai/gpt-oss-120b",
    temperature: 1,
    max_completion_tokens: 8192,
    top_p: 1,
    tools: [
      {
        type: "function",
        function: {
          name: "getTotalExpenses",
          description: "Get the total expenses for using from date and to date",
          parameters: {
            type: "object",
            properties: {
              from: {
                type: "string",
                description:
                  "The start date for calculating total expenses in ISO format (YYYY-MM-DD)",
              },
              to: {
                type: "string",
                description:
                  "The end date for calculating total expenses in ISO format (YYYY-MM-DD)",
              },
            },
          },
        },
      },
    ],
  });

  messageHistory.push(chatCompletion.choices[0].message);

  const toolCalls = chatCompletion.choices[0]?.message.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    console.log(chatCompletion.choices[0].message);
    console.log(chatCompletion.choices[0].message.content);

    console.log("\n\n Message History: \n\n", JSON.stringify(messageHistory, null, 2));
    return;
  }

  for (const tool of toolCalls) {
    if (tool.function.name === "getTotalExpenses") {
      const args = JSON.parse(tool.function.arguments);
      const result = getTotalExpenses(args);
      messageHistory.push({
        role: "tool",
        tool_call_id: tool.id,
        content: result,
      });
    } else {
      const functionName = tool.function.name;
      const toolFunction = toolMap[functionName];
      if (toolFunction) {
        const args = JSON.parse(tool.function.arguments);
        const result = toolFunction(args);
        messageHistory.push({
          role: "tool",
          tool_call_id: tool.id,
          content: result,
        });
      } else {
        messageHistory.push({
          role: "tool",
          tool_call_id: tool.id,
          content: `Error: Tool function ${functionName} not found.`,
        });
      }
    }
  }

  startAgent();
}

startAgent();

function getTotalExpenses({ from, to }: { from: string; to: string }): string {
  // Mock implementation
  console.log(`Fetching total expenses from ${from} to ${to}...`);

  return `Total expenses from ${from} to ${to} is $1000.`;
}
