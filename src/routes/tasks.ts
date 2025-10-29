import { Router } from 'express';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);

  // Create task
  router.post('/', async (req, res) => {
    try {
      const task = await taskService.create(req.body);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all tasks
  router.get('/', async (req, res) => {
    try {
      const tasks = await taskService.getAll();
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update task
  router.put('/:id', async (req, res) => {
    try {
      const updated = await taskService.update(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete task
  router.delete('/:id', async (req, res) => {
    try {
      await taskService.delete(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
