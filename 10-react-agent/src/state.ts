import { StateSchema, MessagesValue } from "@langchain/langgraph";

export const ResearchState = new StateSchema({
	messages: MessagesValue,
});

export type ResearchState = typeof ResearchState;
