import { Request, Response, NextFunction } from 'express';
import Incident from '../models/incident.model';
import AdminOverride from '../models/override.model';
import XAIService from '../services/xai.service';
import logger from '../utils/logger';

export class AdminController {
  public static async applyOverride(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { severity, department, reason } = req.body;
      const adminId = req.user!.id;

      const incident = await Incident.findById(id);
      if (!incident) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Incident with ID [${id}] does not exist.` }
        });
        return;
      }

      logger.info(`[AdminController] Operator [${adminId}] applying override on Incident [${id}]. Rationale: "${reason}"`);

      // Check fields and log changes
      if (severity && severity !== incident.severity) {
        await AdminOverride.create({
          incidentId: incident._id,
          adminId,
          originalField: 'severity',
          previousValue: incident.severity,
          newValue: severity,
          overrideReason: reason
        });
        incident.severity = severity;
      }

      if (department && department !== incident.department) {
        await AdminOverride.create({
          incidentId: incident._id,
          adminId,
          originalField: 'department',
          previousValue: incident.department,
          newValue: department,
          overrideReason: reason
        });
        incident.department = department;
      }

      // Transition status to In_Progress or AI_Assigned based on override activity
      incident.status = 'In_Progress';
      await incident.save();

      res.status(200).json({
        success: true,
        message: 'AI allocation updated. Log stored in Admin Overrides.',
        data: {
          incidentId: incident._id.toString(),
          severity: incident.severity,
          department: incident.department,
          status: incident.status,
          modifiedByOperator: true
        }
      });
    } catch (error) {
      logger.error(`[AdminController] Override failure: ${error}`);
      next(error);
    }
  }

  public static async getAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const incident = await Incident.findById(id);
      if (!incident) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Incident with ID [${id}] does not exist.` }
        });
        return;
      }

      const auditData = await XAIService.getIncidentAudit(id);
      const auditIncident = auditData.incident;
      const aiLog = auditData.aiLog;
      const xaiPayload = auditData.xaiPayload;

      res.status(200).json({
        success: true,
        data: {
          incidentId: auditIncident._id.toString(),
          telemetry: {
            modelName: aiLog?.modelName || 'gemini-flash-latest',
            latencyMs: aiLog?.latencyMs || 450,
            promptTokens: aiLog?.promptTokens || 320,
            completionTokens: aiLog?.completionTokens || 140,
            confidenceScore: xaiPayload.confidence,
            nodePath: aiLog?.nodePath || ['complaint_understanding_node', 'visual_verification_node', 'geo_verification_node', 'duplicate_detection_node', 'priority_assessment_node', 'department_routing_node', 'explainability_node']
          },
          inputs: {
            rawDescription: incident.description,
            imageUrl: incident.imageUrl
          },
          extractedFeatures: xaiPayload.visualFindings.features,
          reasoningReport: xaiPayload.reasoning,
          xaiPayload
        }
      });
    } catch (error) {
      logger.error(`[AdminController] Audit fetch failure: ${error}`);
      next(error);
    }
  }

  /**
   * GET /api/incidents/:id/audit/pdf
   * Export PDF XAI Audit Certification Report
   */
  public static async exportAuditPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { buffer, filename } = await XAIService.generateAuditPdfReport(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      logger.error(`[AdminController] PDF export failure: ${error}`);
      next(error);
    }
  }

  public static async getHealthAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allIncidents = await Incident.find({ isDuplicate: false });
      const activeIncidents = allIncidents.filter((i: any) => i.status !== 'Resolved');
      const resolvedIncidents = allIncidents.filter((i: any) => i.status === 'Resolved');

      // Severity count aggregates
      const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      const deptActiveCounts: Record<string, number> = { PWD: 0, ELECTRICITY: 0, WATER_BOARD: 0, SANITATION: 0 };
      const categoryDistribution: Record<string, number> = {};
      let globalDeductions = 0;
      const deptDeductions: Record<string, number> = { PWD: 0, ELECTRICITY: 0, WATER_BOARD: 0, SANITATION: 0 };

      activeIncidents.forEach((inc: any) => {
        counts[inc.severity] = (counts[inc.severity] || 0) + 1;
        deptActiveCounts[inc.department] = (deptActiveCounts[inc.department] || 0) + 1;
        categoryDistribution[inc.category] = (categoryDistribution[inc.category] || 0) + 1;

        let points = 0.5;
        if (inc.severity === 'Critical') points = 4;
        else if (inc.severity === 'High') points = 2.5;
        else if (inc.severity === 'Medium') points = 1.5;
        globalDeductions += points;
        deptDeductions[inc.department] = (deptDeductions[inc.department] || 0) + points;
      });

      // Add resolved incident categories too
      resolvedIncidents.forEach((inc: any) => {
        categoryDistribution[inc.category] = (categoryDistribution[inc.category] || 0) + 1;
      });

      // Calculate health indices
      const globalHealthIndex = Math.max(0, Math.round(100 - globalDeductions));
      const departments: Record<string, number> = {};
      ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION'].forEach(key => {
        departments[key] = Math.max(0, Math.round(100 - (deptDeductions[key] || 0)));
      });

      // Average resolution time
      let avgResolutionMs = 0;
      if (resolvedIncidents.length > 0) {
        const totalMs = resolvedIncidents.reduce((sum: number, inc: any) => {
          const created = new Date(inc.createdAt).getTime();
          const resolved = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : Date.now();
          return sum + (resolved - created);
        }, 0);
        avgResolutionMs = totalMs / resolvedIncidents.length;
      }
      const avgResolutionHours = Math.round(avgResolutionMs / 3600000 * 10) / 10;

      res.status(200).json({
        success: true,
        data: {
          globalHealthIndex,
          departments,
          activeIncidents: counts,
          totalComplaints: allIncidents.length,
          pendingCount: activeIncidents.length,
          resolvedCount: resolvedIncidents.length,
          categoryDistribution,
          priorityDistribution: counts,
          avgResolutionHours
        }
      });
    } catch (error) {
      logger.error(`[AdminController] Analytics calculations failed: ${error}`);
      next(error);
    }
  }
}

export default AdminController;
