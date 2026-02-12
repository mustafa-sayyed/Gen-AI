#!/usr/bin/env node

import "dotenv/config";

import { GoogleGenAI } from "@google/genai";

console.log("Ohhh, It is working....");


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function chatWithLLM() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain Stashing and Staging in Git.",
  });

  console.log(response.text);
}

chatWithLLM();
