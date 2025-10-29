// src/services/syncService.ts
import { TaskService, Task } from "./taskService";

export type SyncOperationType = "create" | "update" | "delete";

export type SyncQueueItem = {
  op: SyncOperationType;
  task: Task;
};

export type SyncResultItem = {
  op: SyncOperationType;
  id: string;
  applied: boolean;
  serverTask?: Task;
  reason?: string;
};

export class SyncService {
  constructor(private taskService: TaskService) {}

  /**
   * Process a batch of client changes using LWW (Last-Writer-Wins)
   *
   * Client sends an array of SyncQueueItem.
   *
   * For each item:
   * - If op=create and the server has no record -> create
   * - If op=create but server has an existing id -> applyRemote (LWW)
   * - If op=update -> applyRemote (LWW)
   * - If op=delete -> treat as tombstone with updatedAt; applyRemote (LWW)
   *
   * Returns: results array + server state snapshot
   */
  async processClientBatch(items: SyncQueueItem[]): Promise<{ results: SyncResultItem[]; serverState: Task[] }> {
    const results: SyncResultItem[] = [];

    for (const item of items) {
      try {
        const t = item.task;
        if (!t || !t.id) {
          results.push({
            op: item.op,
            id: t?.id ?? "unknown",
            applied: false,
            reason: "invalid_task",
          });
          continue;
        }

        switch (item.op) {
          case "create": {
            // If server doesn't have it, create a new server task (but keep client's id)
            const existing = await this.taskService.getById(t.id);
            if (!existing) {
              // create using client's timestamp
              await this.taskService.applyRemote(t);
              results.push({ op: "create", id: t.id, applied: true, serverTask: t });
            } else {
              // existing: do LWW resolution
              const sr = await this.taskService.applyRemote(t);
              results.push({ op: "create", id: t.id, applied: sr.applied, serverTask: sr.resultingTask });
            }
            break;
          }
          case "update": {
            // LWW via applyRemote
            const sr = await this.taskService.applyRemote(t);
            results.push({ op: "update", id: t.id, applied: sr.applied, serverTask: sr.resultingTask });
            break;
          }
          case "delete": {
            // Convert to tombstone if needed and applyRemote
            const tombstone: Task = { ...t, deleted: true };
            const sr = await this.taskService.applyRemote(tombstone);
            results.push({ op: "delete", id: t.id, applied: sr.applied, serverTask: sr.resultingTask });
            break;
          }
          default: {
            results.push({ op: item.op, id: t.id, applied: false, reason: "unsupported_op" });
            break;
          }
        }
      } catch (err: any) {
        results.push({
          op: item.op,
          id: item.task?.id ?? "unknown",
          applied: false,
          reason: `exception:${err?.message ?? String(err)}`,
        });
      }
    }

    const serverState = await this.taskService.getAll(false);

    return { results, serverState };
  }

  // Helper to get server snapshot
  async getServerSnapshot(): Promise<Task[]> {
    return this.taskService.getAll(false);
  }
}
