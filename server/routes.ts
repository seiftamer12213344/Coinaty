import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register auth routes first
  registerAuthRoutes(app);

  // Coins
  app.get(api.coins.list.path, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const userId = req.query.userId as string | undefined;
      const coins = await storage.getCoins(category, userId);
      res.status(200).json(coins);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.coins.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const coin = await storage.getCoin(id);
      if (!coin) return res.status(404).json({ message: "Coin not found" });
      res.status(200).json(coin);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.coins.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.coins.create.input.parse(req.body);
      const coin = await storage.createCoin(input, req.user.claims.sub);
      res.status(201).json(coin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.coins.toggleLike.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const result = await storage.toggleLike(id, req.user.claims.sub);
      res.status(200).json({ likesCount: result.count, likedByMe: result.liked });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.coins.getLikes.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const users = await storage.getUsersWhoLikedCoin(id);
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Comments
  app.get(api.comments.list.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const comments = await storage.getComments(id);
      res.status(200).json(comments);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.comments.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const input = api.comments.create.input.parse(req.body);
      const comment = await storage.createComment(id, req.user.claims.sub, input.content);
      res.status(201).json(comment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Users
  app.get(api.users.getProfile.path, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.users.updateProfile.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.users.updateProfile.input.parse(req.body);
      const user = await storage.updateUserProfile(req.user.claims.sub, input);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.users.leaderboard.path, async (req, res) => {
    try {
      const users = await storage.getLeaderboard();
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Messages
  app.get(api.messages.getConversations.path, isAuthenticated, async (req: any, res) => {
    try {
      const convos = await storage.getConversations(req.user.claims.sub);
      res.status(200).json(convos);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.messages.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getMessages(req.user.claims.sub, req.params.userId);
      res.status(200).json(messages);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.messages.send.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.messages.send.input.parse(req.body);
      const message = await storage.sendMessage(req.user.claims.sub, req.params.userId, input.content);
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed data
  app.post("/api/seed", async (req, res) => {
    try {
      const existingCoins = await storage.getCoins();
      if (existingCoins.length === 0) {
        // Create a fake system user
        const systemUser = await storage.upsertUser({
          id: "system-user-001",
          email: "museum@coinaty.com",
          firstName: "The",
          lastName: "Curator",
          displayName: "Museum Curator",
        });

        await storage.createCoin({
          title: "Gold Dinar of Abd al-Malik",
          description: "An incredibly rare gold dinar from the Umayyad Caliphate, dating back to 695 AD. This coin marks a significant period of Islamic numismatics.",
          category: "Islamic",
          photoUrl: "https://images.unsplash.com/photo-1621516016757-550ff9cc2561?auto=format&fit=crop&q=80&w=800",
          metalType: "Gold",
        }, systemUser.id);

        await storage.createCoin({
          title: "Alexander the Great Tetradrachm",
          description: "A beautiful silver tetradrachm depicting Heracles on the obverse and Zeus on the reverse. Minted during the lifetime of Alexander the Great.",
          category: "Ancient Greek",
          photoUrl: "https://images.unsplash.com/photo-1626279930739-2ce13175c59f?auto=format&fit=crop&q=80&w=800",
          metalType: "Silver",
        }, systemUser.id);
        
        await storage.createCoin({
          title: "1933 Saint-Gaudens Double Eagle",
          description: "One of the most valuable and famous coins in the world. Most were melted down, making this a true legendary piece.",
          category: "Modern US",
          photoUrl: "https://images.unsplash.com/photo-1549419145-21d743a6d9ed?auto=format&fit=crop&q=80&w=800",
          metalType: "Gold",
        }, systemUser.id);
      }
      res.status(200).json({ message: "Seed successful" });
    } catch (err) {
      console.error("Seed error:", err);
      res.status(500).json({ message: "Seed failed" });
    }
  });

  return httpServer;
}
