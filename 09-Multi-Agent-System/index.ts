import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createCalendarEvent, getAvailableTimeSlots, sendEmail } from "./tools";
import { MemorySaver } from "@langchain/langgraph";
import { CALENDAR_AGENT_PROMPT, EMAIL_AGENT_PROMPT, SUPERVISOR_PROMPT } from "./prompts";
import rl from "readline-sync";
import z from "zod";
import { createAgent, humanInTheLoopMiddleware, tool, type Interrupt } from "langchain";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GOOGLE_API_KEY!,
});

const checkpointer = new MemorySaver();

const calendarAgent = createAgent({
  model: model,
  tools: [createCalendarEvent, getAvailableTimeSlots],
  systemPrompt: CALENDAR_AGENT_PROMPT,
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: { create_calendar_event: true },
      descriptionPrefix: "Calendar event pending approval",
    }),
  ],
});

const emailAgent = createAgent({
  model: model,
  tools: [sendEmail],
  systemPrompt: EMAIL_AGENT_PROMPT,
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: { send_email: true },
      descriptionPrefix: "Email pending approval",
    }),
  ],
});

const scheduleEvent = tool(
  async ({ request }) => {
    const result = await calendarAgent.invoke({
      messages: [{ role: "user", content: request }],
    });
    const lastMessage = result.messages.at(-1);
    return lastMessage?.text || "No response from calendar agent.";
  },
  {
    name: "schedule_event",
    description: `
        Schedule calendar events using natural language.

        Use this when the user wants to create, modify, or check calendar appointments.
        Handles date/time parsing, availability checking, and event creation.

        Input: Natural language scheduling request (e.g., 'meeting with design team next Tuesday at 2pm')
    `.trim(),
    schema: z.object({
      request: z.string().describe("Natural language scheduling request"),
    }),
  },
);

const manageEmail = tool(
  async ({ request }) => {
    const result = await emailAgent.invoke({
      messages: [{ role: "user", content: request }],
    });
    const lastMessage = result.messages.at(-1);
    return lastMessage?.text || "No response from email agent.";
  },
  {
    name: "manage_email",
    description: `
        Send emails using natural language.

        Use this when the user wants to send notifications, reminders, or any email communication.
        Handles recipient extraction, subject generation, and email composition.

        Input: Natural language email request (e.g., 'send them a reminder about the meeting')
    `.trim(),
    schema: z.object({
      request: z.string().describe("Natural language email request"),
    }),
  },
);

const supervisorAgent = createAgent({
  model: model,
  tools: [scheduleEvent, manageEmail],
  systemPrompt: SUPERVISOR_PROMPT,
  checkpointer,
});

while (true) {
  const query = rl.question("Ask Agents: ");

  if (query === "exit") {
    console.log("Exiting...");
    break;
  }

  const stream = await supervisorAgent.stream(
    {
      messages: [{ role: "user", content: query }],
    },
    {
      configurable: { thread_id: "1" },
    },
  );

  for await (const step of stream) {
    for (const update of Object.values(step)) {
      if (update && typeof update === "object" && "messages" in update) {
        for (const message of update.messages) {
          console.log(message.toFormattedString());
        }
      }
      if (typeof update[0] === "object" && "id" in update[0] && "value" in update[0]) {
        console.log("Interrruption: ", update[0]);
      }
    }
  }
}
