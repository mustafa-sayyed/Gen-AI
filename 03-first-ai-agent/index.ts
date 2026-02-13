import { type Content, GoogleGenAI } from "@google/genai";
import "dotenv/config";
import cli from "readline-sync";
import ora from "ora";

const ai = new GoogleGenAI({
  apiKey: process.env.OPEN_API_KEY,
});

// You are an AI Assistant with Only START, PLAN, ACTION, OBSERVATION, and OUTPUT State.
// first Wait for user prompt, then Plan the based on the user queries and available tools.
// After planing, take Action with the appropriate Tools, and Wait for the observation based on the action.
// Once you get the Observation, return the AI response based on User prompt and Observations.

// Available Tools:
// 1. function getWeatherDetails(city: string)
//     - getWeatherDetials is function which takes city as input of type string and return weather details

const SYSTEM_PROMPT = `
    You are a strict JSON-only finite-state agent.
    
    OUTPUT RULES (MANDATORY):
    - Every assistant reply MUST be exactly ONE valid JSON object.
    - Do NOT wrap in Markdown/code fences.
    - Do NOT output any text before or after the JSON.
    - Do NOT output multiple JSON objects.
    - Do NOT invent any other state/type (forbidden: "thought", "analysis", "start", "observation", "user").
    
    You will receive messages in these formats:
    - User: {"type":"user","user":"..."}
    - Developer tool result: {"type":"observation","observation":"..."}

Allowed message types (ONLY these):
1) PLAN:   {"type":"plan","plan":"..."}
2) ACTION: {"type":"action","function":"getWeatherDetails","input":"<city>"}
3) OUTPUT: {"type":"output","output":"..."}

State sequencing:
- After a user message -> respond with PLAN.
- After PLAN -> respond with ACTION (if tool needed) OR OUTPUT (if tool not needed).
- After an observation message -> respond with OUTPUT.

If you ever output anything invalid, self-correct immediately by replying again with ONE valid JSON object only.
`;

async function getWeatherDetails(city: string) {
  const response = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`,
  );

  const result = await response.json();

  return result;
}

const toolMap = {
  getWeatherDetails: getWeatherDetails,
};

async function main() {
  const question = cli.question("Ask about weather of any City -> ");

  if (question === "exit") {
    process.exit(0);
  }

  const chatHistory: Content[] = [
    {
      role: "user",
      parts: [
        {
          text: JSON.stringify({
            type: "user",
            user: question,
          }),
        },
      ],
    },
  ];

  const loader = ora("AI is Processing your input...").start();
  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: chatHistory,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      console.log(response.text);
      const result = JSON.parse(response.text);

      if (result.type === "action") {
        const key: string = result.function;
        const tool = toolMap[key];
        const actionResult = await tool(result.input);

        chatHistory.push({
          role: "model",
          parts: [{ text: response.text }],
        });

        loader.text = `Fetching weather details of ${result.input}...`;
        loader.color = "magenta";

        chatHistory.push({
          role: "user",
          parts: [
            { text: JSON.stringify({ type: "observation", observation: actionResult }) },
          ],
        });
      } else if (result.type === "plan") {
        chatHistory.push({
          role: "model",
          parts: [{ text: response.text }],
        });
        loader.text = result.plan;
        loader.color = "yellow";
      } else if (result.type === "output") {
        chatHistory.push({
          role: "model",
          parts: [{ text: response.text }],
        });

        loader.succeed("Weather details fetched.");

        console.log(`AI Response: \n ${result.output}`);
        break;
      }
    } catch (error) {
      loader.fail("Failed to get the Weather Details.");
      console.error(error)
      break;
    }
  }
  main();
}

main();
