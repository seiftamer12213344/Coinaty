import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Auth tables (REQUIRED for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coins = pgTable("coins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // e.g., Ottoman, Kingdom of Egypt, Modern
  photoUrl: text("photo_url").notNull(),
  metalType: text("metal_type"), // Optional, e.g., Gold, Silver
  estimatedValue: integer("estimated_value").default(0),
  numistaId: text("numista_id"), // Numista N# for linking to official page
  createdAt: timestamp("created_at").defaultNow(),
});

export const coinLikes = pgTable("coin_likes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  coinId: integer("coin_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  coinId: integer("coin_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  coins: many(coins),
  likes: many(coinLikes),
  comments: many(comments),
}));

export const coinsRelations = relations(coins, ({ one, many }) => ({
  user: one(users, { fields: [coins.userId], references: [users.id] }),
  likes: many(coinLikes),
  comments: many(comments),
}));

export const coinLikesRelations = relations(coinLikes, ({ one }) => ({
  user: one(users, { fields: [coinLikes.userId], references: [users.id] }),
  coin: one(coins, { fields: [coinLikes.coinId], references: [coins.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  coin: one(coins, { fields: [comments.coinId], references: [coins.id] }),
}));


export const watchlistItems = pgTable("watchlist_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  coinId: integer("coin_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const watchlistRelations = relations(watchlistItems, ({ one }) => ({
  user: one(users, { fields: [watchlistItems.userId], references: [users.id] }),
  coin: one(coins, { fields: [watchlistItems.coinId], references: [coins.id] }),
}));

// Zod Schemas
export const insertCoinSchema = createInsertSchema(coins).omit({ 
  id: true, createdAt: true, userId: true 
});
export const insertCommentSchema = createInsertSchema(comments).omit({ 
  id: true, createdAt: true, userId: true, coinId: true 
});
export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, createdAt: true, senderId: true 
});

// Exports
export type User = typeof users.$inferSelect;
export type Coin = typeof coins.$inferSelect;
export type CoinLike = typeof coinLikes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;

export type InsertCoin = z.infer<typeof insertCoinSchema>;
