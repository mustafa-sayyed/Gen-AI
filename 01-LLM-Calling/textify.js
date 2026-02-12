#!/usr/bin/env node

import path from "node:path";
import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import ora from "ora";
import cli from "readline-sync";

config({
  path: path.join(import.meta.dirname, "./.env"),
  quiet: true,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const history = [];
async function main() {
  const question = cli.question("\nAsk Textify -> ");

  if (question == "exit") {
    return process.exit(1);
  }

  const loader = ora("Generating response... \n").start();
  loader.color = "blue";

  history.push({
    role: "user",
    parts: [{ text: question }],
  });

  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: history,
    config: {
      systemInstruction: [
        `
        You are a CLI-based chatbot named Textify.
        Help user based on his queries.

        Rules for your responses:
        1. NEVER use Markdown or Markdown-like formatting.
        2. Strictly Use ONLY plain text, Symbols, List and ASCII codes.
        3. Keep responses concise and suitable for terminal display.
        4. Do not include explanations about ANSI or Markdown in responses — just output the formatted text.
        `,
      ],
    },
  });
  loader.succeed("Generated response: \n");

  console.log("AI: ");
  let aiResponse = "";
  for await (const chunk of response) {
    process.stdout.write(chunk.text);
    aiResponse += chunk.text;
  }

  history.push({
    role: "model",
    parts: [{ text: aiResponse }],
  });

  process.on("SIGINT", () => {
    process.exit(1);
  });

  main();
}

main();
