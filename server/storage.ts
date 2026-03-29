import { coins, coinLikes, comments, messages, users as usersTable, watchlistItems, groups, groupMembers, groupMessages, groupInvitations, vaultFolders, vaultFolderCoins, type User, type Coin, type CoinLike, type Comment, type Message, type WatchlistItem, type Group, type GroupMember, type GroupMessage, type GroupInvitation, type InsertCoin, type VaultFolder } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, inArray, sql, ilike } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth";

function safeUser(u: User): Omit<User, "email"> {
  const { email, ...safe } = u;
  return safe;
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
  sendMessage(senderId: string, receiverId: string, content: string): Promise<Message>;

  // Watchlist
  getWatchlist(userId: string): Promise<Coin[]>;
  isInWatchlist(userId: string, coinId: number): Promise<boolean>;
  toggleWatchlist(userId: string, coinId: number): Promise<{ added: boolean }>;

  // Vault Folders
  getFolders(userId: string): Promise<(VaultFolder & { coinCount: number })[]>;
  createFolder(userId: string, name: string): Promise<VaultFolder>;
  renameFolder(id: number, userId: string, name: string): Promise<VaultFolder | undefined>;
  deleteFolder(id: number, userId: string): Promise<boolean>;
  getFolderCoins(folderId: number): Promise<Coin[]>;
  addCoinToFolder(folderId: number, coinId: number, userId: string): Promise<boolean>;
  removeCoinFromFolder(folderId: number, coinId: number, userId: string): Promise<boolean>;
  getCoinFolders(coinId: number, userId: string): Promise<VaultFolder[]>;

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

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({
      senderId,
      receiverId,
      content
    }).returning();
    return msg;
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
    return members.map(m => ({ ...m, user: safeUser(userMap.get(m.userId)!) })).filter(m => m.user);
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
    const senderIds = [...new Set(msgs.map(m => m.senderId))];
    const senders = await db.select().from(usersTable).where(inArray(usersTable.id, senderIds));
    const senderMap = new Map(senders.map(u => [u.id, u]));
    return msgs.map(m => ({ ...m, sender: safeUser(senderMap.get(m.senderId)!) })).filter(m => m.sender);
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
    const groupIds = [...new Set(invs.map(i => i.groupId))];
    const inviterIds = [...new Set(invs.map(i => i.inviterId))];
    const grps = await db.select().from(groups).where(inArray(groups.id, groupIds));
    const inviters = await db.select().from(usersTable).where(inArray(usersTable.id, inviterIds));
    const groupMap = new Map(grps.map(g => [g.id, g]));
    const inviterMap = new Map(inviters.map(u => [u.id, u]));
    return invs.map(i => ({ ...i, group: groupMap.get(i.groupId)!, inviter: safeUser(inviterMap.get(i.inviterId)!) })).filter(i => i.group && i.inviter);
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

  // Vault Folders
  async getFolders(userId: string): Promise<(VaultFolder & { coinCount: number })[]> {
    const folders = await db.select().from(vaultFolders)
      .where(eq(vaultFolders.userId, userId))
      .orderBy(vaultFolders.createdAt);
    const result = await Promise.all(folders.map(async (f) => {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
        .from(vaultFolderCoins).where(eq(vaultFolderCoins.folderId, f.id));
      return { ...f, coinCount: count };
    }));
    return result;
  }

  async createFolder(userId: string, name: string): Promise<VaultFolder> {
    const [folder] = await db.insert(vaultFolders).values({ userId, name }).returning();
    return folder;
  }

  async renameFolder(id: number, userId: string, name: string): Promise<VaultFolder | undefined> {
    const [folder] = await db.update(vaultFolders)
      .set({ name })
      .where(and(eq(vaultFolders.id, id), eq(vaultFolders.userId, userId)))
      .returning();
    return folder;
  }

  async deleteFolder(id: number, userId: string): Promise<boolean> {
    await db.delete(vaultFolderCoins).where(eq(vaultFolderCoins.folderId, id));
    const result = await db.delete(vaultFolders)
      .where(and(eq(vaultFolders.id, id), eq(vaultFolders.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getFolderCoins(folderId: number): Promise<Coin[]> {
    const rows = await db.select({ coin: coins })
      .from(vaultFolderCoins)
      .innerJoin(coins, eq(vaultFolderCoins.coinId, coins.id))
      .where(eq(vaultFolderCoins.folderId, folderId))
      .orderBy(desc(vaultFolderCoins.addedAt));
    return rows.map(r => r.coin);
  }

  async addCoinToFolder(folderId: number, coinId: number, userId: string): Promise<boolean> {
    const [folder] = await db.select().from(vaultFolders)
      .where(and(eq(vaultFolders.id, folderId), eq(vaultFolders.userId, userId)));
    if (!folder) return false;
    const [existing] = await db.select().from(vaultFolderCoins)
      .where(and(eq(vaultFolderCoins.folderId, folderId), eq(vaultFolderCoins.coinId, coinId)));
    if (existing) return true;
    await db.insert(vaultFolderCoins).values({ folderId, coinId });
    return true;
  }

  async removeCoinFromFolder(folderId: number, coinId: number, userId: string): Promise<boolean> {
    const [folder] = await db.select().from(vaultFolders)
      .where(and(eq(vaultFolders.id, folderId), eq(vaultFolders.userId, userId)));
    if (!folder) return false;
    await db.delete(vaultFolderCoins)
      .where(and(eq(vaultFolderCoins.folderId, folderId), eq(vaultFolderCoins.coinId, coinId)));
    return true;
  }

  async getCoinFolders(coinId: number, userId: string): Promise<VaultFolder[]> {
    const rows = await db.select({ folder: vaultFolders })
      .from(vaultFolderCoins)
      .innerJoin(vaultFolders, eq(vaultFolderCoins.folderId, vaultFolders.id))
      .where(and(eq(vaultFolderCoins.coinId, coinId), eq(vaultFolders.userId, userId)));
    return rows.map(r => r.folder);
  }
}

export const storage = new DatabaseStorage();
