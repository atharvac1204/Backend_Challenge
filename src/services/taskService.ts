import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

export class TaskService {
  constructor(private db: Database) {}

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // TODO: Implement task creation
    // 1. Generate UUID for the task
    // 2. Set default values (completed: false, is_deleted: false)
    // 3. Set sync_status to 'pending'
    // 4. Insert into database
    // 5. Add to sync queue

    const id= uuidv4();
    const now=new Date().toISOString();

    const newTask: Task = {
      id,
      title: taskData.title!,
      description: taskData.description || '',
      completed: taskData.completed ?? false,
      created_at: new Date(now),
      updated_at: new Date(now),
      is_deleted: false,
      sync_status: 'pending',
      server_id: undefined,
      last_synced_at: undefined,


    };


    const sql=`

    INSERT INTO tasks (
      
      id,title,description,completed,
      created_at,updated_at,is_deleted,
      sync_status

      )
    
       VALUES(?,?,?,?,?,?,?,?,?)
    
    
    `;

    await this.db.run(sql,[
      newTask.id,
      newTask.title,
      newTask.description,
      newTask.completed?1:0,
      newTask.created_at,
      newTask.updated_at,
      newTask.is_deleted?1:0,
      newTask.sync_status,

    ])


      return newTask;


    //throw new Error('Not implemented');
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // TODO: Implement task update
    // 1. Check if task exists
    // 2. Update task in database
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue


    const existing = await this.getTask(id);
    if(!existing) return null;

    const now= new Date().toISOString();

    const updatedTask={
      ...existing,
      ...updates,
      updated_at: new Date(now),
      sync_status:'pending' as 'pending',
    };

    const sql = `
      UPDATE tasks
      SET title = ?, description = ?, completed = ?, updated_at = ?, sync_status = ?
      WHERE id = ?
    `;

    await this.db.run(sql, [
      updatedTask.title,
      updatedTask.description,
      updatedTask.completed ? 1 : 0,
      updatedTask.updated_at,
      updatedTask.sync_status,
      id,
    ]);

    return updatedTask;

     //throw new Error('Not implemented');
  }

  async deleteTask(id: string): Promise<boolean> {
    // TODO: Implement soft delete
    // 1. Check if task exists
    // 2. Set is_deleted to true
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue

    const existing = await this.getTask(id);
    if (!existing) return false;

    const now = new Date().toISOString();

    const sql = `
      UPDATE tasks
      SET is_deleted = 1, updated_at = ?, sync_status = 'pending'
      WHERE id = ?
    `;

    await this.db.run(sql, [now, id]);
    return true;




    //throw new Error('Not implemented');
  }

  async getTask(id: string): Promise<Task | null> {
    // TODO: Implement get single task
    // 1. Query database for task by id
    // 2. Return null if not found or is_deleted is true

    const sql = `SELECT * FROM tasks WHERE id = ?`;
    const row = await this.db.get(sql, [id]);
    if (!row || row.is_deleted) return null;

    return {
      ...row,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
    };


    //throw new Error('Not implemented');
  }

  async getAllTasks(): Promise<Task[]> {
    // TODO: Implement get all non-deleted tasks
    // 1. Query database for all tasks where is_deleted = false
    // 2. Return array of tasks

    const sql = `SELECT * FROM tasks WHERE is_deleted = 0`;
    const rows = await this.db.all(sql);
    return rows.map((row:any):Task => ({

      id: row.id,
      title: row.title,
      description: row.description,
      completed: !!row.completed,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: !!row.is_deleted,
      sync_status: row.sync_status as 'pending' | 'synced' | 'error',
      server_id: row.server_id,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined,


     
    }));
    //throw new Error('Not implemented');
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    // TODO: Get all tasks with sync_status = 'pending' or 'error'

    const sql = `SELECT * FROM tasks WHERE sync_status IN ('pending', 'error')`;
    const rows = (await this.db.all<Task>(sql))||[];
    return rows.map((row: Task) => ({
      ...row,
      completed: !!row.completed,
      is_deleted: !!row.is_deleted,
    }));
    //throw new Error('Not implemented');
  }
}