import { Request, Response } from 'express';
import prisma from '../config/db';

export const getReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const schedules = await prisma.studySchedule.findMany({
      where: { userId },
      include: {
        sessions: {
          include: {
            subject: true
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    const formattedReports = schedules.map(schedule => {
      let totalPlannedMinutes = 0;
      let totalCompletedMinutes = 0;
      const subjectsMap = new Map();

      schedule.sessions.forEach(session => {
        if (session.type === 'STUDY' && session.subjectId) {
          totalPlannedMinutes += session.durationMinutes;
          
          let sessionCompletedMinutes = 0;
          if (session.status === 'COMPLETED') {
            sessionCompletedMinutes = session.actualDuration || session.durationMinutes;
          } else {
            sessionCompletedMinutes = session.actualDuration || 0;
          }
          
          totalCompletedMinutes += sessionCompletedMinutes;

          const key = `${session.subjectId}_${session.topic}`;
          if (!subjectsMap.has(key)) {
            subjectsMap.set(key, {
              subjectName: session.subject?.name || 'Unknown',
              topic: session.topic || 'General',
              plannedMinutes: 0,
              completedMinutes: 0,
            });
          }
          
          const subjectData = subjectsMap.get(key);
          subjectData.plannedMinutes += session.durationMinutes;
          subjectData.completedMinutes += sessionCompletedMinutes;
        }
      });

      const subjectsDetails = Array.from(subjectsMap.values()).map(subject => {
        let progress = subject.plannedMinutes > 0 ? (subject.completedMinutes / subject.plannedMinutes) * 100 : 0;
        progress = Math.min(100, Math.round(progress)); 
        
        let status = 'Not Completed';
        if (progress >= 100) status = 'Completed';
        else if (progress > 0) status = 'Partially Completed';

        return {
          ...subject,
          progress,
          status
        };
      });

      let overallProgress = totalPlannedMinutes > 0 ? (totalCompletedMinutes / totalPlannedMinutes) * 100 : 0;
      overallProgress = Math.min(100, Math.round(overallProgress));

      return {
        id: schedule.id,
        date: schedule.date,
        totalSubjects: subjectsMap.size,
        totalPlannedMinutes,
        totalCompletedMinutes,
        overallProgress,
        subjectsDetails
      };
    });

    res.json(formattedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
