import { coins, coinLikes, comments, messages, users as usersTable, watchlistItems, groups, groupMembers, groupMessages, groupInvitations, callSessions, marketPrices, userSettings, blockedUsers, type User, type Coin, type CoinLike, type Comment, type Message, type WatchlistItem, type Group, type GroupMember, type GroupMessage, type GroupInvitation, type InsertCoin, type CallSession, type MarketPrice, type UserSettings, type BlockedUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, inArray, sql, ilike } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth";
import bcrypt from "bcryptjs";

function safeUser(u: User): User {
  return { ...u, email: null };
}

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
  sendMessage(senderId: string, receiverId: string, content: string, audioUrl?: string): Promise<Message>;

  // Calls
  createCall(callerId: string, receiverId: string): Promise<CallSession>;
  getCall(id: number): Promise<CallSession | undefined>;
  getIncomingCall(userId: string): Promise<CallSession | undefined>;
  updateCall(id: number, updates: { status?: string; sdpOffer?: string; sdpAnswer?: string }): Promise<CallSession | undefined>;
  addCandidates(id: number, role: "caller" | "receiver", candidates: string[]): Promise<void>;

  // Watchlist
  getWatchlist(userId: string): Promise<Coin[]>;
  isInWatchlist(userId: string, coinId: number): Promise<boolean>;
  toggleWatchlist(userId: string, coinId: number): Promise<{ added: boolean }>;

  // Market Prices
  getMarketPrice(numistaId: string): Promise<MarketPrice | undefined>;
  upsertMarketPrice(numistaId: string, coinTitle: string, listings: { price: number; currency: string; title: string; dateSold: string }[]): Promise<MarketPrice>;

  // Settings
  getUserSettings(userId: string): Promise<UserSettings>;
  updateUserSettings(userId: string, updates: Partial<Omit<UserSettings, 'id' | 'userId' | 'updatedAt'>>): Promise<UserSettings>;
  getBlockedUsers(userId: string): Promise<(BlockedUser & { user: User })[]>;
  blockUser(userId: string, blockedUserId: string): Promise<BlockedUser>;
  unblockUser(userId: string, blockedUserId: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;

  // Groups
  createGroup(name: string, createdBy: string): Promise<Group>;
  getGroupsForUser(userId: string): Promise<(Group & { memberCount: number })[]>;
  getGroupById(id: number): Promise<Group | undefined>;
  getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]>;
  isGroupMember(groupId: number, userId: string): Promise<boolean>;
  getGroupMessages(groupId: number): Promise<(GroupMessage & { sender: User })[]>;
  sendGroupMessage(groupId: number, senderId: string, content: string): Promise<GroupMessage>;
  createGroupInvitation(groupId: number, inviterId: string, inviteeId: string): Promise<GroupInvitation>;
  getPendingInvitations(userId: string): Promise<(GroupInvitation & { group: Group; inviter: User })[]>;
  respondToInvitation(invitationId: number, userId: string, accept: boolean): Promise<void>;
  removeGroupMember(groupId: number, userId: string): Promise<void>;
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

  async sendMessage(senderId: string, receiverId: string, content: string, audioUrl?: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({
      senderId,
      receiverId,
      content,
      ...(audioUrl ? { audioUrl } : {}),
    }).returning();
    return msg;
  }

  async createCall(callerId: string, receiverId: string): Promise<CallSession> {
    await db.update(callSessions)
      .set({ status: "ended" })
      .where(and(
        or(eq(callSessions.callerId, callerId), eq(callSessions.receiverId, callerId)),
        eq(callSessions.status, "pending")
      ));
    const [session] = await db.insert(callSessions).values({ callerId, receiverId }).returning();
    return session;
  }

  async getCall(id: number): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    return session;
  }

  async getIncomingCall(userId: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions)
      .where(and(
        eq(callSessions.receiverId, userId),
        or(eq(callSessions.status, "pending"), eq(callSessions.status, "active"))
      ))
      .orderBy(desc(callSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateCall(id: number, updates: { status?: string; sdpOffer?: string; sdpAnswer?: string }): Promise<CallSession | undefined> {
    const [session] = await db.update(callSessions).set(updates).where(eq(callSessions.id, id)).returning();
    return session;
  }

  async addCandidates(id: number, role: "caller" | "receiver", candidates: string[]): Promise<void> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, id));
    if (!session) return;
    const existing = (role === "caller" ? session.callerCandidates : session.receiverCandidates) || [];
    const merged = [...existing, ...candidates];
    if (role === "caller") {
      await db.update(callSessions).set({ callerCandidates: merged }).where(eq(callSessions.id, id));
    } else {
      await db.update(callSessions).set({ receiverCandidates: merged }).where(eq(callSessions.id, id));
    }
  }

  async getWatchlist(userId: string): Promise<Coin[]> {
    const items = await db.select().from(watchlistItems)
      .where(eq(watchlistItems.userId, userId))
      .orderBy(desc(watchlistItems.createdAt));
    if (items.length === 0) return [];
    const coinIds = items.map(i => i.coinId);
    return await db.select().from(coins).where(inArray(coins.id, coinIds));
  }

  async isInWatchlist(userId: string, coinId: number): Promise<boolean> {
    const [item] = await db.select().from(watchlistItems)
      .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.coinId, coinId)));
    return !!item;
  }

  async toggleWatchlist(userId: string, coinId: number): Promise<{ added: boolean }> {
    const existing = await this.isInWatchlist(userId, coinId);
    if (existing) {
      await db.delete(watchlistItems)
        .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.coinId, coinId)));
      return { added: false };
    } else {
      await db.insert(watchlistItems).values({ userId, coinId });
      return { added: true };
    }
  }

  async createGroup(name: string, createdBy: string): Promise<Group> {
    const [group] = await db.insert(groups).values({ name, createdBy }).returning();
    await db.insert(groupMembers).values({ groupId: group.id, userId: createdBy, role: "admin" });
    return group;
  }

  async getGroupsForUser(userId: string): Promise<(Group & { memberCount: number })[]> {
    const memberships = await db.select().from(groupMembers).where(eq(groupMembers.userId, userId));
    if (memberships.length === 0) return [];
    const groupIds = memberships.map(m => m.groupId);
    const userGroups = await db.select().from(groups).where(inArray(groups.id, groupIds));
    const result: (Group & { memberCount: number })[] = [];
    for (const g of userGroups) {
      const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, g.id));
      result.push({ ...g, memberCount: members.length });
    }
    return result;
  }

  async getGroupById(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getGroupMembers(groupId: number): Promise<(GroupMember & { user: User })[]> {
    const members = await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
    if (members.length === 0) return [];
    const userIds = members.map(m => m.userId);
    const memberUsers = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
    const userMap = new Map(memberUsers.map(u => [u.id, u]));
    return members.map(m => {
      const user = userMap.get(m.userId);
      return user ? { ...m, user: safeUser(user) } : null;
    }).filter((m): m is (GroupMember & { user: User }) => m !== null);
  }

  async isGroupMember(groupId: number, userId: string): Promise<boolean> {
    const [member] = await db.select().from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return !!member;
  }

  async getGroupMessages(groupId: number): Promise<(GroupMessage & { sender: User })[]> {
    const msgs = await db.select().from(groupMessages)
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(groupMessages.createdAt);
    if (msgs.length === 0) return [];
    const senderIds = Array.from(new Set(msgs.map(m => m.senderId)));
    const senders = await db.select().from(usersTable).where(inArray(usersTable.id, senderIds));
    const senderMap = new Map(senders.map(u => [u.id, u]));
    return msgs.map(m => {
      const sender = senderMap.get(m.senderId);
      return sender ? { ...m, sender: safeUser(sender) } : null;
    }).filter((m): m is (GroupMessage & { sender: User }) => m !== null);
  }

  async sendGroupMessage(groupId: number, senderId: string, content: string): Promise<GroupMessage> {
    const [msg] = await db.insert(groupMessages).values({ groupId, senderId, content }).returning();
    return msg;
  }

  async createGroupInvitation(groupId: number, inviterId: string, inviteeId: string): Promise<GroupInvitation> {
    const [existing] = await db.select().from(groupInvitations)
      .where(and(
        eq(groupInvitations.groupId, groupId),
        eq(groupInvitations.inviteeId, inviteeId),
        eq(groupInvitations.status, "pending")
      ));
    if (existing) throw new Error("Invitation already pending");
    const [inv] = await db.insert(groupInvitations).values({ groupId, inviterId, inviteeId, status: "pending" }).returning();
    return inv;
  }

  async getPendingInvitations(userId: string): Promise<(GroupInvitation & { group: Group; inviter: User })[]> {
    const invs = await db.select().from(groupInvitations)
      .where(and(eq(groupInvitations.inviteeId, userId), eq(groupInvitations.status, "pending")));
    if (invs.length === 0) return [];
    const groupIds = Array.from(new Set(invs.map(i => i.groupId)));
    const inviterIds = Array.from(new Set(invs.map(i => i.inviterId)));
    const grps = await db.select().from(groups).where(inArray(groups.id, groupIds));
    const inviters = await db.select().from(usersTable).where(inArray(usersTable.id, inviterIds));
    const groupMap = new Map(grps.map(g => [g.id, g]));
    const inviterMap = new Map(inviters.map(u => [u.id, u]));
    return invs.map(i => {
      const g = groupMap.get(i.groupId);
      const inviter = inviterMap.get(i.inviterId);
      return (g && inviter) ? { ...i, group: g, inviter: safeUser(inviter) } : null;
    }).filter((i): i is (GroupInvitation & { group: Group; inviter: User }) => i !== null);
  }

  async respondToInvitation(invitationId: number, userId: string, accept: boolean): Promise<void> {
    const [inv] = await db.select().from(groupInvitations)
      .where(and(eq(groupInvitations.id, invitationId), eq(groupInvitations.inviteeId, userId)));
    if (!inv || inv.status !== "pending") return;
    await db.update(groupInvitations)
      .set({ status: accept ? "accepted" : "declined" })
      .where(eq(groupInvitations.id, invitationId));
    if (accept) {
      const alreadyMember = await this.isGroupMember(inv.groupId, userId);
      if (!alreadyMember) {
        await db.insert(groupMembers).values({ groupId: inv.groupId, userId, role: "member" });
      }
    }
  }

  async removeGroupMember(groupId: number, userId: string): Promise<void> {
    await db.delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getMarketPrice(numistaId: string): Promise<MarketPrice | undefined> {
    const [row] = await db.select().from(marketPrices).where(eq(marketPrices.numistaId, numistaId));
    return row;
  }

  async upsertMarketPrice(
    numistaId: string,
    coinTitle: string,
    listings: { price: number; currency: string; title: string; dateSold: string }[]
  ): Promise<MarketPrice> {
    const prices = listings.map(l => l.price).filter(p => p > 0);
    const avg = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : null;
    const currency = listings[0]?.currency ?? "USD";

    const [row] = await db
      .insert(marketPrices)
      .values({ numistaId, coinTitle, listings, avgPrice: avg, currency, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: marketPrices.numistaId,
        set: { coinTitle, listings, avgPrice: avg, currency, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    if (existing) return existing;
    const [created] = await db.insert(userSettings).values({ userId }).returning();
    return created;
  }

  async updateUserSettings(userId: string, updates: Partial<Omit<UserSettings, 'id' | 'userId' | 'updatedAt'>>): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    const [updated] = await db.update(userSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updated;
  }

  async getBlockedUsers(userId: string): Promise<(BlockedUser & { user: User })[]> {
    const blocks = await db.select().from(blockedUsers).where(eq(blockedUsers.userId, userId));
    if (blocks.length === 0) return [];
    const blockedIds = blocks.map(b => b.blockedUserId);
    const users = await db.select().from(usersTable).where(inArray(usersTable.id, blockedIds));
    const userMap = new Map(users.map(u => [u.id, u]));
    return blocks.map(b => {
      const user = userMap.get(b.blockedUserId);
      return user ? { ...b, user: safeUser(user) as User } : null;
    }).filter((b): b is (BlockedUser & { user: User }) => b !== null);
  }

  async blockUser(userId: string, blockedUserId: string): Promise<BlockedUser> {
    const [existing] = await db.select().from(blockedUsers)
      .where(and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId)));
    if (existing) return existing;
    const [block] = await db.insert(blockedUsers).values({ userId, blockedUserId }).returning();
    return block;
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await db.delete(blockedUsers)
      .where(and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId)));
  }

  async deleteAccount(userId: string): Promise<void> {
    await db.delete(blockedUsers).where(or(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, userId)));
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
    await db.delete(watchlistItems).where(eq(watchlistItems.userId, userId));
    await db.delete(coinLikes).where(eq(coinLikes.userId, userId));
    await db.delete(comments).where(eq(comments.userId, userId));
    await db.delete(messages).where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)));
    await db.delete(groupInvitations).where(or(eq(groupInvitations.inviterId, userId), eq(groupInvitations.inviteeId, userId)));
    await db.delete(groupMessages).where(eq(groupMessages.senderId, userId));
    await db.delete(groupMembers).where(eq(groupMembers.userId, userId));
    await db.delete(callSessions).where(or(eq(callSessions.callerId, userId), eq(callSessions.receiverId, userId)));
    await db.delete(coins).where(eq(coins.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) return false;
    if (user.password) {
      const isBcrypt = user.password.startsWith("$2");
      const isValid = isBcrypt
        ? await bcrypt.compare(currentPassword, user.password)
        : currentPassword === user.password;
      if (!isValid) return false;
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));
    return true;
  }

}

export const storage = new DatabaseStorage();
