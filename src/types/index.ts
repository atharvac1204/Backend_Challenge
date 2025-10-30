export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  data?: string;
  created_at: Date | string;
  updated_at: Date | string;
  is_deleted: boolean;
  sync_status?: 'pending' | 'synced' | 'error';
  server_id?: string;
  last_synced_at?: Date | string;
}

export interface SyncQueueItem {
  id: string;
  task_id: string;
  operation: 'create' | 'update' | 'delete';
  data: string;
  created_at: Date|string;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
  retry_count: number;
  last_error: string | null;

  error_message?: string;
}

export interface SyncResult {
  success: boolean;
  total:number;
  synced_items: number;
  failed_items: number;
  errors: SyncError[];
}

export interface SyncError {
  task_id: string;
  operation: string;
  error: string;
  timestamp: Date | string;
}

export interface ConflictResolution {
  strategy: 'last-write-wins' | 'client-wins' | 'server-wins';
  resolved_task: Task;
}

export interface BatchSyncRequest {
  items: SyncQueueItem[];
  client_timestamp: Date | string;
}

export interface BatchSyncResponse {
  processed_items: {
    client_id: string;
    server_id: string;
    status: 'success' | 'conflict' | 'error';
    resolved_data?: Task;
    error?: string;
  }[];
}

//Defining the task input

export interface TaskInput{
  title:string;
  description?:string;
  completed?:boolean;
}