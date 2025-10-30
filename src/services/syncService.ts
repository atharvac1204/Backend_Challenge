import axios from 'axios';
import { Task, SyncQueueItem, SyncResult, BatchSyncRequest, BatchSyncResponse } from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';

export class SyncService {
  private apiUrl: string;
  private batchSize: number;
  private maxRetries: number;
  
  constructor(
    private db: Database,
    private taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.apiUrl = apiUrl;
    this.batchSize = Number(process.env.SYNC_BATCH_SIZE) || 10;
     this.maxRetries = Number(process.env.SYNC_MAX_RETRIES) || 3;
  }

  async sync(): Promise<SyncResult> {
    // TODO: Main sync orchestration method
    // 1. Get all items from sync queue
    // 2. Group items by batch (use SYNC_BATCH_SIZE from env)
    // 3. Process each batch
    // 4. Handle success/failure for each item
    // 5. Update sync status in database
    // 6. Return sync result summary

    const result: SyncResult = {
    success: false,
    total: 0,
    synced_items: 0,
    failed_items: 0,
    errors: [],
  };

  // fetch queued items
  const items = await this.db.all<SyncQueueItem>(
    `SELECT * FROM sync_queue ORDER BY created_at ASC`
  );

  if (!items || items.length === 0) {
    result.success = true; // nothing to do => success
    return result;
  }

  result.total = items.length;

  // process in batches
  for (let i = 0; i < items.length; i += this.batchSize) {
    const batch = items.slice(i, i + this.batchSize);

    try {
      const batchResp = await this.processBatch(batch); // assume returns BatchSyncResponse

      // For each item result coming back from processBatch
      for (const r of batchResp.processed_items) {
        if (r.status === 'success') {
          result.synced_items += 1;
          // update DB sync status for this task (use server_id if provided)
          await this.updateSyncStatus(r.client_id, 'synced', r.resolved_data);
        } else if (r.status === 'conflict') {
          result.failed_items += 1;
          // optionally resolve conflict here (call resolveConflict)
          // await this.resolveConflict(local, r.resolved_data!);
          result.errors.push({
            task_id: r.client_id,
            operation: 'conflict',
            error: 'Conflict encountered and returned by server',
            timestamp: new Date(),
          });
        } else {
          // 'error'
          result.failed_items += 1;
          result.errors.push({
            task_id: r.client_id,
            operation: 'error',
            error: r.error || 'Unknown error',
            timestamp: new Date(),
          });

          // find the original queue item to increment retry etc
          const queueItem = batch.find(b => b.task_id === r.client_id);
          if (queueItem) {
            await this.handleSyncError(queueItem, new Error(r.error || 'Sync error'));
          }
        }
      }
    } catch (err) {
      // batch-level failure — mark all items in batch as failed (with retry)
      for (const item of batch) {
        result.failed_items += 1;
        result.errors.push({
          task_id: item.task_id,
          operation: item.operation,
          error: (err instanceof Error ? err.message : String(err)),
          timestamp: new Date(),
        });
        await this.handleSyncError(item, err as Error);
      }
    }
  }

  // success if no failures
  result.success = result.failed_items === 0;

  return result;

    

    //throw new Error('Not implemented');
  }

  async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
    // TODO: Add operation to sync queue
    // 1. Create sync queue item
    // 2. Store serialized task data
    // 3. Insert into sync_queue table

    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      task_id: taskId,
      operation,
      data: JSON.stringify(data),
      status: 'pending',
      retry_count: 0,
      last_error: null,
      created_at: new Date().toISOString(),
    };

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data, status, retries, last_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.task_id, item.operation, item.data, item.status, item.retry_count, item.last_error, item.created_at]
    );

    



    //throw new Error('Not implemented');
  }

  private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
    // TODO: Process a batch of sync items
    // 1. Prepare batch request
    // 2. Send to server
    // 3. Handle response
    // 4. Apply conflict resolution if needed

    const requestBody: BatchSyncRequest = {
    items,
    client_timestamp: new Date(),
  };

  try {
    // 2. Send to server
    const response = await axios.post<BatchSyncResponse>(
      `${this.apiUrl}/sync/batch`,
      requestBody
    );

    // 3. Handle response
    const { processed_items } = response.data;

    // 4. Apply conflict resolution if needed
    for (const item of processed_items) {
      if (item.status === 'conflict' && item.resolved_data) {
        const localTask = await this.db.get<Task>('SELECT * FROM tasks WHERE id = ?', [
          item.client_id,
        ]);

        if (!localTask) {
            console.warn(`Local task not found for ID ${item.client_id}, skipping conflict resolution.`);
            continue; // Skip this item
        }

        const resolvedTask = await this.resolveConflict(localTask, item.resolved_data);
        await this.updateSyncStatus(item.client_id, 'synced', resolvedTask);
      } else if (item.status === 'success') {
        await this.updateSyncStatus(item.client_id, 'synced');
      } else if (item.status === 'error') {
        await this.handleSyncError(
          items.find((i) => i.id === item.client_id)!,
          new Error(item.error || 'Unknown error')
        );
      }
    }

    return response.data;
  } catch (error: any) {
    console.error('Batch sync failed:', error);
    for (const item of items) {
      await this.handleSyncError(item, error);
    }

    // Return a failed batch response
    return {
      processed_items: items.map((item) => ({
        client_id: item.id,
        server_id: '',
        status: 'error',
        error: error.message || 'Network error',
      })),
    };
  }



    //throw new Error('Not implemented');
  }

  private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    // TODO: Implement last-write-wins conflict resolution
    // 1. Compare updated_at timestamps
    // 2. Return the more recent version
    // 3. Log conflict resolution decision

    const localUpdatedAt = new Date(localTask.updated_at).getTime();
  const serverUpdatedAt = new Date(serverTask.updated_at).getTime();

  const resolved =
    localUpdatedAt > serverUpdatedAt ? localTask : { ...localTask, ...serverTask };

  console.log(
    `Conflict resolved for task ${localTask.id}: using ${
      localUpdatedAt > serverUpdatedAt ? 'local' : 'server'
    } version`
  );

  await this.db.run(
    `UPDATE tasks 
     SET title = ?, description = ?, completed = ?, updated_at = ?, sync_status = ?
     WHERE id = ?`,
    [
      resolved.title,
      resolved.description,
      resolved.completed ? 1 : 0,
      resolved.updated_at,
      'synced',
      resolved.id,
    ]
  );

  return resolved;










    //throw new Error('Not implemented');
  }

  private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
    // TODO: Update task sync status
    // 1. Update sync_status field
    // 2. Update server_id if provided
    // 3. Update last_synced_at timestamp
    // 4. Remove from sync queue if successful

    const now = new Date().toISOString();

  // 1. Update the local task’s sync status and timestamps
  if (status === 'synced') {
    await this.db.run(
      `UPDATE tasks
       SET sync_status = ?, last_synced_at = ?, server_id = COALESCE(?, server_id)
       WHERE id = ?`,
      [status, now, serverData?.server_id || null, taskId]
    );

    // 2. Remove item from sync_queue
    await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
  } else {
    // If error, just mark it
    await this.db.run(
      `UPDATE tasks
       SET sync_status = ?
       WHERE id = ?`,
      [status, taskId]
    );
  }








    //throw new Error('Not implemented');
  }

  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    // TODO: Handle sync errors
    // 1. Increment retry count
    // 2. Store error message
    // 3. If retry count exceeds limit, mark as permanent failure
    
    const maxRetries = 3;
  const newRetryCount = item.retry_count + 1;

  if (newRetryCount >= maxRetries) {
    console.warn(`Permanent failure for ${item.task_id}: ${error.message}`);
    await this.db.run(
      `UPDATE sync_queue 
       SET error_message = ?, retry_count = ?, 
           operation = 'error' 
       WHERE id = ?`,
      [error.message, newRetryCount, item.id]
    );
  } else {
    console.warn(`Retrying sync for ${item.task_id}, attempt ${newRetryCount}`);
    await this.db.run(
      `UPDATE sync_queue 
       SET error_message = ?, retry_count = ? 
       WHERE id = ?`,
      [error.message, newRetryCount, item.id]
    );
  }




    //throw new Error('Not implemented');
  }

  async checkConnectivity(): Promise<boolean> {
    // TODO: Check if server is reachable
    // 1. Make a simple health check request
    // 2. Return true if successful, false otherwise

    try {
    const response = await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });

    // Verify the response status
    if (response.status === 200) {
      console.log('✅ Server is reachable.');
      return true;
    } else {
      console.warn(`⚠️ Health check returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(
      '❌ Connectivity check failed:',
      error instanceof Error ? error.message : error
    );
    return false;

    
  }
  }

}