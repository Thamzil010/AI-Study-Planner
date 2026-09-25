import { Request, Response } from 'express';
import { generateWithAI } from '../services/ai.service';
import prisma from '../config/db';

export const getProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const progress = await prisma.progress.findMany({
      where: { userId },
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });

    res.json(progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const addProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { subjectId, hoursStudied } = req.body;
    
    // Add progress entry
    const progress = await prisma.progress.create({
      data: {
        userId,
        subjectId,
        hoursStudied: parseFloat(hoursStudied)
      }
    });

    // Update subject completion rate (simple mock logic)
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (subject) {
      const newCompletion = Math.min(100, subject.completionRate + (hoursStudied * 2)); // 2% per hour studied
      await prisma.subject.update({
        where: { id: subjectId },
        data: { completionRate: newCompletion }
      });
    }

    res.status(201).json(progress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const nowTime = new Date();
    
    // For Schedule matching (which is saved as UTC midnight)
    const utcToday = new Date(Date.UTC(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate()));

    // For Progress matching (which should follow local timezone days)
    const localToday = new Date(nowTime);
    localToday.setHours(0, 0, 0, 0);
    
    const localTomorrow = new Date(localToday);
    localTomorrow.setDate(localTomorrow.getDate() + 1);

    // Run independent database queries in parallel
    const [
      todaysSchedule,
      progresses,
      subjects,
      missedHomeworkCount,
      allProgresses,
      upcomingRevisions
    ] = await Promise.all([
      // 1. Today's Sessions & Next Session
      prisma.studySchedule.findFirst({
        where: { userId, date: utcToday },
        include: {
          sessions: {
            include: { subject: true },
            orderBy: { startTime: 'asc' }
          }
        }
      }),
      // 2. Today's Study Hours
      prisma.progress.findMany({
        where: { 
          userId,
          date: { gte: localToday, lt: localTomorrow }
        }
      }),
      // 3. Subjects
      prisma.subject.findMany({ where: { userId } }),
      // 4. Missed Homework
      prisma.studySession.count({
        where: {
          schedule: { userId, date: { lt: utcToday } },
          isHomework: true,
          status: 'PENDING'
        }
      }),
      // 5. All Progresses for Average Study Time
      prisma.progress.groupBy({
        by: ['date'],
        where: { userId },
        _sum: { hoursStudied: true }
      }),
      // 6. Upcoming Revisions
      prisma.studySession.count({
        where: {
          schedule: { userId, date: { gte: utcToday } },
          type: 'REVISION',
          status: 'PENDING'
        }
      })
    ]);

    const todaysSessions = todaysSchedule?.sessions || [];
    const completedTasksToday = todaysSessions.filter(s => s.status === 'COMPLETED').length;
    const pendingTasksToday = todaysSessions.filter(s => s.status === 'PENDING').length;
    
    // Find next session that is pending
    const now = new Date();
    const nextSession = todaysSessions.find(s => s.status === 'PENDING' && new Date(s.startTime) > now);

    let todaysStudyHours = 0;
    todaysSessions.forEach((s: any) => {
      if (s.status === 'COMPLETED' && s.type !== 'BREAK') {
        todaysStudyHours += (s.actualDuration || s.durationMinutes) / 60;
      }
    });
    todaysStudyHours = Math.round(todaysStudyHours * 10) / 10;

    // Readiness Score and Subject Stats
    let totalScore = 0;
    
    let topicsCompleted = 0;
    let weakestSubject = "N/A";
    let strongestSubject = "N/A";
    let lowestMastery = 101;
    let highestMastery = -1;

    for (const subject of subjects) {
      if (subject.completionRate >= 100) topicsCompleted++;
      
      if (subject.completionRate < lowestMastery) {
        lowestMastery = subject.completionRate;
        weakestSubject = subject.name;
      }
      if (subject.completionRate > highestMastery) {
        highestMastery = subject.completionRate;
        strongestSubject = subject.name;
      }

      let score = subject.completionRate;
      if (subject.difficulty === 'HARD') score *= 0.8;
      else if (subject.difficulty === 'EASY') score *= 1.1;
      totalScore += Math.min(100, score);
    }
    const readinessScore = subjects.length > 0 ? Math.round(totalScore / subjects.length) : 0;

    const homeworkPending = todaysSessions.filter(s => s.isHomework && s.status === 'PENDING').length;
    
    // Average Study Time
    let totalStudyTime = 0;
    allProgresses.forEach(p => {
      totalStudyTime += p._sum.hoursStudied || 0;
    });
    
    const averageStudyTime = allProgresses.length > 0 
      ? Math.round((totalStudyTime / allProgresses.length) * 10) / 10 
      : 0;

    // Current Streak (must be sequential so we keep it outside the Promise.all)
    let currentStreak = 0;
    let checkDate = new Date(localToday);
    
    const nextDate = new Date(checkDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const hasProgressToday = await prisma.progress.findFirst({
      where: { userId, date: { gte: checkDate, lt: nextDate } }
    });
    
    if (hasProgressToday) {
      currentStreak++;
    }
    
    checkDate.setDate(checkDate.getDate() - 1);
    while (true) {
      const nDate = new Date(checkDate);
      nDate.setDate(nDate.getDate() + 1);
      const hasProgress = await prisma.progress.findFirst({
        where: { userId, date: { gte: checkDate, lt: nDate } }
      });
      
      if (hasProgress) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 8. AI Recommendation
    let aiRecommendation = `Focus on ${weakestSubject} today and keep up the good work.`;
    try {
      const prompt = `Based on the following data, provide a 1-sentence encouraging study recommendation. 
Weakest subject: ${weakestSubject}, Strongest: ${strongestSubject}, Readiness: ${readinessScore}%.`;
      
      const aiResponse = await generateWithAI(prompt);
      
      if (aiResponse) {
        aiRecommendation = aiResponse.trim();
      }
    } catch (err) {
      console.warn("Failed to generate AI recommendation", err);
    }

    res.json({
      todaysSessions,
      completedTasksToday,
      pendingTasksToday,
      nextSession: nextSession || null,
      todaysStudyHours,
      readinessScore,
      topicsCompleted,
      homeworkPending,
      missedHomeworkCount,
      weakestSubject,
      strongestSubject,
      averageStudyTime,
      currentStreak,
      upcomingRevisions,
      aiRecommendation
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
