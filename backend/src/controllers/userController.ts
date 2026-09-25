import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/db';

export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        department: true,
        semester: true,
        dailyStudyHours: true,
        workingHours: true,
        studyStartTime: true,
        studyEndTime: true,
        hasWorkingHours: true,
        workStartTime: true,
        workEndTime: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Failed to get preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      name,
      department,
      semester,
      dailyStudyHours,
      studyStartTime,
      studyEndTime,
      hasWorkingHours,
      workStartTime,
      workEndTime,
    } = req.body;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        department,
        semester,
        dailyStudyHours,
        studyStartTime,
        studyEndTime,
        hasWorkingHours,
        workStartTime,
        workEndTime,
      },
    });
    
    res.json({ message: 'Preferences updated successfully', user });
  } catch (error) {
    console.error('Failed to update preferences:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update Password Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
