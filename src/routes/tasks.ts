import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { SyncService } from '../services/syncService';
import { Database } from '../db/database';
import { TaskInput } from '../types';


export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Get all tasks
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    // TODO: Implement task creation endpoint
    // 1. Validate request body
    // 2. Call taskService.createTask()
    // 3. Return created task

    try{

      const data:TaskInput = req.body;

      if(!data.title){
        return res.status(400).json({ error:'Title is required'});
      }

      const newTask = await taskService.createTask({

        title: data.title,
        description:data.description || '',
        completed:data.completed ?? false,

      });

      res.status(201).json(newTask);



    }catch(error){
      console.error(error);
      res.status(500).json({error:'Failed to create a task'});
    }


    //res.status(501).json({ error: 'Not implemented' });
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    // TODO: Implement task update endpoint
    // 1. Validate request body
    // 2. Call taskService.updateTask()
    // 3. Handle not found case
    // 4. Return updated task

     try {
      const updates: TaskInput = req.body;
      const updated = await taskService.updateTask(req.params.id, updates);

      if (!updated) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }





    //res.status(501).json({ error: 'Not implemented' });
  });

  // Delete task
  router.delete('/:id', async (req: Request, res: Response) => {
    // TODO: Implement task deletion endpoint
    // 1. Call taskService.deleteTask()
    // 2. Handle not found case
    // 3. Return success response
    
     try {
      const deleted = await taskService.deleteTask(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }




    //res.status(501).json({ error: 'Not implemented' });
  });

  return router;
}