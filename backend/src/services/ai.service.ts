import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-flash-latest';

export const generateWithAI = async (prompt: string, model: string = MODEL): Promise<string> => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not defined in .env");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text || '';
    } catch (error) {
        console.error("Failed to generate content with Gemini:", error);
        throw error; // Re-throw to be handled by controllers
    }
}

export const generateScheduleWithAI = async (preferences: any, subjects: any[]) => {
  const prompt = `
    You are an intelligent study planner. Create a daily study schedule based on the following user preferences and pending subjects.
    
    User Preferences:
    - Daily Study Hours: ${preferences.dailyStudyHours}
    - Study Window: ${preferences.studyStartTime} to ${preferences.studyEndTime}
    - Has Working Hours: ${preferences.hasWorkingHours}
    - Work Window: ${preferences.workStartTime} to ${preferences.workEndTime}
    
    Pending Subjects:
    ${JSON.stringify(subjects, null, 2)}
    
    Rules:
    1. NEVER schedule study sessions before the Study Window starts or after it ends.
    2. NEVER schedule study sessions during the Work Window (if Has Working Hours is true).
    3. Add a 10-15 minute break after every study session (which should typically be 45-60 mins).
    4. Automatically add "REVISION" sessions periodically.
    5. Prioritize subjects with higher priority (10 is highest).
    6. Return a list of study sessions.
  `;

  try {
    const text = await generateWithAI(prompt);
    
    // strip markdown if any
    let cleanText = text.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("AI Schedule Generation Error:", error);
    throw error;
  }
};
