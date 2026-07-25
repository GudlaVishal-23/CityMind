// =============================================================================
// AI CITY — Neo4j Connection Driver & Graph Emulator Fallback
// =============================================================================
// Manages official `neo4j-driver` connectivity. Automatically verifies connection
// on startup and seamlessly activates an in-memory Graph Emulator if Neo4j is offline.
// =============================================================================

import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'aicity1234';

let driver: Driver | null = null;
let isNeo4jConnected = false;

// In-memory Graph Emulator Store for Fallback Mode
export const memoryGraph = {
  wards: [
    { wardId: 'ward_84', code: 'WARD_84', name: 'Shivajinagar Ward', zone: 'Central Zone' },
    { wardId: 'ward_151', code: 'WARD_151', name: 'Koramangala Ward', zone: 'South Zone' },
    { wardId: 'ward_72', code: 'WARD_72', name: 'Rajajinagar Ward', zone: 'West Zone' },
    { wardId: 'ward_160', code: 'WARD_160', name: 'Basavanagudi Ward', zone: 'South Zone' },
    { wardId: 'ward_176', code: 'WARD_176', name: 'JP Nagar Ward', zone: 'South Zone' }
  ],
  departments: [
    { deptId: 'dept_pwd', code: 'PWD', name: 'Public Works Department', contactEmail: 'pwd@aicity.gov' },
    { deptId: 'dept_wb', code: 'WATER_BOARD', name: 'Bangalore Water Supply and Sewerage Board', contactEmail: 'water@aicity.gov' },
    { deptId: 'dept_elec', code: 'ELECTRICITY', name: 'Electricity Supply Corporation', contactEmail: 'electricity@aicity.gov' },
    { deptId: 'dept_san', code: 'SANITATION', name: 'Solid Waste & Sanitation Department', contactEmail: 'sanitation@aicity.gov' }
  ],
  officers: [
    { officerId: 'off_101', name: 'Inspector Ramesh Kumar', phone: '+91-9876543210', status: 'Available', email: 'ramesh.k@aicity.gov', deptCode: 'WATER_BOARD', wardCode: 'WARD_151' },
    { officerId: 'off_102', name: 'Engineer Priya Ananth', phone: '+91-9876543211', status: 'Available', email: 'priya.a@aicity.gov', deptCode: 'ELECTRICITY', wardCode: 'WARD_151' },
    { officerId: 'off_103', name: 'Supervisor Suresh Babu', phone: '+91-9876543212', status: 'Available', email: 'suresh.b@aicity.gov', deptCode: 'SANITATION', wardCode: 'WARD_84' },
    { officerId: 'off_104', name: 'Officer Vikram Singh', phone: '+91-9876543213', status: 'Available', email: 'vikram.s@aicity.gov', deptCode: 'PWD', wardCode: 'WARD_72' }
  ],
  roads: [
    { roadId: 'road_comm_st', name: 'Commercial Street', lengthMeters: 1200, wardCode: 'WARD_84' },
    { roadId: 'road_orr_jnc', name: 'Outer Ring Road Junction', lengthMeters: 4500, wardCode: 'WARD_151' },
    { roadId: 'road_raj_main', name: 'Rajajinagar Main Road', lengthMeters: 2800, wardCode: 'WARD_72' }
  ],
  assets: [
    { assetId: 'ast_water_pipe_101', name: 'ORR Main Feeder Pipe #4', type: 'Water_Pipe', status: 'Damaged', roadId: 'road_orr_jnc' },
    { assetId: 'ast_transformer_202', name: 'Parkside Step-Down Transformer #12', type: 'Electrical_Transformer', status: 'Hazardous', roadId: 'road_orr_jnc' },
    { assetId: 'ast_waste_bin_303', name: 'Commercial Street Smart Bin Unit B', type: 'Waste_Bin', status: 'Overflowing', roadId: 'road_comm_st' }
  ],
  complaints: [] as any[]
};

export async function connectNeo4j(): Promise<boolean> {
  try {
    logger.info(`[Neo4j] Attempting connection to Graph DB at ${NEO4J_URI}`);
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

    // Verify connectivity
    const serverInfo = await driver.getServerInfo();
    isNeo4jConnected = true;
    logger.info(`[Neo4j] Graph Database connected successfully. Server: ${serverInfo.agent}`);
    return true;
  } catch (err: any) {
    isNeo4jConnected = false;
    logger.warn(`[Neo4j] Live Graph DB unavailable (${err.message || err}). Activating In-Memory Graph Emulator.`);
    return false;
  }
}

export function getNeo4jDriver(): Driver | null {
  return driver;
}

export function isGraphConnected(): boolean {
  return isNeo4jConnected;
}

/**
 * Execute Cypher query either on live Neo4j session or using Graph Emulator.
 */
export async function runCypherQuery(cypher: string, params: Record<string, any> = {}): Promise<any[]> {
  if (isNeo4jConnected && driver) {
    const session: Session = driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(record => record.toObject());
    } catch (error) {
      logger.error(`[Neo4j] Cypher execution error: ${error}`);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Fallback: Execute via In-Memory Graph Emulator
  return runEmulatorQuery(cypher, params);
}

/**
 * In-Memory Cypher Emulator for offline resilience.
 */
function runEmulatorQuery(cypher: string, params: Record<string, any>): any[] {
  const normalizedCypher = cypher.replace(/\s+/g, ' ').trim();

  // 1. Department Routing Query
  if (normalizedCypher.includes('MANAGED_BY') && normalizedCypher.includes('Department')) {
    const wardCode = params.wardCode || 'WARD_151';
    const deptCode = params.deptCode || 'WATER_BOARD';

    const ward = memoryGraph.wards.find(w => w.code === wardCode) || memoryGraph.wards[1];
    const dept = memoryGraph.departments.find(d => d.code === deptCode) || memoryGraph.departments[1];
    const officers = memoryGraph.officers.filter(o => o.deptCode === deptCode);

    return [{
      d: dept,
      w: ward,
      officers
    }];
  }

  // 2. Nearest Officer Lookup Query
  if (normalizedCypher.includes('ASSIGNED_OFFICER') && normalizedCypher.includes('Officer')) {
    const deptCode = params.deptCode || 'WATER_BOARD';
    const dept = memoryGraph.departments.find(d => d.code === deptCode) || memoryGraph.departments[1];
    const officers = memoryGraph.officers.filter(o => o.deptCode === deptCode && o.status === 'Available');

    return officers.map(o => ({
      o,
      w: memoryGraph.wards.find(w => w.code === o.wardCode) || memoryGraph.wards[1],
      d: dept
    }));
  }

  // 3. Ward Statistics Query
  if (normalizedCypher.includes('w.name as wardName') || normalizedCypher.includes('Ward')) {
    return memoryGraph.wards.map(w => {
      const wardComplaints = memoryGraph.complaints.filter(c => c.wardCode === w.code);
      const criticalCount = wardComplaints.filter(c => c.severity === 'Critical').length;
      return {
        wardName: w.name,
        wardCode: w.code,
        zone: w.zone,
        totalComplaints: wardComplaints.length,
        criticalCount,
        affectedAssetsCount: Math.min(wardComplaints.length, 3)
      };
    });
  }

  // 4. Complaint Clustering Query
  if (normalizedCypher.includes('clusteredComplaintIds') || normalizedCypher.includes('AFFECTS_ASSET')) {
    return memoryGraph.roads.map(r => {
      const roadAssets = memoryGraph.assets.filter(a => a.roadId === r.roadId);
      const roadComplaints = memoryGraph.complaints.filter(c => c.roadId === r.roadId);
      return {
        roadName: r.name,
        roadId: r.roadId,
        clusteredComplaintIds: roadComplaints.map(c => c.complaintId),
        affectedAssetCount: roadAssets.length
      };
    });
  }

  // Default empty return
  return [];
}

export default {
  connectNeo4j,
  getNeo4jDriver,
  isGraphConnected,
  runCypherQuery
};
