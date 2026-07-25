// =============================================================================
// AI CITY — Neo4j Graph Database Schema & Initializer Script
// =============================================================================
// Node Types:
//   - (:Ward)        : Municipal ward boundaries
//   - (:Road)        : Street and road segment network
//   - (:Department)  : Civic departments (PWD, WATER_BOARD, ELECTRICITY, SANITATION)
//   - (:Officer)     : Municipal field response officers
//   - (:Complaint)   : Ingested citizen complaints
//   - (:Asset)       : Physical infrastructure assets (transformers, pipes, bins)
//
// Relationship Topology:
//   - (:Complaint)-[:LOCATED_IN]->(:Ward)
//   - (:Ward)-[:MANAGED_BY]->(:Department)
//   - (:Department)-[:ASSIGNED_OFFICER]->(:Officer)
//   - (:Officer)-[:STATIONED_AT]->(:Ward)
//   - (:Complaint)-[:AFFECTS_ASSET]->(:Asset)
//   - (:Asset)-[:ON_ROAD]->(:Road)
//   - (:Road)-[:BELONGS_TO_WARD]->(:Ward)
// =============================================================================

// --- 1. CONSTRAINTS & INDEXES ---

CREATE CONSTRAINT ward_id_unique IF NOT EXISTS FOR (w:Ward) REQUIRE w.wardId IS UNIQUE;
CREATE CONSTRAINT ward_code_unique IF NOT EXISTS FOR (w:Ward) REQUIRE w.code IS UNIQUE;
CREATE CONSTRAINT road_id_unique IF NOT EXISTS FOR (r:Road) REQUIRE r.roadId IS UNIQUE;
CREATE CONSTRAINT dept_id_unique IF NOT EXISTS FOR (d:Department) REQUIRE d.deptId IS UNIQUE;
CREATE CONSTRAINT dept_code_unique IF NOT EXISTS FOR (d:Department) REQUIRE d.code IS UNIQUE;
CREATE CONSTRAINT officer_id_unique IF NOT EXISTS FOR (o:Officer) REQUIRE o.officerId IS UNIQUE;
CREATE CONSTRAINT complaint_id_unique IF NOT EXISTS FOR (c:Complaint) REQUIRE c.complaintId IS UNIQUE;
CREATE CONSTRAINT asset_id_unique IF NOT EXISTS FOR (a:Asset) REQUIRE a.assetId IS UNIQUE;

CREATE INDEX complaint_status_idx IF NOT EXISTS FOR (c:Complaint) ON (c.status);
CREATE INDEX complaint_severity_idx IF NOT EXISTS FOR (c:Complaint) ON (c.severity);
CREATE INDEX officer_status_idx IF NOT EXISTS FOR (o:Officer) ON (o.status);
CREATE INDEX asset_type_idx IF NOT EXISTS FOR (a:Asset) ON (a.type);

// --- 2. SEED MUNICIPAL DEPARTMENTS ---

MERGE (pwd:Department {code: 'PWD'})
ON CREATE SET pwd.deptId = 'dept_pwd', pwd.name = 'Public Works Department', pwd.contactEmail = 'pwd@aicity.gov';

MERGE (wb:Department {code: 'WATER_BOARD'})
ON CREATE SET wb.deptId = 'dept_wb', wb.name = 'Bangalore Water Supply and Sewerage Board', wb.contactEmail = 'water@aicity.gov';

MERGE (elec:Department {code: 'ELECTRICITY'})
ON CREATE SET elec.deptId = 'dept_elec', elec.name = 'Electricity Supply Corporation', elec.contactEmail = 'electricity@aicity.gov';

MERGE (san:Department {code: 'SANITATION'})
ON CREATE SET san.deptId = 'dept_san', san.name = 'Solid Waste & Sanitation Department', san.contactEmail = 'sanitation@aicity.gov';

// --- 3. SEED BANGALORE WARDS & ROADS ---

// Ward 84: Shivajinagar
MERGE (w84:Ward {code: 'WARD_84'})
ON CREATE SET w84.wardId = 'ward_84', w84.name = 'Shivajinagar Ward', w84.zone = 'Central Zone';

MERGE (r_comm:Road {roadId: 'road_comm_st'})
ON CREATE SET r_comm.name = 'Commercial Street', r_comm.lengthMeters = 1200;

MERGE (r_comm)-[:BELONGS_TO_WARD]->(w84);

// Ward 151: Koramangala
MERGE (w151:Ward {code: 'WARD_151'})
ON CREATE SET w151.wardId = 'ward_151', w151.name = 'Koramangala Ward', w151.zone = 'South Zone';

MERGE (r_orr:Road {roadId: 'road_orr_jnc'})
ON CREATE SET r_orr.name = 'Outer Ring Road Junction', r_orr.lengthMeters = 4500;

MERGE (r_orr)-[:BELONGS_TO_WARD]->(w151);

// Ward 72: Rajajinagar
MERGE (w72:Ward {code: 'WARD_72'})
ON CREATE SET w72.wardId = 'ward_72', w72.name = 'Rajajinagar Ward', w72.zone = 'West Zone';

// Department-to-Ward Management Relationships
MERGE (w84)-[:MANAGED_BY]->(san);
MERGE (w84)-[:MANAGED_BY]->(pwd);
MERGE (w151)-[:MANAGED_BY]->(wb);
MERGE (w151)-[:MANAGED_BY]->(elec);
MERGE (w72)-[:MANAGED_BY]->(pwd);
MERGE (w72)-[:MANAGED_BY]->(elec);

// --- 4. SEED FIELD OFFICERS ---

MERGE (o1:Officer {officerId: 'off_101'})
ON CREATE SET o1.name = 'Inspector Ramesh Kumar', o1.phone = '+91-9876543210', o1.status = 'Available', o1.email = 'ramesh.k@aicity.gov';

MERGE (o2:Officer {officerId: 'off_102'})
ON CREATE SET o2.name = 'Engineer Priya Ananth', o2.phone = '+91-9876543211', o2.status = 'Available', o2.email = 'priya.a@aicity.gov';

MERGE (o3:Officer {officerId: 'off_103'})
ON CREATE SET o3.name = 'Supervisor Suresh Babu', o3.phone = '+91-9876543212', o3.status = 'On_Duty', o3.email = 'suresh.b@aicity.gov';

MERGE (wb)-[:ASSIGNED_OFFICER]->(o1);
MERGE (o1)-[:STATIONED_AT]->(w151);

MERGE (elec)-[:ASSIGNED_OFFICER]->(o2);
MERGE (o2)-[:STATIONED_AT]->(w151);

MERGE (san)-[:ASSIGNED_OFFICER]->(o3);
MERGE (o3)-[:STATIONED_AT]->(w84);

// --- 5. SEED INFRASTRUCTURE ASSETS ---

MERGE (ast1:Asset {assetId: 'ast_water_pipe_101'})
ON CREATE SET ast1.name = 'ORR Main Feeder Pipe #4', ast1.type = 'Water_Pipe', ast1.status = 'Damaged';

MERGE (ast2:Asset {assetId: 'ast_transformer_202'})
ON CREATE SET ast2.name = 'Parkside Step-Down Transformer #12', ast2.type = 'Electrical_Transformer', ast2.status = 'Hazardous';

MERGE (ast3:Asset {assetId: 'ast_waste_bin_303'})
ON CREATE SET ast3.name = 'Commercial Street Smart Bin Unit B', ast3.type = 'Waste_Bin', ast3.status = 'Overflowing';

MERGE (ast1)-[:ON_ROAD]->(r_orr);
MERGE (ast2)-[:ON_ROAD]->(r_orr);
MERGE (ast3)-[:ON_ROAD]->(r_comm);
