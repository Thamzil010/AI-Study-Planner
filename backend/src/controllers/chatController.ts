import { Request, Response } from 'express';
import { generateWithAI } from '../services/ai.service';

export const askAssistant = async (req: Request, res: Response) => {
  try {
    const { prompt, context } = req.body;
    
    const fullPrompt = `
    You are an expert AI Study Assistant.
    The student asked: "${prompt}"
    
    Context (if any): ${context || 'None'}
    
    CRITICAL RULE: You must ONLY answer questions related to studying, education, learning, homework, academics, and productivity. 
    If the question is completely unrelated to these topics (e.g. asking about unrelated personal advice, general chit-chat, programming unrelated to study tools unless they are learning programming, weather, etc.), politely decline to answer and remind them that you are an AI Study Assistant.
    
    Provide a clear, concise, and helpful response. If they ask to generate notes or flashcards, format them nicely using Markdown. If they ask to explain a concept, explain it simply.
    `;

    const reply = await generateWithAI(fullPrompt) || "I couldn't process that right now. Please try again.";

    res.json({ response: reply });
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('Quota')) {
      return res.json({ response: "I'm currently receiving too many requests and my free-tier quota has been exceeded. Please wait a minute and try again!" });
    }
    res.status(500).json({ error: 'Failed to get a response from AI Assistant' });
  }
};
