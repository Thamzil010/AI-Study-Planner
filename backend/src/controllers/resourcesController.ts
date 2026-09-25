import { Request, Response } from 'express';
import prisma from '../config/db';

export const getResources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Fetch subjects for this user to get relevant resources
    const subjects = await prisma.subject.findMany({
      where: { userId },
      select: { id: true, name: true }
    });
    
    if (subjects.length === 0) {
      return res.json([]);
    }
    
    const subjectIds = subjects.map(s => s.id);

    // In a real AI app, we'd query an external API or vector DB here based on subject names
    // For now, we will return some mocked / placeholder resources linked to their subjects.
    
    // Check if we have resources in DB, if not, let's create a few dummy ones
    const count = await prisma.resource.count({
      where: { subjectId: { in: subjectIds } }
    });

    if (count === 0) {
      // Seed some dummy resources
      const dummyResources = subjects.flatMap(sub => [
        { title: `${sub.name} Crash Course`, type: 'YOUTUBE', url: 'https://youtube.com', subjectId: sub.id },
        { title: `Advanced ${sub.name} Concepts`, type: 'PDF', url: 'https://example.com/pdf', subjectId: sub.id }
      ]);
      await prisma.resource.createMany({ data: dummyResources });
    }

    const resources = await prisma.resource.findMany({
      where: { subjectId: { in: subjectIds } },
      include: { subject: { select: { name: true } } }
    });

    res.json(resources);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
