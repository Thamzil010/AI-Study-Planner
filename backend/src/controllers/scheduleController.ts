import { generateWithAI } from '../services/ai.service';
import { Request, Response } from 'express';
import prisma from '../config/db';
import { generateQuizCore } from './quizController';
const generateFallbackScheduleData = (payload: any, subjectsMap: any) => {
  const scheduleData = [];
  
  const diffWeights: Record<string, number> = { HARD: 3, MEDIUM: 2, EASY: 1 };
  const sortedTasks = [...payload.tasks].sort((a, b) => {
    const weightA = a.priority * (diffWeights[a.difficulty] || 2);
    const weightB = b.priority * (diffWeights[b.difficulty] || 2);
    return weightB - weightA;
  });

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes: number) => {
    const normalized = minutes % 1440;
    const h = Math.floor(normalized / 60).toString().padStart(2, '0');
    const m = (normalized % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  let studyStart = parseTime(payload.studyStartTime || '08:00');
  let studyEnd = parseTime(payload.studyEndTime || '22:00');
  if (studyEnd < studyStart) {
    studyEnd += 1440;
  }
  
  let workStart = -1, workEnd = -1;
  if (payload.workingHours) {
    workStart = parseTime(payload.workingHours.start);
    workEnd = parseTime(payload.workingHours.end);
    if (workEnd < workStart) workEnd += 1440;
    
    // Align workStart/workEnd to the same day context as studyStart
    if (workStart < studyStart && (workStart + 1440) < studyEnd) {
       workStart += 1440;
       workEnd += 1440;
    }
  }

  const targetMinutes = (payload.totalStudyHours || 4) * 60;
  let currentMinutes = studyStart;
  let studiedToday = 0;
  const sessions = [];

  for (const task of sortedTasks) {
    if (currentMinutes >= studyEnd || studiedToday >= targetMinutes) break;

    const subject = subjectsMap[task.subjectName];
    let remainingMinutes = task.estimatedHours * 60;

    if (task.homework) {
      if (workStart !== -1 && currentMinutes >= workStart && currentMinutes < workEnd) {
        currentMinutes = workEnd;
      }
      
      let nextEnd = currentMinutes + 30; 
      if (workStart !== -1 && currentMinutes < workStart && nextEnd > workStart) nextEnd = workStart;
      if (nextEnd > studyEnd) nextEnd = studyEnd;
      
      const actualDuration = nextEnd - currentMinutes;
      if (actualDuration >= 15) {
        sessions.push({
          subjectId: subject.id,
          topic: task.topic,
          isHomework: true,
          type: 'STUDY',
          startTime: formatTime(currentMinutes),
          endTime: formatTime(nextEnd),
          durationMinutes: actualDuration
        });
        studiedToday += actualDuration;
        remainingMinutes -= actualDuration;
      }
      currentMinutes = nextEnd;
    }

    while (remainingMinutes > 0 && currentMinutes < studyEnd && studiedToday < targetMinutes) {
      if (workStart !== -1 && currentMinutes >= workStart && currentMinutes < workEnd) {
        currentMinutes = workEnd;
        continue;
      }

      let duration = Math.min(45, remainingMinutes);
      let nextEnd = currentMinutes + duration;
      if (workStart !== -1 && currentMinutes < workStart && nextEnd > workStart) nextEnd = workStart;
      if (nextEnd > studyEnd) nextEnd = studyEnd;
      
      const actualDuration = nextEnd - currentMinutes;
      if (actualDuration > 0) {
        sessions.push({
          subjectId: subject.id,
          topic: task.topic,
          isHomework: false,
          type: 'STUDY',
          startTime: formatTime(currentMinutes),
          endTime: formatTime(nextEnd),
          durationMinutes: actualDuration
        });
        studiedToday += actualDuration;
        remainingMinutes -= actualDuration;
      } else {
        break;
      }
      currentMinutes = nextEnd;

      if (studiedToday < targetMinutes && currentMinutes < studyEnd) {
        let breakEnd = currentMinutes + 15;
        if (workStart !== -1 && currentMinutes < workStart && breakEnd > workStart) breakEnd = workStart;
        if (breakEnd > studyEnd) breakEnd = studyEnd;
        const breakDuration = breakEnd - currentMinutes;
        
        if (breakDuration > 0) {
          sessions.push({
            subjectId: null,
            topic: null,
            isHomework: false,
            type: 'BREAK',
            startTime: formatTime(currentMinutes),
            endTime: formatTime(breakEnd),
            durationMinutes: breakDuration
          });
          currentMinutes = breakEnd;
        }
      }
    }
  }

  return sessions;
};

export const generateSchedule = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const payload = req.body;
    
    if (!payload.date || !payload.tasks || payload.tasks.length === 0) {
      return res.status(400).json({ error: 'Missing required payload: date and tasks' });
    }

    const subjectsMap: Record<string, any> = {};
    for (const task of payload.tasks) {
      let subject = await prisma.subject.findFirst({
        where: { userId, name: task.subjectName, completionRate: { lt: 100 } }
      });
      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            name: task.subjectName,
            topic: task.topic,
            priority: task.priority || 5,
            difficulty: task.difficulty || 'MEDIUM',
            estimatedStudyHours: task.estimatedHours || 1,
            userId
          }
        });
      }
      subjectsMap[task.subjectName] = subject;
    }

    const prompt = `
    You are an expert AI Study Planner. Create a 1-day study schedule for a student for the date ${payload.date}.
    
    Student Time Constraints:
    - Study Window: ${payload.studyStartTime || '08:00'} to ${payload.studyEndTime || '22:00'} (24-hour format)
    - Working Hours: ${payload.workingHours ? `${payload.workingHours.start} to ${payload.workingHours.end}` : 'None'} (24-hour format)
    - Total Study Target: ${payload.totalStudyHours || 4} hours

    Today's Tasks (including subject mastery/completionRate):
    ${JSON.stringify(payload.tasks.map((t: any) => ({
      ...t, 
      mastery: subjectsMap[t.subjectName]?.completionRate || 0
    })))}

    Rules (ADAPTIVE SCHEDULING):
    1. STRICTLY schedule within the Study Window. The FIRST session MUST start EXACTLY at the Study Window start time (${payload.studyStartTime || '08:00'}).
    2. If Working Hours exist, DO NOT schedule ANY sessions (study or break) between those hours.
    3. Weave in short breaks (10-15 mins) between study sessions.
    4. Missed homework MUST be scheduled first.
    5. Topics with a previous quiz score or mastery below 70% receive HIGHER priority and LONGER study sessions.
    6. Strong topics (mastery > 80%) receive SHORTER revision sessions.
    7. Completed topics (mastery >= 100%) MUST NEVER be scheduled.
    8. Do not repeat the same subject multiple times unless necessary to hit the total study target.
    9. Ensure the total study time respects the Total Study Target.

    Return ONLY a valid JSON array of sessions.
    Format example:
    [
      { 
        "subjectName": "Math",
        "topic": "Calculus",
        "isHomework": false,
        "type": "STUDY", 
        "startTime": "08:00", 
        "endTime": "09:00",
        "durationMinutes": 60 
      },
      { 
        "subjectName": null,
        "topic": null,
        "isHomework": false,
        "type": "BREAK", 
        "startTime": "09:00", 
        "endTime": "09:15",
        "durationMinutes": 15 
    ]
    `;

    let sessionData;
    let fallbackUsed = false;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        let rawText = await generateWithAI(prompt);
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          rawText = jsonMatch[0];
        } else {
          rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        const parsed = JSON.parse(rawText);
        sessionData = parsed.map((s: any) => ({
          ...s,
          subjectId: s.subjectName ? subjectsMap[s.subjectName]?.id || null : null
        }));
        break; // Success, exit retry loop
      } catch (error: any) {
        if (error.status === 503 && retries > 1) {
          console.warn(`503 High Demand during schedule generation. Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
          retries--;
        } else {
          console.warn('AI Generation failed, using fallback rule-based scheduler', error);
          sessionData = generateFallbackScheduleData(payload, subjectsMap);
          fallbackUsed = true;
          break; // Exit loop on fallback
        }
      }
    }

    const scheduleDate = new Date(payload.date);
    
    await prisma.studySchedule.deleteMany({
      where: { userId, date: scheduleDate }
    });

    const schedule = await prisma.studySchedule.create({
      data: { userId, date: scheduleDate }
    });

    const sessionsToCreate = sessionData.map((session: any) => {
      const [startH, startM] = session.startTime.split(':').map(Number);
      const [endH, endM] = session.endTime.split(':').map(Number);
      
      const startTime = new Date(scheduleDate);
      startTime.setUTCHours(startH, startM, 0, 0);
      
      const endTime = new Date(scheduleDate);
      endTime.setUTCHours(endH, endM, 0, 0);

      return {
        scheduleId: schedule.id,
        subjectId: session.subjectId,
        topic: session.topic || null,
        isHomework: session.isHomework || false,
        startTime: startTime,
        endTime: endTime,
        durationMinutes: session.durationMinutes,
        type: session.type || 'STUDY'
      };
    });

    if (sessionsToCreate.length > 0) {
      await prisma.studySession.createMany({ data: sessionsToCreate });
    }

    res.json({ message: fallbackUsed ? 'Fallback schedule generated' : 'AI Schedule generated successfully', fallbackUsed });
  } catch (error) {
    console.error('Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate schedule.' });
  }
};

export const generateResourcesForTopic = async (subjectId: string, topic: string) => {
  const prompt = `Suggest exactly 5 high-quality learning resources for the topic "${topic}":
  - 2 YouTube videos
  - 1 Article
  - 1 Documentation or Notes
  - 1 Practice website
  Return ONLY JSON format: [{ "title": "Resource Name", "url": "https://example.com", "type": "YOUTUBE|ARTICLE|DOCUMENTATION|PRACTICE" }]`;
  try {
      let rawText = await generateWithAI(prompt);
     rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
     const resources = JSON.parse(rawText);
     for (const r of resources) {
        let safeUrl = r.url;
        
        // AI models (especially smaller free ones) hallucinate exact URLs. 
        // Convert EVERYTHING to search queries to guarantee they always work and are relevant.
        const cleanTitle = (r.title || "").replace(/_/g, ' ');
        const cleanTopic = (topic || "").replace(/_/g, ' ');
        const searchQuery = encodeURIComponent(`${cleanTopic} ${cleanTitle}`);
        
        if (r.type === 'YOUTUBE' || (safeUrl && (safeUrl.includes('youtube.com/watch') || safeUrl.includes('youtu.be')))) {
           safeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
        } else {
           safeUrl = `https://www.google.com/search?q=${searchQuery}`;
        }
        
        await prisma.resource.create({
           data: {
             title: cleanTitle,
             url: safeUrl,
             type: r.type || 'COURSE',
             subjectId
           }
        });
     }
  } catch (err) {
    console.warn("Failed to generate resource for topic", topic);
  }
}

export const getSchedules = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { date } = req.query;
    
    let whereClause: any = { userId };
    
    if (date) {
      const targetDate = new Date(date as string);
      whereClause.date = targetDate;
    }

    const schedules = await prisma.studySchedule.findMany({
      where: whereClause,
      include: {
        sessions: {
          include: {
            subject: {
              include: {
                resources: true
              }
            }
          },
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { date: 'asc' }
    });
    res.json(schedules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const completeSession = async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { actualDuration } = req.body;
    const userId = (req as any).user.id;
    
    const existingSession = await prisma.studySession.findUnique({
      where: { id: sessionId },
      include: { subject: true }
    });

    if (!existingSession) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = await prisma.studySession.update({
      where: { id: sessionId },
      data: { 
        status: 'COMPLETED',
        actualDuration: actualDuration !== undefined ? actualDuration : undefined
      },
      include: { subject: { include: { resources: true } }, schedule: true }
    });
    
    if (existingSession.status !== 'COMPLETED' && existingSession.subjectId && existingSession.subject) {
      const durationToUse = actualDuration ?? existingSession.durationMinutes;
      const estHours = existingSession.subject.estimatedStudyHours || 1;
      const estMinutes = estHours * 60;
      
      // Mark subject as fully completed as requested by user
      let newCompletionRate = 100;
      
      await prisma.subject.update({
        where: { id: existingSession.subjectId },
        data: { completionRate: newCompletionRate }
      });
      
      await prisma.progress.create({
        data: {
          userId,
          subjectId: existingSession.subjectId,
          hoursStudied: durationToUse / 60,
          date: new Date()
        }
      });
    }
    
    // Generate resources if not already present
    if (session.subjectId && session.topic && (!session.subject?.resources || session.subject.resources.length === 0)) {
      generateResourcesForTopic(session.subjectId, session.topic).catch((e: any) => console.error("Resource gen failed on complete", e));
    }

    // Automatically generate quiz for the session topic
    let generatedQuiz = null;
    if (session.subjectId && session.topic) {
      try {
        generatedQuiz = await generateQuizCore(session.subjectId, userId);
      } catch(e: any) {
        console.error("Quiz gen failed on complete", e);
      }
    }

    res.json({ message: 'Session completed', session, generatedQuiz });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
