// src/server.ts
import express from "express";
import { Database } from "./db/database";
import { createTaskRouter } from "./routes/tasks";
import { createSyncRouter } from "./routes/sync";

const app = express();
app.use(express.json());

// Initialize database
const db = new Database("tasks.db");
db.initialize().then(() => console.log("📦 SQLite DB ready"));

// ✅ Add this route to fix "Cannot GET /"
app.get("/", (_req, res) => {
  res.send("✅ Backend API is live! Use /tasks or /sync endpoints.");
});

// Pass db to routes
app.use("/tasks", createTaskRouter(db));
app.use("/sync", createSyncRouter(db));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
