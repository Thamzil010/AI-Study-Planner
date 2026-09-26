import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.list();
  for await (const model of response) {
    if (model.name && (model.name.includes("flash") || model.name.includes("pro"))) {
       console.log(model.name);
    }
  }
}

listModels().catch(console.error);
