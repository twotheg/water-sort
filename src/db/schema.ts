import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const gameProgress = pgTable("game_progress", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  level: integer("level").notNull(),
  moves: integer("moves").notNull().default(0),
  timeSeconds: integer("time_seconds").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  subscription: jsonb("subscription").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const gameSettings = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  highestLevel: integer("highest_level").notNull().default(1),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  vibrationEnabled: boolean("vibration_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type GameProgress = typeof gameProgress.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type GameSettings = typeof gameSettings.$inferSelect;
