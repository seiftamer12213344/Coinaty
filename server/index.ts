import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes';
import { serveStatic } from './static';
import { setupAuth } from './replit_integrations/auth';
// import { setupWebSocket } from './websocket';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

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
if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is not set — exiting');
  process.exit(1);
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.status(200).send('ok');
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
  '/uploads',
  express.static(path.join(__dirname, '..', 'public', 'uploads')),
);

export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith('/api')) {
      log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Initialize and export the app
async function initializeApp() {
  await setupAuth(app);
  // WebSockets are not supported in standard Vercel serverless functions.
  // setupWebSocket(httpServer);
  
  // Note: Assuming registerRoutes can work without a direct httpServer instance.
  // If it needs one, this part might need further refactoring.
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    console.error('Internal Server Error:', err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  // This will handle serving the frontend's static files
  serveStatic(app);

  return app;
}

// Vercel will await this promise and use the resolved app
export default initializeApp();
