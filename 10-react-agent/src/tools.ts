import { TavilySearch, TavilyCrawl } from "@langchain/tavily";
import { tool } from "langchain";
import z from "zod";
import { CheerioCrawler, Dataset } from "crawlee";
import consola  from "consola";

const tavilySearch = new TavilySearch({
	tavilyApiKey: process.env.TAVILY_API_KEY!,
	maxResults: 3,
});

const tavilyCrawl = new TavilyCrawl({
	tavilyApiKey: process.env.TAVILY_API_KEY!,
	limit: 1,
	extractDepth: "advanced",
});

const crawler = new CheerioCrawler({
	requestHandler: async ({ $, enqueueLinks, log, request }) => {
		const title = $("title").text();
		log.info(`Title of ${request.loadedUrl} is '${title}'`);

		// Save results as JSON to ./storage/datasets/default
		await Dataset.pushData({ title, url: request.loadedUrl });

		// Enqueue links found on the page
		await enqueueLinks();
	},
	maxRequestsPerCrawl: 5,
});

const webSearch = tool(
	async ({ query }) => {
        consola.info(`Running web search for query: "${query}"`);
		const res = await tavilySearch.invoke({
			query: query,
		});
		consola.info(`Search Results:`, res);
		return res;
	},
	{
		name: "webSearch",
		description: "Use this tool to search the web for recent information.",
		schema: z.object({
			query: z
				.string()
				.describe("The search query to find relevant information."),
		}),
	},
);

const webCrawl = tool(
	async ({ url }) => {
            consola.info(`Running web crawl for URL: "${url}"`);
		const res = await tavilyCrawl.invoke({
			url: url,
		});
		consola.info(`Crawled Pages Using Tavily:`, res);
		return res;
	},
	{
		name: "webCrawl",
		description:
			"Use this tool to crawl a webpage and extract relevant information.",
		schema: z.object({
			url: z.string().describe("The URL of the webpage to crawl."),
		}),
	},
);

const webCrawlWithCheerio = tool(
	async ({ url }) => {
            consola.info(`Running web crawl with Cheerio for URL: "${url}"`);
		const res = await crawler.run([url]);
		consola.info(`Crawled Pages Using Cheerio:`, res);
		const crawledData = await Dataset.getData({});
		consola.info(`Crawled Data Using Cheerio:`, crawledData);
		return crawledData;
	},
	{
		name: "webCrawlWithCheerio",
		description:
			"Use this tool to crawl a webpage using Cheerio and extract relevant information.",
		schema: z.object({
			url: z.string().describe("The URL of the webpage to crawl."),
		}),
	},
);

const reflect = tool(
	({ reflection }: { reflection: string }) => {
        consola.info(`Reflection received: "${reflection}"`);
		return `Reflection received: ${reflection}`;
	},
	{
		name: "reflect",
		description: `Use this to think out loud before writing your final answer. Summarize what you've 
    learned so far, identify any gaps, and decide whether you need more searches or are ready to answer. 
    Call this before giving your final response on complex research questions.`,
		schema: z.object({
			reflection: z
				.string()
				.describe(
					"Your honest assessment: what you know, what you searched, what gaps remain, and whether you're ready to answer.",
				),
		}),
	},
);

export { webSearch, webCrawl, webCrawlWithCheerio, reflect };
