import { coins, coinLikes, comments, messages, users as usersTable, type User, type Coin, type CoinLike, type Comment, type Message, type InsertCoin } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, inArray, sql, ilike } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth";

export interface IStorage extends IAuthStorage {
  // Coins
  getCoins(category?: string, userId?: string): Promise<Coin[]>;
  getCoin(id: number): Promise<Coin | undefined>;
  createCoin(coin: InsertCoin, userId: string): Promise<Coin>;
  deleteCoin(id: number, userId: string): Promise<boolean>;
  
  // Likes
  getLikesCount(coinId: number): Promise<number>;
  hasUserLikedCoin(coinId: number, userId: string): Promise<boolean>;
  toggleLike(coinId: number, userId: string): Promise<{ liked: boolean, count: number }>;
  getUsersWhoLikedCoin(coinId: number): Promise<User[]>;

  // Comments
  getComments(coinId: number): Promise<Comment[]>;
  createComment(coinId: number, userId: string, content: string): Promise<Comment>;

  // Users
  updateUserProfile(userId: string, updates: { displayName?: string, profileImageUrl?: string }): Promise<User | undefined>;
  getLeaderboard(): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;

  // Messages
  getConversations(userId: string): Promise<User[]>;
  getMessages(userId1: string, userId2: string): Promise<Message[]>;
  sendMessage(senderId: string, receiverId: string, content: string): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  // Delegate Auth storage to authStorage
  async getUser(id: string) { return authStorage.getUser(id); }
  async upsertUser(user: any) { return authStorage.upsertUser(user); }

  async getCoins(category?: string, userId?: string): Promise<Coin[]> {
    let query = db.select().from(coins);
    
    const conditions = [];
    if (category) conditions.push(eq(coins.category, category));
    if (userId) conditions.push(eq(coins.userId, userId));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(coins.createdAt));
    }
    
    return await query.orderBy(desc(coins.createdAt));
  }

  async getCoin(id: number): Promise<Coin | undefined> {
    const [coin] = await db.select().from(coins).where(eq(coins.id, id));
    return coin;
  }

  async createCoin(coinData: InsertCoin, userId: string): Promise<Coin> {
    const [coin] = await db.insert(coins).values({
      ...coinData,
      userId,
    }).returning();
    
    // Add points for uploading a coin (10 pts)
    await db.update(usersTable)
      .set({ points: sql`${usersTable.points} + 10` })
      .where(eq(usersTable.id, userId));

    return coin;
  }

  async deleteCoin(id: number, userId: string): Promise<boolean> {
    const coin = await this.getCoin(id);
    if (!coin || coin.userId !== userId) return false;
    await db.delete(coins).where(eq(coins.id, id));
    return true;
  }

  async getLikesCount(coinId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(coinLikes).where(eq(coinLikes.coinId, coinId));
    return Number(result[0].count);
  }

  async hasUserLikedCoin(coinId: number, userId: string): Promise<boolean> {
    const [like] = await db.select().from(coinLikes).where(and(eq(coinLikes.coinId, coinId), eq(coinLikes.userId, userId)));
    return !!like;
  }

  async toggleLike(coinId: number, userId: string): Promise<{ liked: boolean, count: number }> {
    const existingLike = await this.hasUserLikedCoin(coinId, userId);
    
    if (existingLike) {
      await db.delete(coinLikes).where(and(eq(coinLikes.coinId, coinId), eq(coinLikes.userId, userId)));
      // Optional: deduct points if needed
    } else {
      await db.insert(coinLikes).values({ coinId, userId });
      // Add points to coin owner (2 pts)
      const coin = await this.getCoin(coinId);
      if (coin && coin.userId !== userId) {
         await db.update(usersTable)
          .set({ points: sql`${usersTable.points} + 2` })
          .where(eq(usersTable.id, coin.userId));
      }
    }
    
    const count = await this.getLikesCount(coinId);
    return { liked: !existingLike, count };
  }

  async getUsersWhoLikedCoin(coinId: number): Promise<User[]> {
    const likes = await db.select().from(coinLikes).where(eq(coinLikes.coinId, coinId));
    if (likes.length === 0) return [];
    
    const userIds = likes.map(l => l.userId);
    return await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
  }

  async getComments(coinId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.coinId, coinId)).orderBy(desc(comments.createdAt));
  }

  async createComment(coinId: number, userId: string, content: string): Promise<Comment> {
    const [comment] = await db.insert(comments).values({
      coinId,
      userId,
      content,
    }).returning();

    // Add points for comment (5 pts)
    await db.update(usersTable)
      .set({ points: sql`${usersTable.points} + 5` })
      .where(eq(usersTable.id, userId));

    return comment;
  }

  async updateUserProfile(userId: string, updates: { displayName?: string, profileImageUrl?: string }): Promise<User | undefined> {
    const [updated] = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();
    return updated;
  }

  async getLeaderboard(): Promise<User[]> {
    return await db.select().from(usersTable).orderBy(desc(usersTable.points)).limit(50);
  }

  async searchUsers(query: string): Promise<User[]> {
    if (!query.trim()) return [];
    return await db.select().from(usersTable)
      .where(ilike(usersTable.displayName, `%${query}%`))
      .limit(20);
  }

  async getConversations(userId: string): Promise<User[]> {
    const msgs = await db.select().from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));
    
    const otherUserIds = new Set<string>();
    for (const msg of msgs) {
      if (msg.senderId !== userId) otherUserIds.add(msg.senderId);
      if (msg.receiverId !== userId) otherUserIds.add(msg.receiverId);
    }
    
    if (otherUserIds.size === 0) return [];
    return await db.select().from(usersTable).where(inArray(usersTable.id, Array.from(otherUserIds)));
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(messages.createdAt);
  }

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({
      senderId,
      receiverId,
      content
    }).returning();
    return msg;
  }
}

export const storage = new DatabaseStorage();
