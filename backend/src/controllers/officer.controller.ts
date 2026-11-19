import { Request, Response, NextFunction } from 'express';
import Incident, { INCIDENT_STATUSES, IIncident } from '../models/incident.model';
import NotificationService from '../services/notification.service';
import Neo4jGraphService from '../services/neo4jGraph.service';
import { executeWithPolyglotTransaction } from '../utils/transaction';
import logger from '../utils/logger';

export class OfficerController {
  /**
   * POST /api/officer/incidents/:id/accept — Accept & assign complaint
   */
  public static async acceptIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const incident = await Incident.findById(id);
      if (!incident) { res.status(404).json({ success: false, error: { message: 'Incident not found.' } }); return; }

      incident.status = 'Assigned';
      incident.assignedOfficerId = req.user!.id as any;
      const history = incident.statusHistory || [];
      history.push({
        status: 'Assigned',
        timestamp: new Date(),
        note: `Accepted by ${req.user!.name || req.user!.email}`,
        actorId: req.user!.id,
        changedBy: req.user?.uid || req.user?.id || 'officer',
        role: req.user?.role || 'officer'
      });
      incident.statusHistory = history;
      await incident.save();

      await NotificationService.create(incident.citizenId.toString(), id, 'assigned_department',
        `Your complaint "${incident.title}" has been accepted and assigned to ${incident.department}.`);

      logger.info(`[OfficerController] Incident ${id} accepted by officer ${req.user!.id}`);
      res.status(200).json({ success: true, data: incident });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/officer/incidents/:id/reject — Reject with reason
   */
  public static async rejectIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || reason.length < 10) { res.status(400).json({ success: false, error: { message: 'Rejection reason must be at least 10 characters.' } }); return; }

      const incident = await Incident.findById(id);
      if (!incident) { res.status(404).json({ success: false, error: { message: 'Incident not found.' } }); return; }

      incident.status = 'Submitted';
      incident.assignedOfficerId = null;
      const history = incident.statusHistory || [];
      history.push({
        status: 'Rejected',
        timestamp: new Date(),
        note: `Rejected by ${req.user!.name || req.user!.email || 'Officer'}: ${reason}`,
        actorId: req.user!.id,
        changedBy: req.user?.uid || req.user?.id || 'officer',
        role: req.user?.role || 'officer'
      });
      incident.statusHistory = history;
      await incident.save();

      await NotificationService.create(incident.citizenId.toString(), id, 'rejected',
        `Your complaint "${incident.title}" requires revision. Reason: ${reason}`);

      res.status(200).json({ success: true, data: incident });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/officer/incidents/:id/request-info — Request more info from citizen
   */
  public static async requestInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;
      if (!message || message.length < 10) { res.status(400).json({ success: false, error: { message: 'Info request must be at least 10 characters.' } }); return; }

      const incident = await Incident.findById(id);
      if (!incident) { res.status(404).json({ success: false, error: { message: 'Incident not found.' } }); return; }

      const history = incident.statusHistory || [];
      history.push({
        status: incident.status,
        timestamp: new Date(),
        note: `Officer requested: ${message}`,
        actorId: req.user!.id,
        changedBy: req.user?.uid || req.user?.id || 'officer',
        role: req.user?.role || 'officer'
      });
      incident.statusHistory = history;
      await incident.save();

      await NotificationService.create(incident.citizenId.toString(), id, 'info_requested',
        `An officer needs more information about "${incident.title}": ${message}`);

      res.status(200).json({ success: true, data: incident });
    } catch (error) { next(error); }
  }

  /**
   * PATCH /api/officer/incidents/:id/status — Update status
   */
  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      if (!INCIDENT_STATUSES.includes(status)) {
        res.status(400).json({ success: false, error: { message: `Invalid status value. Allowed: ${INCIDENT_STATUSES.join(', ')}` } }); return;
      }

      const incident = await Incident.findById(id);
      if (!incident) { res.status(404).json({ success: false, error: { message: 'Incident not found.' } }); return; }

      const previousStatus = incident.status;

      const updatedIncident = await executeWithPolyglotTransaction<IIncident>({
        mongoWork: async (session) => {
          incident.status = status;
          if (status === 'Resolved') {
            incident.resolvedAt = new Date();
            incident.resolutionNotes = note || 'Resolved by field officer.';
          }
          const history = incident.statusHistory || [];
          history.push({
            status,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`,
            actorId: req.user!.id,
            changedBy: req.user?.uid || req.user?.id || 'officer',
            role: req.user?.role || 'officer'
          });
          incident.statusHistory = history;
          await incident.save(session ? { session } : undefined);

          // Send notification to citizen based on status type
          const notifTypeMap: Record<string, any> = {
            'In_Progress': 'in_progress',
            'Resolved': 'resolved',
            'Assigned': 'assigned_department'
          };
          const notifType = notifTypeMap[status];
          if (notifType) {
            await NotificationService.create(incident.citizenId.toString(), id, notifType,
              `Your complaint "${incident.title}" is now ${status.replace('_', ' ')}.`);
          }

          return incident;
        },
        neo4jWork: async () => {
          await Neo4jGraphService.updateComplaintStatusGraph(id, status);
        },
        compensateMongo: async () => {
          incident.status = previousStatus;
          await incident.save();
        }
      });

      res.status(200).json({ success: true, data: updatedIncident });
    } catch (error) { next(error); }
  }

  /**
   * POST /api/officer/incidents/:id/close — Close complaint with resolution notes
   */
  public static async closeIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notes = (req.body.resolutionNotes ?? req.body.resolutionNote ?? '').trim();
      if (!notes || notes.length < 10) {
        res.status(400).json({ success: false, error: { message: 'Resolution notes must be at least 10 characters.' } }); return;
      }

      const incident = await Incident.findById(id);
      if (!incident) { res.status(404).json({ success: false, error: { message: 'Incident not found.' } }); return; }

      incident.status = 'Resolved';
      incident.resolvedAt = new Date();
      incident.resolutionNotes = notes;
      const history = incident.statusHistory || [];
      history.push({
        status: 'Resolved',
        timestamp: new Date(),
        note: notes,
        actorId: req.user!.id,
        changedBy: req.user?.uid || req.user?.id || 'officer',
        role: req.user?.role || 'officer'
      });
      incident.statusHistory = history;
      await incident.save();

      await NotificationService.create(incident.citizenId.toString(), id, 'resolved',
        `Your complaint "${incident.title}" has been resolved! Notes: ${notes}`);

      res.status(200).json({ success: true, data: incident });
    } catch (error) { next(error); }
  }
}

export default OfficerController;
