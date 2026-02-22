import { MessagesValue, ReducedValue, StateSchema } from "@langchain/langgraph";
import z from "zod";

export const state = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (current, next) => current + next,
  }),
});
