import express from "express";
import { Database } from "./db/database";
import { createTaskRouter } from "./routes/tasks";
import { createSyncRouter } from "./routes/sync";

const app = express();
app.use(express.json());

const db = new Database();

app.use("/tasks", createTaskRouter(db));
app.use("/sync", createSyncRouter(db));

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
