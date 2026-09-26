import { generateWithAI } from './src/services/ai.service';
import * as dotenv from 'dotenv';
dotenv.config();

const prompt = `
  You are an AI Quiz Generator for a student learning:
  Subject: Computer Science
  Topic: OSI Model
  Difficulty: medium

  Generate exactly 2 multiple-choice questions for this topic.
  Return ONLY a valid JSON array of objects, with no markdown formatting.
  Each object must have:
  - "question": The question text.
  - "options": An array of exactly 4 strings containing the possible answers.
  - "correctAnswer": The exact string of the correct answer (must match one of the options).
  - "explanation": A short explanation of why the correct answer is correct.
`;

async function test() {
  try {
    const res = await generateWithAI(prompt, 'gemini-flash-latest');
    console.log("Raw Response:");
    console.log(res);
    const jsonMatch = res.match(/\[[\s\S]*\]/);
    let parsed;
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = JSON.parse(res.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim());
    }
    console.log("Parsed correctly!");
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
