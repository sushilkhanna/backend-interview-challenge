// src/services/taskService.ts
import { v4 as uuidv4 } from "uuid";

export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO - used by LWW
  // optional tombstone marker for deletes if needed
  deleted?: boolean;
};

export class TaskService {
  private tasks: Map<string, Task> = new Map();

  constructor(initialTasks?: Task[]) {
    if (initialTasks && initialTasks.length) {
      for (const t of initialTasks) this.tasks.set(t.id, t);
    }
  }

  private nowIso() {
    return new Date().toISOString();
  }

  async getAll(includeDeleted = false): Promise<Task[]> {
    const out = Array.from(this.tasks.values()).filter(t => includeDeleted ? true : !t.deleted);
    // sort by updatedAt desc
    out.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
    return out;
  }

  async getById(id: string): Promise<Task | null> {
    const t = this.tasks.get(id) ?? null;
    if (t && t.deleted) return null;
    return t;
  }

  async create(payload: Partial<Task> & { title: string }): Promise<Task> {
    const now = this.nowIso();
    const newTask: Task = {
      id: uuidv4(),
      title: payload.title,
      description: payload.description ?? "",
      completed: !!payload.completed,
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async update(id: string, patch: Partial<Task> & { updatedAt?: string }): Promise<Task | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    // Respect provided updatedAt if client provides, otherwise set now
    const incomingUpdatedAt = patch.updatedAt ?? this.nowIso();

    // Apply fields (but do not override id/createdAt)
    const updated: Task = {
      ...existing,
      title: patch.title ?? existing.title,
      description: patch.description ?? existing.description,
      completed: typeof patch.completed === "boolean" ? patch.completed : existing.completed,
      updatedAt: incomingUpdatedAt,
      deleted: patch.deleted ?? existing.deleted,
    };

    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string, opts?: { updatedAt?: string }): Promise<Task | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updatedAt = opts?.updatedAt ?? this.nowIso();
    const tombstone: Task = {
      ...existing,
      deleted: true,
      updatedAt,
    };
    this.tasks.set(id, tombstone);
    return tombstone;
  }

  // Apply a remote/other-source task (used by syncService). Uses LWW: choose newest updatedAt.
  // Returns {applied: boolean, resultingTask}
  async applyRemote(task: Task): Promise<{ applied: boolean; resultingTask: Task }> {
    const id = task.id;
    const existing = this.tasks.get(id);
    if (!existing) {
      // No local copy -> accept remote
      this.tasks.set(id, task);
      return { applied: true, resultingTask: task };
    }

    // Compare updatedAt strings (ISO lexicographic comparison works for ISO)
    if (task.updatedAt > existing.updatedAt) {
      // remote wins (LWW)
      this.tasks.set(id, task);
      return { applied: true, resultingTask: task };
    } else {
      // local wins: keep local state
      return { applied: false, resultingTask: existing };
    }
  }
}
