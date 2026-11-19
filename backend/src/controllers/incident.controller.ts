import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import IncidentService from '../services/incident.service';
import Incident from '../models/incident.model';
import logger from '../utils/logger';
import { escapeRegExp } from '../utils/regexUtils';

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
      const { status, severity, department, search, all } = req.query;
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Valid authentication token required'
        });
        return;
      }

      // DEF-SEC-04 Remediation: Zero-trust tenant isolation
      // Only privileged officers or administrators can execute cross-tenant / global incident queries.
      const isPrivileged = user.role === 'admin' || user.role === 'officer';

      if (all === 'true' && !isPrivileged) {
        logger.warn(`[Security Alert] Citizen '${user.id}' attempted unauthorized global incident query (?all=true).`);
        res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient privileges for global incident query'
        });
        return;
      }

      const query: Record<string, unknown> = {
        isDuplicate: false
      };

      if (isPrivileged && all === 'true') {
        // Privileged municipal dispatch or operations query: view all incidents
      } else if (isPrivileged) {
        // Privileged user without ?all=true can filter by their department or view all
      } else {
        // Citizen role: strictly isolate to their own submitted incidents
        query.citizenId = user.id;
      }

      // Filter properties
      if (status) query.status = status;
      if (severity) query.severity = severity;
      if (department) query.department = department;

      // DEF-BE-05 Remediation: ReDoS & NoSQL Injection Hardened Text Search
      if (typeof search === 'string' && search.trim().length > 0) {
        const trimmed = search.trim().slice(0, 100);
        const safeSearch = escapeRegExp(trimmed);
        if (safeSearch.length > 0) {
          query.$or = [
            { title: { $regex: safeSearch, $options: 'i' } },
            { description: { $regex: safeSearch, $options: 'i' } },
          ];
        }
      }

      // DEF-BE-05 Remediation: Enforce strict pagination bounds
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const page = Math.max(Number(req.query.page) || 1, 1);
      const skip = (page - 1) * limit;

      const [incidents, total] = await Promise.all([
        Incident.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Incident.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          incidents,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error(`[IncidentController] Queue retrieval error: ${error}`);
      next(error);
    }
  }

  public static async getIncidentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: `Invalid incident ID format: ${id}` }
        });
        return;
      }

      const incident = await Incident.findById(id);
      if (!incident) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Incident with ID [${id}] does not exist.` }
        });
        return;
      }

      // Zero-Trust Tenant Isolation: Citizen can only view their own incident; Admin/Officer can view any
      const user = req.user;
      if (user && user.role === 'citizen' && incident.citizenId && incident.citizenId.toString() !== user.id) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Incident with ID [${id}] does not exist.` }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: incident
      });
    } catch (error) {
      logger.error(`[IncidentController] Retrieval by ID error: ${error}`);
      next(error);
    }
  }
}

export default IncidentController;
