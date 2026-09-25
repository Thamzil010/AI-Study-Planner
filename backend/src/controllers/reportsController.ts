import { Request, Response } from 'express';
import prisma from '../config/db';

export const getReports = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // In a real app, generate PDF or complex aggregation here.
    // For now, return basic user statistics.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subjects: true,
        progress: true,
        examScores: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalHoursStudied = user.progress.reduce((acc, curr) => acc + curr.hoursStudied, 0);
    const averageCompletion = user.subjects.length > 0 
      ? user.subjects.reduce((acc, curr) => acc + curr.completionRate, 0) / user.subjects.length 
      : 0;

    const report = {
      user: { name: user.name, department: user.department },
      statistics: {
        totalSubjects: user.subjects.length,
        totalHoursStudied,
        averageSubjectCompletion: Math.round(averageCompletion),
        progressEntries: user.progress.length,
      }
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
