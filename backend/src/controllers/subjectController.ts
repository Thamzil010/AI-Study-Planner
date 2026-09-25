import { Request, Response } from 'express';
import prisma from '../config/db';

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const subjects = await prisma.subject.findMany({
      where: { 
        userId,
        completionRate: {
          lt: 100
        }
      },
    });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, priority, difficulty, topic, estimatedStudyHours } = req.body;
    
    const subject = await prisma.subject.create({
      data: {
        name,
        priority: priority ? parseInt(priority, 10) : 5,
        difficulty,
        topic,
        estimatedStudyHours: estimatedStudyHours ? parseFloat(estimatedStudyHours) : 0,
        userId,
      },
    });
    
    res.status(201).json(subject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name, priority, difficulty, completionRate, topic, estimatedStudyHours } = req.body;
    
    const subject = await prisma.subject.updateMany({
      where: { id: id as string, userId },
      data: {
        ...(name && { name }),
        ...(priority !== undefined && { priority: parseInt(priority, 10) }),
        ...(difficulty && { difficulty }),
        ...(completionRate !== undefined && { completionRate }),
        ...(topic !== undefined && { topic }),
        ...(estimatedStudyHours !== undefined && { estimatedStudyHours: parseFloat(estimatedStudyHours) }),
      },
    });
    
    if (subject.count === 0) {
      return res.status(404).json({ error: 'Subject not found or unauthorized' });
    }
    
    res.json({ message: 'Subject updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    
    const subject = await prisma.subject.deleteMany({
      where: { id: id as string, userId },
    });
    
    if (subject.count === 0) {
      return res.status(404).json({ error: 'Subject not found or unauthorized' });
    }
    
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
