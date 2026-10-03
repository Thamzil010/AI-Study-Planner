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
    - "url": Generate a highly likely search URL (e.g., https://www.youtube.com/results?search_query=...). For the PDF Notes link, NEVER invent a direct URL to a PDF file because they often 404. Instead, ALWAYS generate a Google Search URL to search for the PDF, exactly like this: https://www.google.com/search?q=Subject+Topic+filetype:pdf (replace Subject and Topic with the actual subject and topic words separated by '+'). For YOUTUBE and ARTICLE, use search URLs or known reliable sites (like Wikipedia or GeeksforGeeks).
    `;

    try {
      let rawText = await generateWithAI(prompt, 'gemini-flash-lite-latest', true);
      let resources = JSON.parse(rawText);
      
      resources = resources.map((r: any) => {
        const t = r.type?.toUpperCase() || '';
        if (t.includes('PDF')) r.type = 'PDF';
        else if (t.includes('YOUTUBE') || t.includes('VIDEO')) r.type = 'YOUTUBE';
        else if (t.includes('ARTICLE')) r.type = 'ARTICLE';
        return r;
      });

      const hasPDF = resources.some((r: any) => r.type === 'PDF');
      if (!hasPDF) {
        resources.push({
          title: `${subject.topic} Cheatsheet / PDF Notes`, 
          type: 'PDF', 
          url: `https://www.google.com/search?q=${encodeURIComponent(subject.name + ' ' + subject.topic)}+filetype:pdf`
        });
      }

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
