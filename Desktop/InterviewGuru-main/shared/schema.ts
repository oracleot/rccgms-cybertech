import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull().default("User"),
  email: text("email"),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id),
  questionText: text("question_text").notNull(),
  difficulty: text("difficulty").notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => questions.id),
  answerText: text("answer_text").notNull(),
  isVoice: integer("is_voice").notNull().default(0),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  answerId: varchar("answer_id").notNull().references(() => answers.id),
  score: integer("score").notNull(),
  critique: text("critique").notNull(),
  starRewrite: text("star_rewrite").notNull(),
  strengths: jsonb("strengths").notNull().$type<string[]>(),
  improvements: jsonb("improvements").notNull().$type<string[]>(),
  followUpQuestions: jsonb("follow_up_questions").notNull().$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
}).extend({
  email: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.string().email("Please enter a valid email address").optional()
  ),
});

export const insertSessionSchema = createInsertSchema(interviewSessions).pick({
  role: true,
});

export const insertAnswerSchema = createInsertSchema(answers).pick({
  questionId: true,
  answerText: true,
}).extend({
  isVoice: z.boolean(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InterviewSession = typeof interviewSessions.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
