import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateInterviewQuestions, generateFeedback, chatWithAsh } from "./openrouter";
import { insertUserSchema, insertSessionSchema, insertAnswerSchema, insertChatMessageSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-in-production";

interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const MAX_QUESTIONS_PER_SESSION = 15;
const DEFAULT_QUESTIONS_PER_SESSION = 5;

// Rate limiter for authentication endpoints (login, register, change-password)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "test" ? 1000 : 20, // higher limit in test environment
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password, email } = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashedPassword, email });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.json({ 
        user: { id: user.id, username: user.username, displayName: user.displayName || user.username, email: user.email ?? null },
        token 
      });
    } catch (error) {
      console.error("Registration error:", error);
      
      // Zod validation errors
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data" });
      }
      
      // Known validation errors
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      
      // Unknown server errors
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req: Request, res: Response) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.json({ 
        user: { id: user.id, username: user.username, displayName: user.displayName || user.username },
        token 
      });
    } catch (error) {
      console.error("Login error:", error);
      
      // Zod validation errors
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data" });
      }
      
      // Known validation errors
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      
      // Unknown server errors
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/change-password", authRateLimiter, authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ error: "currentPassword and newPassword are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }

      const userId = req.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(userId, hashedPassword);

      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
    let role: string;
    try {
      ({ role } = insertSessionSchema.parse(req.body));
    } catch {
      return res.status(400).json({ error: "Invalid request: role is required" });
    }
    try {
      const count = typeof req.body.count === "number" && req.body.count > 0 ? Math.min(req.body.count, MAX_QUESTIONS_PER_SESSION) : DEFAULT_QUESTIONS_PER_SESSION;
      const interviewType = typeof req.body.interviewType === "string" ? req.body.interviewType : "Job Interview";
      const userId = req.userId!;

      const session = await storage.createSession(userId, { role });

      const { source, questions: questionData } = await generateInterviewQuestions(role, count, interviewType);

      const questions = await Promise.all(
        questionData.map((q, index) => 
          storage.createQuestion(session.id, q.question, q.difficulty, index)
        )
      );

      res.json({ session, questions, source });
    } catch (error) {
      console.error("Session creation error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const sessions = await storage.getUserSessions(userId);

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const questions = await storage.getSessionQuestions(session.id);
          let totalScore = 0;
          let answeredCount = 0;

          for (const question of questions) {
            const answer = await storage.getQuestionAnswer(question.id);
            if (answer) {
              answeredCount++;
              const feedback = await storage.getFeedbackByAnswer(answer.id);
              if (feedback) {
                totalScore += feedback.score;
              }
            }
          }

          const avgScore = answeredCount > 0 ? totalScore / answeredCount : 0;

          return {
            ...session,
            questionsCount: questions.length,
            avgScore: Math.round(avgScore * 10) / 10,
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  app.get("/api/sessions/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const session = await storage.getSession(id);

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const questions = await storage.getSessionQuestions(id);

      res.json({ session, questions });
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  app.get("/api/sessions/:id/details", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const session = await storage.getSession(id);

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      const questionsWithDetails = await storage.getSessionQuestionsWithDetails(id);

      res.json({ session, questions: questionsWithDetails });
    } catch (error) {
      res.status(500).json({ error: "Failed to get session details" });
    }
  });

  app.post("/api/sessions/:id/complete", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const session = await storage.getSession(id);

      if (!session || session.userId !== req.userId) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (session.status === "completed") {
        return res.status(400).json({ error: "Session already completed" });
      }

      await storage.completeSession(id);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to complete session" });
    }
  });

  app.post("/api/answers", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const answerData = insertAnswerSchema.parse(req.body);

      const question = await storage.getQuestion(answerData.questionId);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const session = await storage.getSession(question.sessionId);
      if (!session || session.userId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const answer = await storage.createAnswer(answerData);

      const { source, feedback: feedbackData } = await generateFeedback(question.questionText, answerData.answerText);

      const feedback = await storage.createFeedback(answer.id, feedbackData);

      res.json({ answer, feedback, source });
    } catch (error) {
      console.error("Answer submission error:", error);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  app.get("/api/questions/:id/feedback", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const question = await storage.getQuestion(id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const session = await storage.getSession(question.sessionId);
      if (!session || session.userId !== req.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const answer = await storage.getQuestionAnswer(id);
      if (!answer) {
        return res.status(404).json({ error: "No answer found" });
      }

      const feedback = await storage.getFeedbackByAnswer(answer.id);
      if (!feedback) {
        return res.status(404).json({ error: "No feedback found" });
      }

      res.json({ answer, feedback });
    } catch (error) {
      res.status(500).json({ error: "Failed to get feedback" });
    }
  });

  app.post("/api/chat", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { content } = insertChatMessageSchema.parse(req.body);
      const userId = req.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createChatMessage(userId, { role: "user", content });

      const history = await storage.getUserChatHistory(userId, 20);

      const messages = history.map(m => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content
      }));

      // Construct system prompt with user's name
      const userDisplayName = user.displayName || user.username || "there";
      const systemPrompt = `
        You are Ash, a British-English speaking AI interview coach.
        The user's name is ${userDisplayName}.
        Always address them by name when appropriate, e.g. "Well done, Alex" or "Good question, Sam."
        Keep tone supportive but constructive.
        Output JSON in this format:
        {
          "reply": "...",
          "memory": "... or null",
          "tags": ["strength" | "weakness" | "goal" | "progress" | "personal"]
        }
      `;

      const { source, message } = await chatWithAsh(messages, {
        systemPrompt,
        userName: userDisplayName,
      });

      const { reply, memory, tags } = message;

      if (memory) {
        await storage.createMemory(userId, userDisplayName, memory, tags || []);
      }

      await storage.createChatMessage(userId, { role: "assistant", content: reply });
      res.json({ response: reply, source, memory, tags });

    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/history", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const messages = await storage.getUserChatHistory(userId);

      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  // Endpoint to get user profile including display name
  app.get("/api/users/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        id: user.id, 
        username: user.username, 
        displayName: user.displayName || user.username 
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Failed to get user profile" });
    }
  });

  // Update display name
  app.put('/api/user/display-name', authMiddleware, async (req: AuthRequest, res: Response) => {
    const { displayName } = req.body;
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const trimmedName = displayName.trim();

    // Validate length constraints
    if (trimmedName.length < 1) {
      return res.status(400).json({ error: 'Display name must be at least 1 character' });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({ error: 'Display name must be 100 characters or less' });
    }

    try {
      const userId = req.userId!;

      await storage.updateUserDisplayName(userId, trimmedName);

      res.json({ success: true, displayName: trimmedName });
    } catch (error) {
      console.error('Failed to update display name:', error);
      res.status(500).json({ error: 'Failed to update display name' });
    }
  });


  const httpServer = createServer(app);

  return httpServer;
}