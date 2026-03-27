import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { api } from "@shared/routes";
import { z } from "zod";
import { searchNumista, getNumistaCoin } from "./numista";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

  // Delete coin
  app.delete(api.coins.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(404).json({ message: "Invalid ID" });
      const deleted = await storage.deleteCoin(id, req.user.claims.sub);
      if (!deleted) return res.status(403).json({ message: "Not authorized or coin not found" });
      res.status(200).json({ message: "Coin deleted" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Users - search must be BEFORE :id route
  app.get(api.users.search.path, async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      const users = await storage.searchUsers(q);
      res.status(200).json(users);
    } catch (err) {
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

  // Numista API Proxy (search)
  app.get("/api/numista/search", async (req, res) => {
    try {
      const q = (req.query.q as string) || "";
      if (!q.trim()) return res.status(200).json([]);
      const results = await searchNumista(q);
      res.status(200).json(results);
    } catch (err) {
      console.error("Numista search error:", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Numista API Proxy (single coin detail)
  app.get("/api/numista/types/:id", async (req, res) => {
    try {
      const coin = await getNumistaCoin(req.params.id);
      if (!coin) return res.status(404).json({ message: "Not found" });
      res.status(200).json(coin);
    } catch (err) {
      console.error("Numista detail error:", err);
      res.status(500).json({ message: "Failed to fetch coin details" });
    }
  });

  // Watchlist routes (auth required)
  app.get("/api/watchlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coins = await storage.getWatchlist(userId);
      res.json(coins);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.get("/api/watchlist/:coinId/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coinId = parseInt(req.params.coinId);
      const inWatchlist = await storage.isInWatchlist(userId, coinId);
      res.json({ inWatchlist });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.post("/api/watchlist/:coinId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const coinId = parseInt(req.params.coinId);
      const result = await storage.toggleWatchlist(userId, coinId);
      res.json(result);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  // AI Coin Expert Chatbot (streaming)
  app.post("/api/chatbot", async (req, res) => {
    try {
      const { messages: history } = req.body as {
        messages: { role: "user" | "assistant"; content: string }[];
      };
      if (!Array.isArray(history) || history.length === 0) {
        return res.status(400).json({ message: "Messages are required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        stream: true,
        max_completion_tokens: 1024,
        messages: [
          {
            role: "system",
            content: `You are "Numis", the Royal Museum's resident AI coin expert for Coinaty — a social network for numismatists and coin collectors. You are knowledgeable, passionate, and approachable.

Your expertise covers:
- Coin grading standards (Sheldon scale, PCGS/NGC grading)
- World numismatics: ancient, medieval, Ottoman, Egyptian kingdom, and modern coins
- Authentication and identifying counterfeit coins
- Coin valuation, market trends, and investment insights
- Metal composition analysis (gold, silver, bronze, copper)
- Historical context for coins from different eras and empires
- Coin care, storage, and preservation best practices
- Numista catalog references and how to catalog coins
- Notable mints and their marks

Keep responses concise and engaging. Use bullet points for clarity when listing multiple items. Always be helpful and encourage exploration of the hobby. If asked about specific coins, share interesting historical facts.`,
          },
          ...history,
        ],
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error("Chatbot error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI response failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Chatbot unavailable" });
      }
    }
  });

  return httpServer;
}
