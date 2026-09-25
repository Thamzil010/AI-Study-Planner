import { Request, Response } from 'express';
import prisma from '../config/db';

export const getExamReadiness = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const subjects = await prisma.subject.findMany({
      where: { userId },
    });

    if (subjects.length === 0) {
      return res.json({ readinessScore: 0, recommendations: ['Add subjects to get a readiness score.'] });
    }

    let totalScore = 0;
    const recommendations: string[] = [];
    const subjectScores = [];

    for (const subject of subjects) {
      // Mock readiness logic based on completion rate and difficulty
      let score = subject.completionRate;
      
      if (subject.difficulty === 'HARD') score *= 0.8;
      else if (subject.difficulty === 'EASY') score *= 1.1;

      score = Math.min(100, score);
      totalScore += score;

      subjectScores.push({ name: subject.name, score });

      if (score < 50) {
        recommendations.push(`Focus more on ${subject.name} as your readiness is below 50%.`);
      }
    }

    const readinessScore = Math.round(totalScore / subjects.length);
    
    if (readinessScore > 80) {
      recommendations.push("You're doing great! Keep up the good work.");
    }

    res.json({
      readinessScore,
      subjectScores,
      recommendations
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
