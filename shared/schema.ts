import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const automations = pgTable("automations", {
  id: serial("id").primaryKey(),
  propertyCode: text("property_code").notNull(),
  olxCode: text("olx_code").notNull(),
  status: text("status").notNull(), // 'pending', 'processing', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100
  currentStep: text("current_step"),
  videoUrl: text("video_url"),
  tourUrl: text("tour_url"),
  propertyData: jsonb("property_data"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const brokers = pgTable("brokers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const olxCodes = pgTable("olx_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  brokerId: integer("broker_id").references(() => brokers.id),
  isUsed: boolean("is_used").default(false),
  isHighlighted: boolean("is_highlighted").default(false),
  isActive: boolean("is_active").default(true),
  currentAutomationId: integer("current_automation_id"),
  univenCode: text("univen_code"), // Campo para correlacionar com código UNIVEN
  createdAt: timestamp("created_at").defaultNow(),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // 'info', 'success', 'warning', 'error'
  message: text("message").notNull(),
  automationId: integer("automation_id"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertBrokerSchema = createInsertSchema(brokers).omit({
  id: true,
  createdAt: true,
});

export const insertOlxCodeSchema = createInsertSchema(olxCodes).omit({
  id: true,
  createdAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;

export type Broker = typeof brokers.$inferSelect;
export type InsertBroker = z.infer<typeof insertBrokerSchema>;

export type OlxCode = typeof olxCodes.$inferSelect;
export type InsertOlxCode = z.infer<typeof insertOlxCodeSchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Additional types for automation progress
export type AutomationStep = 
  | "connecting_univen"
  | "extracting_data"
  | "downloading_photos"
  | "connecting_olx"
  | "creating_listing"
  | "finalizing";

export type AutomationProgress = {
  step: AutomationStep;
  progress: number;
  message: string;
  timestamp: Date;
};

export type PropertyData = {
  code: string;
  type: string;
  price: number;
  description: string;
  address: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  photos: string[];
  features: string[];
};
