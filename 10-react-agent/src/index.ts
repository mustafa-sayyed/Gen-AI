import { ChatGroq } from "@langchain/groq";
import { createAgent } from "langchain";
import { ResearchState } from "./state";
import { reflect, webCrawl, webSearch } from "./tools";
import { SYSTEM_PROMPT } from "./prompt";
import consola from "consola";
import { ChatGoogle } from "@langchain/google";

const researchAgent = createAgent({
	model: new ChatGoogle({
		apiKey: process.env.GEMINI_API_KEY!,
		model: "gemini-2.5-flash",
	}),
	stateSchema: ResearchState,
	tools: [webSearch, webCrawl, reflect],
	systemPrompt: SYSTEM_PROMPT,
});

const result = await researchAgent.invoke(
	{
		messages: [
			{
				role: "human",
				content: `What are the latest advancements in renewable energy technologies as of 2026? Please provide specific examples and cite your sources.`,
			},
		],
	},
	{ recursionLimit: 15 },
);

consola.success("Final Answer:", result.messages.at(-1)?.content);
