#!/usr/bin/env node
import path from "node:path"
import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";
import cli from "readline-sync";
import ora from "ora";
import cliMd from "cli-markdown";

const __dirname = import.meta.dirname;

config({
  path: path.join(__dirname, "./.env"),
  quiet: true,
})

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const loader = () => {
  const spinner = ora("Generating response...").start();
  spinner.color = "blue";
  return spinner;
}

const history = [];

async function main() {
  const prompt = cli.question("Ask anything to AI: ");



  if (prompt == "exit") {
    return process.exit(1);
  }

  history.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  
  const spinner = loader();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: history,
  });

  spinner.color = "green";
  spinner.succeed((spinner.text = "Generated Response: "));
  spinner.stop();
  spinner.clear();
  console.log("\n AI:" + cliMd(response.text));

  history.push({
    role: "model",
    parts: [{ text: response.text }],
  });
  
  main();
}

await main();
