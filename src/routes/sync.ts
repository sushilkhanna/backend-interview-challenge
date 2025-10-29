import { Router, Request, Response } from "express";
import { Database } from "../db/database";
import { TaskService } from "../services/taskService";
import { SyncService } from "../services/syncService";

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(taskService);

  router.post("/", async (req: Request, res: Response) => {
    const items = req.body;
    const result = await syncService.processClientBatch(items);
    res.json(result);
  });

  return router;
}
