import { generateWithAI } from '../services/ai.service';
import { Request, Response } from 'express';
import prisma from '../config/db';

export const generateQuizCore = async (subjectId: string, userId: string) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId, userId }
  });

  if (!subject) {
    throw new Error('Subject not found');
  }

  if (!subject.topic) {
    throw new Error('Subject does not have a specific topic to generate a quiz for.');
  }

  const prompt = `
  You are an AI Quiz Generator for a student learning:
  Subject: ${subject.name}
  Topic: ${subject.topic}
  Difficulty: ${subject.difficulty}

  Generate exactly 10 multiple-choice questions for this topic.
  Return ONLY a valid JSON array of objects, with no markdown formatting.
  Each object must have:
  - "question": The question text.
  - "options": An array of exactly 4 strings containing the possible answers.
  - "correctAnswer": The exact string of the correct answer (must match one of the options).
  - "explanation": A short explanation of why the correct answer is correct.
  `;

  let questionsData: any[] = [];
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      let rawText = await generateWithAI(prompt);
      
      // Extract JSON array using regex in case the model is chatty
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rawText = jsonMatch[0];
      } else {
        rawText = rawText.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      }
      
      questionsData = JSON.parse(rawText);
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        throw new Error('Parsed AI response is empty or invalid array');
      }
      break; // Success, exit retry loop
    } catch (aiError) {
      console.warn(`AI Quiz Generation Failed (Retries left: ${retries - 1}):`, aiError);
      retries--;
      if (retries === 0) {
        questionsData = Array.from({ length: 10 }).map((_, i) => ({
          question: `Understanding ${subject.topic}: Which of the following is correct? (Question ${i + 1})`,
          options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A (Correct)',
          explanation: `This is a fallback explanation since the AI service is currently unavailable.`
        }));
      } else {
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  const quiz = await prisma.quiz.create({
    data: {
      topic: subject.topic,
      totalQuestions: questionsData.length,
      userId,
      subjectId,
      questions: {
        create: questionsData.map((q: any) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation // Needs schema update
        }))
      }
    },
    include: {
      questions: true
    }
  });
  const isFallback = questionsData.length > 0 && questionsData[0].options[0] === 'Option A (Correct)';
  return { ...quiz, isFallback };
};

export const generateQuiz = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.body;
    const userId = (req as any).user.id;
    
    const quiz = await generateQuizCore(subjectId, userId);
    res.status(201).json(quiz);
  } catch (error: any) {
    console.error('Quiz Generation Error:', error);
    if (error.message === 'Subject not found') return res.status(404).json({ error: error.message });
    if (error.message === 'Subject does not have a specific topic to generate a quiz for.') return res.status(400).json({ error: error.message });
    res.status(500).json({ error: 'Failed to generate quiz.' });
  }
};


export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { answers, timeTakenSeconds } = req.body; 
    const userId = (req as any).user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: id as string, userId: userId as string },
      include: { questions: true, subject: true }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    let correctCount = 0;
    
    // Evaluate answers
    for (const q of quiz.questions) {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) {
        correctCount++;
      }
    }

    const scorePercentage = (correctCount / quiz.totalQuestions) * 100;
    const wrongCount = quiz.totalQuestions - correctCount;
    
    let aiFeedback = "Keep practicing!";
    let weakAreas: string[] = [];
    let strongAreas: string[] = [];
    let suggestions: string[] = [];

    try {
      const prompt = `
      The student just took a quiz on ${quiz.subject?.name} - ${quiz.topic}.
      Score: ${correctCount}/${quiz.totalQuestions}
      
      Questions and Answers:
      ${quiz.questions.map(q => `Q: ${q.question} | Correct: ${q.correctAnswer} | Student: ${answers[q.id] || 'Skipped'}`).join('\n')}

      Analyze the student's performance. Return a JSON object with:
      - "feedback": A short, encouraging 2-sentence feedback string.
      - "weakAreas": Array of strings describing specific sub-topics or concepts they struggled with (based on wrong answers). Empty if score is 100%.
      - "strongAreas": Array of strings describing concepts they did well on (based on correct answers).
      - "suggestions": Array of strings providing actionable study tips for their weak areas.
      `;

      let rawText = await generateWithAI(prompt);
      rawText = rawText.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
      const parsed = JSON.parse(rawText);
      aiFeedback = parsed.feedback || aiFeedback;
      weakAreas = parsed.weakAreas || [];
      strongAreas = parsed.strongAreas || [];
      suggestions = parsed.suggestions || [];
    } catch (err) {
      console.warn("Failed to generate AI feedback for quiz", err);
    }

    await prisma.quiz.update({
      where: { id: id as string },
      data: {
        score: scorePercentage,
        completed: true,
        feedback: aiFeedback,
        weakAreas: weakAreas,
        strongAreas: strongAreas,
        suggestions: suggestions
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let progressMessage = "";

    // Adaptive Mastery Update
    let currentMastery = quiz.subject.completionRate || 0;
    let newMastery = currentMastery;

    if (scorePercentage >= 70) {
      newMastery = Math.min(100, currentMastery + (scorePercentage >= 90 ? 20 : scorePercentage >= 80 ? 15 : 10));
    } else {
      newMastery = Math.max(0, currentMastery - 10);
    }

    await prisma.subject.update({
      where: { id: quiz.subjectId },
      data: { completionRate: newMastery }
    });

    if (newMastery >= 100 || scorePercentage >= 70) {
      // Remove remaining study sessions for this subject today
      const todaysSchedule = await prisma.studySchedule.findFirst({
        where: { userId, date: today }
      });

      if (todaysSchedule) {
        await prisma.studySession.deleteMany({
          where: {
            scheduleId: todaysSchedule.id,
            subjectId: quiz.subjectId,
            status: 'PENDING'
          }
        });
      }

      progressMessage = "Great job! Topic removed from future planning.";
    } else {
      // Score < 70%, schedule revision for tomorrow
      const tomorrowsSchedule = await prisma.studySchedule.findFirst({
        where: { userId, date: tomorrow }
      });

      if (tomorrowsSchedule) {
        const startTime = new Date(tomorrow);
        startTime.setHours(8, 0, 0, 0); // Place at top of day
        
        const endTime = new Date(tomorrow);
        endTime.setHours(8, 45, 0, 0);

        await prisma.studySession.create({
          data: {
            scheduleId: tomorrowsSchedule.id,
            subjectId: quiz.subjectId,
            topic: quiz.topic,
            startTime,
            endTime,
            durationMinutes: 45,
            type: 'REVISION',
            status: 'PENDING'
          }
        });
      } else {
        const newSchedule = await prisma.studySchedule.create({
          data: { userId, date: tomorrow }
        });
        
        const startTime = new Date(tomorrow);
        startTime.setHours(8, 0, 0, 0);
        
        const endTime = new Date(tomorrow);
        endTime.setHours(8, 45, 0, 0);

        await prisma.studySession.create({
          data: {
            scheduleId: newSchedule.id,
            subjectId: quiz.subjectId,
            topic: quiz.topic,
            startTime,
            endTime,
            durationMinutes: 45,
            type: 'REVISION',
            status: 'PENDING'
          }
        });
      }
      progressMessage = "Score is below 70%. We've automatically scheduled a revision session for tomorrow.";
    }

    await prisma.progress.create({
      data: {
        userId,
        subjectId: quiz.subjectId,
        hoursStudied: 0.5,
        date: new Date()
      }
    });

    res.json({
      score: scorePercentage,
      correctCount,
      wrongCount,
      totalQuestions: quiz.totalQuestions,
      message: progressMessage,
      feedback: aiFeedback,
      weakAreas,
      weakAreas,
      strongAreas,
      suggestions,
      masteryPercentage: newMastery,
      averageTime: timeTakenSeconds ? Math.round(timeTakenSeconds / quiz.totalQuestions) : 0
    });
  } catch (error) {
    console.error('Quiz Submission Error:', error);
    res.status(500).json({ error: 'Failed to submit quiz.' });
  }
};

export const getQuizById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: id as string, userId: userId as string },
      include: { questions: true }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Fetch Quiz Error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz.' });
  }
};
export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const quizzes = await prisma.quiz.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(quizzes);
  } catch (e) {
    res.status(500).json({ error: "Failed" });
  }
};