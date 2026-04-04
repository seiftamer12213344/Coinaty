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
  password: varchar("password"),
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
  backPhotoUrl: text("back_photo_url"), // Optional reverse / back face photo
  metalType: text("metal_type"), // Optional, e.g., Gold, Silver
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
  content: text("content").notNull().default(""),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const callSessions = pgTable("call_sessions", {
  id: serial("id").primaryKey(),
  callerId: varchar("caller_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  status: text("status").notNull().default("pending"),
  sdpOffer: text("sdp_offer"),
  sdpAnswer: text("sdp_answer"),
  callerCandidates: jsonb("caller_candidates").$type<string[]>().default([]),
  receiverCandidates: jsonb("receiver_candidates").$type<string[]>().default([]),
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

// Groups
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupInvitations = pgTable("group_invitations", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  inviterId: varchar("inviter_id").notNull(),
  inviteeId: varchar("invitee_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, { fields: [groups.createdBy], references: [users.id] }),
  members: many(groupMembers),
  messages: many(groupMessages),
  invitations: many(groupInvitations),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const groupMessagesRelations = relations(groupMessages, ({ one }) => ({
  group: one(groups, { fields: [groupMessages.groupId], references: [groups.id] }),
  sender: one(users, { fields: [groupMessages.senderId], references: [users.id] }),
}));

export const groupInvitationsRelations = relations(groupInvitations, ({ one }) => ({
  group: one(groups, { fields: [groupInvitations.groupId], references: [groups.id] }),
  inviter: one(users, { fields: [groupInvitations.inviterId], references: [users.id] }),
  invitee: one(users, { fields: [groupInvitations.inviteeId], references: [users.id] }),
}));

// User Settings
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  defaultUnits: text("default_units").notNull().default("metric"),
  conditionScale: text("condition_scale").notNull().default("sheldon"),
  messageRequests: text("message_requests").notNull().default("everyone"),
  ghostMode: boolean("ghost_mode").notNull().default(false),
  emailLikes: boolean("email_likes").notNull().default(true),
  emailComments: boolean("email_comments").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blockedUsers = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  blockedUserId: varchar("blocked_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  user: one(users, { fields: [blockedUsers.userId], references: [users.id] }),
  blockedUser: one(users, { fields: [blockedUsers.blockedUserId], references: [users.id] }),
}));

// Market Prices — eBay scraped sold listing cache
export const marketPrices = pgTable("market_prices", {
  id: serial("id").primaryKey(),
  numistaId: text("numista_id").notNull().unique(),
  coinTitle: text("coin_title").notNull(),
  listings: jsonb("listings").$type<{ price: number; currency: string; title: string; dateSold: string }[]>().default([]),
  avgPrice: text("avg_price"),
  currency: text("currency").default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type MarketPrice = typeof marketPrices.$inferSelect;

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

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true, createdAt: true, createdBy: true,
});
export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({
  id: true, createdAt: true, senderId: true, groupId: true,
});

// Exports
export type User = typeof users.$inferSelect;
export type Coin = typeof coins.$inferSelect;
export type CoinLike = typeof coinLikes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type GroupMessage = typeof groupMessages.$inferSelect;
export type GroupInvitation = typeof groupInvitations.$inferSelect;

export type InsertCoin = z.infer<typeof insertCoinSchema>;
export type CallSession = typeof callSessions.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type BlockedUser = typeof blockedUsers.$inferSelect;

export * from "./models/chat";
