import { type Content, GoogleGenAI } from "@google/genai";
import "dotenv/config";
import cli from "readline-sync";

const ai = new GoogleGenAI({
  apiKey: process.env.OPEN_API_KEY,
});

// const SYSTEM_PROMPT = `
// You are an AI Assistant with Only START, PLAN, ACTION, OBSERVATION, and OUTPUT State.

// first Wait for user prompt, then Plan the based on the user queries and available tools.

// After planing, take Action with the appropriate Tools, and Wait for the observation based on the action.

// Once you get the Observation, return the AI response based on User prompt and Observations.

// Strictly Follow JSON output format as in Example.

// # Important Instruction
// -- Strictly Follow this format and sequence.
// -- You will be in only ONE State at a time.
// -- Don't create other State than this given below.

// Example:
// START
// {"type": "user", "user": "what is the weather of Solapur"}

// // For Plan
// {"type": "plan", "plan": "I have to get the weather details of Solapur"}

// // For Action
// {"type": "action", "function": "getWeatherDetails", "input": "solapur"}

// // For Observation
// {"type": "observation", "observation": "25°C"}
// -- this result ( observation ) will be giiven by the developer, not by you

// // For Output
// {"type": "output", "output": "The Weather of Solapur is 25°C"}
// -- Return the AI response in the this format

// Available Tools:
// 1. function getWeatherDetails(city: string)
//     - getWeatherDetials is function which takes city as input of type string and return weather details

// Strictly follow the rules.
// Rules:
// 1. Strictly Give the output in JSON format, don't use Markdown format or any other format, only JSON format.

// 2. You will be in only One State at a time, you can't be in two or more State.

// 3. Strictly Don't create any other State like thoughts or any other, Strict follow the State and the Proper Sequence (Plan, Action, Observation, Output).

// `;

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

Allowed assistant message types (ONLY these):
1) PLAN:   {"type":"plan","plan":"..."}
2) ACTION: {"type":"action","function":"getWeatherDetails","input":"<city>"}
3) OUTPUT: {"type":"output","output":"..."}

State sequencing:
- After a user message -> respond with PLAN.
- After PLAN -> respond with ACTION (if tool needed) OR OUTPUT (if tool not needed).
- After an observation message -> respond with OUTPUT.

Available tool:
- getWeatherDetails(city: string) -> returns weather text

If you ever output anything invalid, self-correct immediately by replying again with ONE valid JSON object only.
`;

function getWeatherDetails(city: string) {
  if (city.toLowerCase() === "solapur") return "25°C";
  if (city.toLowerCase() === "mumbai") return "27°C";
  if (city.toLowerCase() === "pune") return "23°C";
  if (city.toLowerCase() === "delhi") return "19°C";
  if (city.toLowerCase() === "bengaluru") return "17°C";

  return "27°C";
}

const toolMap = {
  getWeatherDetails: getWeatherDetails,
};

async function main() {
  const question = cli.question("Ask about weather of any City -> ");

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

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: chatHistory,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    console.log(response.text);

    const result = JSON.parse(response.text);
    console.log("Result: ", result);

    if (result.type === "action") {
      const key: string = result.function;
      const actionResult = toolMap[key](result.input);

      chatHistory.push({
        role: "model",
        parts: [{ text: response.text }],
      });

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
    } else if (result.type === "output") {
      chatHistory.push({
        role: "model",
        parts: [{ text: response.text }],
      });

      console.log(`AI Response: \n ${response.text}`);
      break;
    }
  }
}

main();
