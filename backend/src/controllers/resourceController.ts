import { generateWithAI } from '../services/ai.service';
import { Request, Response } from 'express';
import prisma from '../config/db';

function formatYoutubeDuration(duration: string) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);
  
  let result = '';
  if (hours > 0) result += hours + ':';
  result += (hours > 0 ? minutes.toString().padStart(2, '0') : minutes) + ':';
  result += seconds.toString().padStart(2, '0');
  return result;
}

const getYoutubeVideos = async (query: string) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const cached = await prisma.youtubeCache.findUnique({ where: { topic: query } });
    if (cached) return JSON.parse(cached.data);
  } catch (e) {
    console.error("Cache read error", e);
  }

  try {
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${apiKey}`);
    const searchData = await searchRes.json();
    if (!searchData.items || searchData.items.length === 0) return null;

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`);
    const videoData = await videoRes.json();

    const formattedVideos = videoData.items.map((item: any) => ({
      title: item.snippet.title,
      type: 'YOUTUBE_RICH',
      url: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelName: item.snippet.channelTitle,
      viewCount: item.statistics.viewCount,
      duration: formatYoutubeDuration(item.contentDetails.duration)
    }));

    try {
      await prisma.youtubeCache.create({
        data: { topic: query, data: JSON.stringify(formattedVideos) }
      });
    } catch (e) {
      console.error("Cache write error", e);
    }

    return formattedVideos;
  } catch (error) {
    console.error('YouTube API Error', error);
    return null;
  }
};

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
    - 2 Articles
    - 1 PDF Notes link

    Return ONLY a valid JSON array of objects.
    Each object must have:
    - "title": A descriptive title of the resource.
    - "type": "ARTICLE" or "PDF"
    - "url": Generate a highly likely search URL. For the PDF Notes link, NEVER invent a direct URL to a PDF file because they often 404. Instead, ALWAYS generate a Google Search URL to search for the PDF, exactly like this: https://www.google.com/search?q=Subject+Topic+filetype:pdf (replace Subject and Topic with the actual subject and topic words separated by '+'). For ARTICLE, use search URLs or known reliable sites (like Wikipedia or GeeksforGeeks).
    `;

    try {
      let rawText = await generateWithAI(prompt, 'gemini-flash-lite-latest', true);
      let resources = JSON.parse(rawText);
      
      resources = resources.map((r: any) => {
        const t = r.type?.toUpperCase() || '';
        if (t.includes('PDF')) {
          r.type = 'PDF';
          // OVERRIDE the AI's generated URL to completely prevent AI hallucinations (like "osimov" instead of "osi")
          r.url = `https://www.google.com/search?q=${encodeURIComponent(subject.name + ' ' + subject.topic)}+filetype:pdf`;
        }
        else if (t.includes('ARTICLE')) {
          r.type = 'ARTICLE';
        }
        return r;
      });
      
      const topicQuery = `${subject.name} ${subject.topic}`;
      const youtubeVideos = await getYoutubeVideos(topicQuery + ' educational tutorial');
      if (youtubeVideos) {
        resources = [...youtubeVideos, ...resources];
      } else {
        resources.push({
           title: `${subject.topic} - YouTube Search`,
           type: 'YOUTUBE',
           url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicQuery)}`
        });
      }

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
      
      const topicQueryStr = `${subject.name} ${subject.topic}`;
      const topicQuery = encodeURIComponent(topicQueryStr);
      let fallbackResources: any[] = [
        { title: `Read about ${subject.topic} on GeeksforGeeks`, type: 'ARTICLE', url: `https://www.geeksforgeeks.org/search/?q=${topicQuery}` },
        { title: `Read about ${subject.topic} on W3Schools/MDN`, type: 'ARTICLE', url: `https://www.google.com/search?q=${topicQuery}+tutorial+w3schools+OR+mdn` },
        { title: `${subject.topic} Cheatsheet / PDF Notes`, type: 'PDF', url: `https://www.google.com/search?q=${topicQuery}+filetype:pdf` }
      ];
      
      const youtubeVideos = await getYoutubeVideos(topicQueryStr + ' educational tutorial');
      if (youtubeVideos) {
        fallbackResources = [...youtubeVideos, ...fallbackResources];
      } else {
        fallbackResources.unshift({
           title: `${subject.topic} - YouTube Search`,
           type: 'YOUTUBE',
           url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topicQueryStr)}`
        });
      }
      
      res.json(fallbackResources);
    }
  } catch (error) {
    console.error('Resource Generation Controller Error:', error);
    res.status(500).json({ error: 'Failed to generate resources.' });
  }
};
