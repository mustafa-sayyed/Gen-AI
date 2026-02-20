import "dotenv/config";
import { Groq } from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/src/resources/chat.js";
import { createInterface } from "node:readline/promises";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface Expense {
  name: string;
  amount: number;
}

// Mock database for expenses
const expenseDB: Expense[] = [];

const rl = createInterface({ input: process.stdin, output: process.stdout });

const messageHistory: ChatCompletionMessageParam[] = [
  {
    role: "system",
    content: `You are a helpful assistant for finance-related questions. your name is Fintify. 
        You can use the following tools to assist users with their finance-related queries:
        1. getTotalExpenses(): which can be used to get the total expenses for using from date and to date.
        2. addExpense(): which can be used to add an expense with name and amount.
        
        Current date and time is: ${new Date().toUTCString()}.

        Instructions:
        - Don't use Markdown formatting in your responses, use simaple plain text.     `,
  },
];

const toolMap: { [key: string]: (...args: any[]) => string } = {
  getTotalExpenses: getTotalExpenses,
  addExpense,
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
      {
        type: "function",
        function: {
          name: "addExpense",
          description: "Add an expense with name and amount",
          parameters: {
            name: {
              type: "string",
              description: "The name of the expense",
            },
            amount: {
              type: "number",
              description: "The amount of the expense",
            },
          },
        },
      },
    ],
  });

  messageHistory.push(chatCompletion.choices[0].message);

  const toolCalls = chatCompletion.choices[0]?.message.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    console.log("Assistant: ", chatCompletion.choices[0]?.message.content);
    return;
  }

  for (const tool of toolCalls) {
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

  startAgent();
}

while (true) {
  console.log("\n");
  const userInput = await rl.question("Ask anythign related to Finance: ");
  console.log();

  if (userInput === "exit") {
    console.log("Exiting...");
    break;
  }

  messageHistory.push({
    role: "user",
    content: userInput,
  });

  await startAgent();
}

rl.close();

function getTotalExpenses({ from, to }: { from: string; to: string }): string {
  // Mock implementation
  const totalExpense = expenseDB.reduce((acc, curr) => acc + curr.amount, 0);

  return `Total expenses from ${from} to ${to} is ${totalExpense} INR.`;
}

function addExpense({ name, amount }: { name: string; amount: number }): string {
  expenseDB.push({ name, amount });

  return `Expense ${name} with amount ${amount} added successfully.`;
}
