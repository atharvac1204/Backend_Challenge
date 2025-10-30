import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async (req: Request, res: Response) => {
    // TODO: Implement sync endpoint
    // 1. Check connectivity first
    // 2. Call syncService.sync()
    // 3. Return sync result

    try {
      const isConnected = await syncService.checkConnectivity();
      if (!isConnected) {
        return res.status(503).json({
          success: false,
          message: 'Server not reachable. Please check your connection.',
        });
      }

      const result = await syncService.sync();
      res.status(200).json({
        success: true,
        message: 'Sync completed successfully.',
        result,
      });
    } catch (error) {
      console.error('❌ Sync failed:', error);
      res.status(500).json({
        success: false,
        message: 'Sync failed due to an internal error.',
        error: error instanceof Error ? error.message : String(error),
      });
    }






    //res.status(501).json({ error: 'Not implemented' });
  });

  // Check sync status
  router.get('/status', async (req: Request, res: Response) => {
    // TODO: Implement sync status endpoint
    // 1. Get pending sync count
    // 2. Get last sync timestamp
    // 3. Check connectivity
    // 4. Return status summary
    
    try {
      const pendingCount = await db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue`
      );

      const lastSync = await db.get<{ last_synced_at: string }>(
        `SELECT MAX(last_synced_at) as last_synced_at FROM tasks`
      );

      const isConnected = await syncService.checkConnectivity();

      res.status(200).json({
        status: 'ok',
        pending_sync_items: pendingCount?.count ?? 0,
        last_sync_time: lastSync?.last_synced_at ?? null,
        online: isConnected,
      });
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch sync status.',
        error: error instanceof Error ? error.message : String(error),
      });
    }



    //res.status(501).json({ error: 'Not implemented' });
  });

  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    // TODO: Implement batch sync endpoint
    // This would be implemented on the server side
    // to handle batch sync requests from clients

     try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid batch data.' });
      }

      // In a real setup, process items server-side here
      res.status(200).json({
        message: 'Batch sync endpoint stub.',
        received_items: items.length,
      });
    } catch (error) {
      console.error('❌ Batch sync error:', error);
      res.status(500).json({
        error: 'Failed to process batch sync.',
        details: error instanceof Error ? error.message : String(error),
      });
    }



    //res.status(501).json({ error: 'Not implemented' });
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}