import { generateWithAI } from '../services/ai.service';
import { Request, Response } from 'express';
import prisma from '../config/db';
export const getResourcesForTopic = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const userId = (req as any).user.id;
    
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId as string, userId: userId as string }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (!subject.topic) {
      return res.status(400).json({ error: 'Subject does not have a specific topic to generate resources for.' });
    }

    const prompt = `
    You are an AI Study Assistant. A student is studying the following:
    Subject: ${subject.name}
    Topic: ${subject.topic}
    Difficulty: ${subject.difficulty}

    Please recommend exactly:
    - 3 YouTube videos
    - 2 Articles
    - 1 PDF Notes link

    Return ONLY a valid JSON array of objects.
    Each object must have:
    - "title": A descriptive title of the resource.
    - "type": "YOUTUBE", "ARTICLE", or "PDF"
    - "url": Generate a highly likely search URL (e.g., https://www.youtube.com/results?search_query=...) or a direct URL if you know a canonical free resource (like a specific GeeksforGeeks or Wikipedia page). 
    `;

    try {
      let rawText = await generateWithAI(prompt);
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const resources = JSON.parse(rawText);
      res.json(resources);
    } catch (error) {
      console.warn('AI Resource Generation Failed, using fallback:', error);
      
      const topicQuery = encodeURIComponent(`${subject.name} ${subject.topic}`);
      const fallbackResources = [
        { title: `${subject.topic} - Full Tutorial`, type: 'YOUTUBE', url: `https://www.youtube.com/results?search_query=${topicQuery}` },
        { title: `${subject.topic} - In 5 Minutes`, type: 'YOUTUBE', url: `https://www.youtube.com/results?search_query=${topicQuery}+in+5+minutes` },
        { title: `${subject.topic} - Practice Questions`, type: 'YOUTUBE', url: `https://www.youtube.com/results?search_query=${topicQuery}+questions+and+answers` },
        { title: `Read about ${subject.topic} on GeeksforGeeks`, type: 'ARTICLE', url: `https://www.geeksforgeeks.org/search/?q=${topicQuery}` },
        { title: `Read about ${subject.topic} on W3Schools/MDN`, type: 'ARTICLE', url: `https://www.google.com/search?q=${topicQuery}+tutorial+w3schools+OR+mdn` },
        { title: `${subject.topic} Cheatsheet / PDF Notes`, type: 'PDF', url: `https://www.google.com/search?q=${topicQuery}+filetype:pdf` }
      ];
      
      res.json(fallbackResources);
    }
  } catch (error) {
    console.error('Resource Generation Controller Error:', error);
    res.status(500).json({ error: 'Failed to generate resources.' });
  }
};
