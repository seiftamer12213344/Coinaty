import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
  // Go up from the current directory (either 'server' in dev or 'dist' in prod)
  // and then into the 'dist/public' directory where the client build is.
  const distPath = path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `[startup] Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
    process.exit(1);
  }

  app.use(express.static(distPath));

  // Fall through to index.html for client-side routing
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
