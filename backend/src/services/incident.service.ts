import Incident from '../models/incident.model';
import AILog from '../models/aiLog.model';
import DuplicateService from './duplicate.service';
import AIBrainService from './aiBrain.service';
import Neo4jGraphService from './neo4jGraph.service';
import { AppError } from '../middleware/error.middleware';
import logger from '../utils/logger';

export class IncidentService {
  public static async createIncident(
    payload: { title: string; description: string; imageUrl: string; location: { lat: number; lng: number }; exifData?: any },
    citizenId: string
  ): Promise<{ duplicateFound: boolean; parentIncidentId?: string; message?: string; data?: any }> {
    try {
      logger.info(`[IncidentService] Ingesting report for citizen: ${citizenId}`);

      // 1. Run AI CITY LangGraph multi-agent pipeline to extract category, severity, and routing
      const aiResult = await AIBrainService.execute(payload.imageUrl, payload.description, payload.location, payload.exifData);

      // 1b. Multi-Modal Validation Filter: Dismiss fake/invalid/selfie/person/mismatched complaints
      if (aiResult.validationStatus && aiResult.validationStatus !== 'VALID') {
        logger.warn(`[IncidentService] Complaint validation DISMISSED: ${aiResult.rejectionReason}`);
        throw new AppError(
          aiResult.rejectionReason || 'Complaint Validation Failed: Image content does not match reported civic hazard.',
          400,
          'INVALID_CIVIC_HAZARD'
        );
      }

      // 2. Perform production multi-modal duplicate scan (Embeddings + FAISS + GPS + pHash)
      const dupAnalysis = await DuplicateService.analyzeDuplicate(
        `${payload.title} ${payload.description}`,
        payload.imageUrl,
        payload.location,
        aiResult.category
      );

      if (dupAnalysis.duplicateScore > 0.90 && dupAnalysis.parentIncidentId) {
        // Increment parent witness count
        await Incident.findByIdAndUpdate(dupAnalysis.parentIncidentId, { $inc: { witnessCount: 1 } });

        // Save duplicate report reference
        await Incident.create({
          citizenId,
          title: payload.title,
          description: payload.description,
          imageUrl: payload.imageUrl,
          location: {
            type: 'Point',
            coordinates: [payload.location.lng, payload.location.lat]
          },
          category: aiResult.category,
          severity: aiResult.severity,
          department: aiResult.department,
          status: 'Submitted',
          isDuplicate: true,
          parentIncidentId: dupAnalysis.parentIncidentId,
          witnessCount: 1
        });

        logger.info(`[IncidentService] Duplicate report (Confidence: ${(dupAnalysis.duplicateScore * 100).toFixed(1)}%) linked to parent incident ID: ${dupAnalysis.parentIncidentId}`);
        return {
          duplicateFound: true,
          parentIncidentId: dupAnalysis.parentIncidentId,
          message: "This issue is already reported."
        };
      }

      // 3. Unique Incident: Persist main incident
      const newIncident = await Incident.create({
        citizenId,
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl,
        location: {
          type: 'Point',
          coordinates: [payload.location.lng, payload.location.lat]
        },
        category: aiResult.category,
        severity: aiResult.severity,
        department: aiResult.department,
        status: aiResult.confidence >= 0.82 ? 'Assigned' : 'Submitted',
        isDuplicate: false,
        parentIncidentId: null,
        witnessCount: 1
      });

      // 4. Ingest into Neo4j Graph Database
      await Neo4jGraphService.ingestComplaintGraph({
        complaintId: newIncident._id.toString(),
        title: newIncident.title,
        category: newIncident.category,
        severity: newIncident.severity,
        status: newIncident.status,
        wardCode: 'WARD_151',
        deptCode: newIncident.department
      });

      // 5. Save AI Decision logs for auditDrawer telemetry
      const markdownReport = `### AI Decision Rationale\n- **Visual Analysis**: Identified features include: ${aiResult.imageFeatures.join(', ')}.\n- **Threat Level Assessment**: Rated **${aiResult.severity}** severity. ${aiResult.why[1] || ''}\n- **Routing**: Dispatched to **${aiResult.department}**. ${aiResult.why[0] || ''}`;

      await AILog.create({
        incidentId: newIncident._id,
        promptTokens: aiResult.promptTokens,
        completionTokens: aiResult.completionTokens,
        latencyMs: aiResult.latencyMs,
        modelName: process.env.GEMINI_MODEL_NAME || 'gemini-flash-latest',
        imageFeatures: aiResult.imageFeatures,
        confidenceScore: aiResult.confidence,
        reasoningReport: markdownReport,
        nodePath: aiResult.nodePath,
        executedAt: new Date()
      });

      logger.info(`[IncidentService] Unique incident successfully persisted: [${newIncident._id}].`);

      return {
        duplicateFound: false,
        data: {
          incidentId: newIncident._id.toString(),
          title: newIncident.title,
          description: newIncident.description,
          imageUrl: newIncident.imageUrl,
          location: newIncident.location,
          category: newIncident.category,
          severity: newIncident.severity,
          department: newIncident.department,
          status: newIncident.status,
          witnessCount: newIncident.witnessCount,
          createdAt: newIncident.createdAt,
          aiReport: {
            confidence: aiResult.confidence,
            why: aiResult.why,
            estimatedResolution: aiResult.estimatedResolution
          }
        }
      };

    } catch (error) {
      logger.error(`[IncidentService] Orchestrated ingestion failed: ${error}`);
      throw error;
    }
  }
}

export default IncidentService;
