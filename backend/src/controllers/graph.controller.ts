// =============================================================================
// AI CITY — Neo4j Graph REST Controller
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import Neo4jGraphService from '../services/neo4jGraph.service';
import logger from '../utils/logger';

export class GraphController {
  /**
   * POST /api/graph/route
   * Resolve department & officer routing graph traversal
   */
  public static async route(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardCode = 'WARD_151', deptCode = 'WATER_BOARD' } = req.body;
      const result = await Neo4jGraphService.routeDepartmentGraph(wardCode, deptCode);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[GraphController] Route query error: ${error}`);
      next(error);
    }
  }

  /**
   * GET /api/graph/officers/nearest
   * Find available field officers assigned to department & ward
   */
  public static async getNearestOfficers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { department = 'WATER_BOARD', ward } = req.query;
      const officers = await Neo4jGraphService.findNearestOfficers(
        department as string,
        ward as string | undefined
      );

      res.status(200).json({
        success: true,
        data: {
          department,
          officersCount: officers.length,
          officers
        }
      });
    } catch (error) {
      logger.error(`[GraphController] Nearest officers error: ${error}`);
      next(error);
    }
  }

  /**
   * GET /api/graph/wards/stats
   * Aggregates graph analytical metrics per municipal ward
   */
  public static async getWardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await Neo4jGraphService.getWardStatistics();

      res.status(200).json({
        success: true,
        data: {
          totalWards: stats.length,
          wards: stats
        }
      });
    } catch (error) {
      logger.error(`[GraphController] Ward stats error: ${error}`);
      next(error);
    }
  }

  /**
   * GET /api/graph/clusters
   * Detects complaint clusters connected to shared roads and infrastructure assets
   */
  public static async getClusters(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clusters = await Neo4jGraphService.detectComplaintClusters();

      res.status(200).json({
        success: true,
        data: {
          clusterCount: clusters.length,
          clusters
        }
      });
    } catch (error) {
      logger.error(`[GraphController] Complaint clusters error: ${error}`);
      next(error);
    }
  }
}

export default GraphController;
