import { Router, Request, Response } from "express";
import { Database } from "../db/database";
import { TaskService } from "../services/taskService";

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);

  // 🟢 Get all tasks
  router.get("/", async (_req: Request, res: Response) => {
    const tasks = await taskService.getAll();
    return res.json(tasks);
  });

  // 🟢 Get task by ID
  router.get("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const task = await taskService.getById(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json(task);
  });

  // 🟢 Create task
  router.post("/", async (req: Request, res: Response) => {
    const task = await taskService.create(req.body);
    return res.status(201).json(task);
  });

  // 🟢 Update task
  router.put("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await taskService.update(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json(updated);
  });

  // 🟢 Soft delete task
  router.delete("/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await taskService.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }
    return res.json({ message: "Task deleted", task: deleted });
  });

  return router;
}
