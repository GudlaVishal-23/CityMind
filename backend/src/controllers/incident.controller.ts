import { Request, Response, NextFunction } from 'express';
import IncidentService from '../services/incident.service';
import Incident from '../models/incident.model';
import logger from '../utils/logger';

export class IncidentController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const citizenId = req.user!.id;
      const result = await IncidentService.createIncident(req.body, citizenId);

      if (result.duplicateFound) {
        res.status(200).json({
          success: true,
          duplicateFound: true,
          parentIncidentId: result.parentIncidentId,
          message: result.message
        });
        return;
      }

      res.status(201).json({
        success: true,
        duplicateFound: false,
        data: result.data
      });
    } catch (error) {
      logger.error(`[IncidentController] Ingestion error: ${error}`);
      next(error);
    }
  }

  public static async getIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 50, status, severity, department, search, all } = req.query;
      const user = req.user!;

      const query: any = {};

      // Role isolation boundary: If requesting all incidents (Ops Control) or admin/officer, return all non-duplicate incidents
      if (all === 'true' || user.role === 'admin' || user.role === 'officer') {
        query.isDuplicate = false;
      } else {
        query.citizenId = user.id;
        query.isDuplicate = false;
      }

      // Filter properties
      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (department) query.department = department;

      // Text search matching keywords
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const parsedPage = parseInt(page as string, 10);
      const parsedLimit = parseInt(limit as string, 10);
      const skip = (parsedPage - 1) * parsedLimit;

      const [incidents, total] = await Promise.all([
        Incident.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parsedLimit),
        Incident.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          incidents,
          pagination: {
            total,
            page: parsedPage,
            limit: parsedLimit,
            pages: Math.ceil(total / parsedLimit),
          },
        },
      });
    } catch (error) {
      logger.error(`[IncidentController] Queue retrieval error: ${error}`);
      next(error);
    }
  }
}

export default IncidentController;
