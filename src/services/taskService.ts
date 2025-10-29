// src/services/taskService.ts
import { v4 as uuidv4 } from "uuid";
import { Database } from "../db/database";

export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
};

export class TaskService {
  constructor(private db: Database) {}

  private nowIso() {
    return new Date().toISOString();
  }

  async getAll(includeDeleted = false): Promise<Task[]> {
    const sql = includeDeleted
      ? "SELECT * FROM tasks"
      : "SELECT * FROM tasks WHERE is_deleted = 0";
    const rows = await this.db.all(sql);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      completed: !!r.completed,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deleted: !!r.is_deleted,
    }));
  }

  async getById(id: string): Promise<Task | null> {
    const row = await this.db.get("SELECT * FROM tasks WHERE id = ?", [id]);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: !!row.completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deleted: !!row.is_deleted,
    };
  }

  async create(payload: Partial<Task> & { title: string }): Promise<Task> {
    const now = this.nowIso();
    const id = uuidv4();
    await this.db.run(
      `INSERT INTO tasks (id, title, description, completed, created_at, updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [id, payload.title, payload.description ?? "", payload.completed ? 1 : 0, now, now]
    );
    return this.getById(id) as Promise<Task>;
  }

  async update(id: string, patch: Partial<Task>): Promise<Task | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updatedAt = this.nowIso();
    await this.db.run(
      `UPDATE tasks
       SET title = ?, description = ?, completed = ?, updated_at = ?, is_deleted = ?
       WHERE id = ?`,
      [
        patch.title ?? existing.title,
        patch.description ?? existing.description,
        patch.completed ?? existing.completed,
        updatedAt,
        patch.deleted ? 1 : 0,
        id,
      ]
    );
    return this.getById(id);
  }

  async delete(id: string): Promise<Task | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    await this.db.run(`UPDATE tasks SET is_deleted = 1, updated_at = ? WHERE id = ?`, [
      this.nowIso(),
      id,
    ]);
    return this.getById(id);
  }

  async applyRemote(task: Task): Promise<{ applied: boolean; resultingTask: Task }> {
    const existing = await this.getById(task.id);
    if (!existing) {
      await this.db.run(
        `INSERT INTO tasks (id, title, description, completed, created_at, updated_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.title,
          task.description ?? "",
          task.completed ? 1 : 0,
          task.createdAt,
          task.updatedAt,
          task.deleted ? 1 : 0,
        ]
      );
      return { applied: true, resultingTask: task };
    }

    if (task.updatedAt > existing.updatedAt) {
      await this.update(task.id, task);
      const updated = await this.getById(task.id);
      return { applied: true, resultingTask: updated! };
    }

    return { applied: false, resultingTask: existing };
  }
}
