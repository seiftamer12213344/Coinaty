import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims ? req.user.claims.sub : req.user.userId;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password: rawPassword, firstName, lastName } = req.body;
      if (!email || !rawPassword || !firstName) {
        return res.status(400).json({ message: "Email, password, and first name are required" });
      }
      if (rawPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || null,
        displayName: `${firstName}${lastName ? ' ' + lastName : ''}`,
      }).returning();

      (req.session as any).localUser = { userId: newUser.id };
      const { password, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password: rawPassword } = req.body;
      if (!email || !rawPassword) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(rawPassword, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).localUser = { userId: user.id };
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/local-logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });
}
