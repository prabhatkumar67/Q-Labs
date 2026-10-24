/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dbPath =
  process.env.NODE_ENV === "production"
    ? "/app/data/store.db"
    : path.join(process.cwd(), "data", "store.db");

if (!fs.existsSync(dbPath)) {
  console.log("No database found, running seed script...");
  execSync(`npx tsx src/lib/seed.ts`, {
    stdio: "inherit",
    env: { ...process.env },
  });
} else {
  console.log("Database exists, skipping seed.");
}
