import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./replit_integrations/auth";
import { setupWebSocket } from "./websocket";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const httpServer = createServer(app);

// Pre-startup validation logging
const requiredEnvVars = ['SESSION_SECRET', 'DATABASE_URL'] as const;
for (const envVar of requiredEnvVars) {
  if (process.env[envVar]) {
    console.log(`[startup] ${envVar} is set`);
  } else {
    console.error(`[startup] ${envVar} is MISSING`);
  }
}

// Secure Session Secret Check
const sessionSecret = process.env.SESSION_SECRET || (() => {
  console.error('SESSION_SECRET is not set — exiting');
  process.exit(1);
})();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Health check for Replit deployment agent
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "public", "uploads")),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });
  next();
});

(async () => {
  await setupAuth(app);
  setupWebSocket(httpServer);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const PORT = Number(process.env.PORT) || 8000;

  httpServer.listen(PORT, "0.0.0.0", () => {
    log(`Server is active on port ${PORT}`);
  });
})().catch((err) => {
  console.error("[startup] Fatal error during server initialization:", err);
  process.exit(1);
});