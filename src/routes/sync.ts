import { Router, Request, Response } from "express";
import { SyncService } from "../services/syncService";
import { TaskService } from "../services/taskService";
import { Database } from "../db/database";

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(taskService);

  // 🔹 POST /sync → process client changes
  router.post("/", async (req: Request, res: Response) => {
    try {
      const clientChanges = req.body;
      if (!Array.isArray(clientChanges)) {
        return res.status(400).json({ error: "Expected an array of sync items" });
      }

      const result = await syncService.processClientBatch(clientChanges);
      res.json(result);
    } catch (err: any) {
      console.error("Sync error:", err);
      res.status(500).json({ error: err.message || "Sync failed" });
    }
  });

  // 🔹 GET /sync/snapshot → get server snapshot
  router.get("/snapshot", async (_req: Request, res: Response) => {
    try {
      const snapshot = await syncService.getServerSnapshot();
      res.json({ serverState: snapshot });
    } catch (err: any) {
      console.error("Snapshot error:", err);
      res.status(500).json({ error: err.message || "Snapshot failed" });
    }
  });

  return router;
}
