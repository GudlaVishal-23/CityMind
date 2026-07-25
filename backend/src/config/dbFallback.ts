import { Types } from 'mongoose';
import logger from '../utils/logger';

// In-memory collections
export const memoryDb: Record<string, any[]> = {
  User: [
    {
      _id: new Types.ObjectId('60c72b2f9b1d8b22a4567000'),
      firebaseUid: 'dev-citizen-uid',
      email: 'citizen@aicity.gov',
      name: 'Priya Sharma',
      role: 'citizen',
      createdAt: new Date()
    },
    {
      _id: new Types.ObjectId('60c72b2f9b1d8b22a456700e'),
      firebaseUid: 'dev-officer-uid',
      email: 'officer@aicity.gov',
      name: 'Inspector Ramesh Kumar',
      role: 'officer',
      department: 'WATER_BOARD',
      createdAt: new Date()
    },
    {
      _id: new Types.ObjectId('60c72b2f9b1d8b22a456700f'),
      firebaseUid: 'dev-admin-uid',
      email: 'admin@aicity.gov',
      name: 'Commissioner Rajesh Kumar',
      role: 'admin',
      createdAt: new Date()
    }
  ],
  Incident: [],
  AILog: [],
  AdminOverride: [],
  Notification: [],
  AIFeedback: []
};

// In-memory seed data for demo (CTO Rule: "Keep a running Demo Database")
const seedIncidents = [
  {
    _id: new Types.ObjectId('60c72b2f9b1d8b22a4567001'),
    citizenId: new Types.ObjectId('60c72b2f9b1d8b22a4567000'),
    title: 'Major water main burst on ORR Junction',
    description: 'A large volume of clean water is flowing out from under the tarmac, causing street flooding and making the left lane unusable for cars.',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    category: 'Water Leakage',
    severity: 'High',
    department: 'WATER_BOARD',
    status: 'Assigned',
    isDuplicate: false,
    parentIncidentId: null,
    witnessCount: 3,
    assignedOfficerId: new Types.ObjectId('60c72b2f9b1d8b22a456700e'),
    resolvedAt: null,
    resolutionNotes: '',
    statusHistory: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 3600000 * 4), note: 'Citizen reported via mobile app' },
      { status: 'Verified', timestamp: new Date(Date.now() - 3600000 * 3.5), note: 'AI verification completed with 91% confidence' },
      { status: 'Assigned', timestamp: new Date(Date.now() - 3600000 * 2), note: 'Assigned to WATER_BOARD department' }
    ],
    createdAt: new Date(Date.now() - 3600000 * 4)
  },
  {
    _id: new Types.ObjectId('60c72b2f9b1d8b22a4567002'),
    citizenId: new Types.ObjectId('60c72b2f9b1d8b22a4567000'),
    title: 'Garbage overflow on Commercial Street',
    description: 'The municipal bins are overflowing with plastic waste and organic scrap, causing a foul odor and attracting stray dogs.',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
    location: { type: 'Point', coordinates: [77.6012, 12.9785] },
    category: 'Waste Overflow',
    severity: 'Medium',
    department: 'SANITATION',
    status: 'Verified',
    isDuplicate: false,
    parentIncidentId: null,
    witnessCount: 1,
    assignedOfficerId: null,
    resolvedAt: null,
    resolutionNotes: '',
    statusHistory: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 3600000 * 5), note: 'Citizen reported via mobile app' },
      { status: 'Verified', timestamp: new Date(Date.now() - 3600000 * 4.5), note: 'AI verification completed with 87% confidence' }
    ],
    createdAt: new Date(Date.now() - 3600000 * 5)
  },
  {
    _id: new Types.ObjectId('60c72b2f9b1d8b22a4567003'),
    citizenId: new Types.ObjectId('60c72b2f9b1d8b22a4567000'),
    title: 'Exposed sparking transformer near park',
    description: 'An open electrical transformer unit is sparking periodically near the childrens play park, presenting a severe risk.',
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    location: { type: 'Point', coordinates: [77.5892, 12.9643] },
    category: 'Electrical Hazard',
    severity: 'Critical',
    department: 'ELECTRICITY',
    status: 'Verified',
    isDuplicate: false,
    parentIncidentId: null,
    witnessCount: 7,
    assignedOfficerId: null,
    resolvedAt: null,
    resolutionNotes: '',
    statusHistory: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 3600000 * 1.5), note: 'Citizen reported via mobile app' },
      { status: 'Verified', timestamp: new Date(Date.now() - 3600000 * 1), note: 'AI verification completed — CRITICAL threat detected' }
    ],
    createdAt: new Date(Date.now() - 3600000 * 1.5)
  },
  {
    _id: new Types.ObjectId('60c72b2f9b1d8b22a4567004'),
    citizenId: new Types.ObjectId('60c72b2f9b1d8b22a4567000'),
    title: 'Fallen avenue tree blocking street',
    description: 'A large Gulmohar tree has fallen completely across the residential lane, blocking traffic and bringing down low-hanging cables.',
    imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80',
    location: { type: 'Point', coordinates: [77.6120, 12.9810] },
    category: 'Road Obstruction',
    severity: 'High',
    department: 'PWD',
    status: 'In_Progress',
    isDuplicate: false,
    parentIncidentId: null,
    witnessCount: 2,
    assignedOfficerId: new Types.ObjectId('60c72b2f9b1d8b22a456700e'),
    resolvedAt: null,
    resolutionNotes: '',
    statusHistory: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 3600000 * 10), note: 'Citizen reported via mobile app' },
      { status: 'Verified', timestamp: new Date(Date.now() - 3600000 * 9.5), note: 'AI verification completed with 89% confidence' },
      { status: 'Assigned', timestamp: new Date(Date.now() - 3600000 * 9), note: 'Assigned to PWD department' },
      { status: 'In_Progress', timestamp: new Date(Date.now() - 3600000 * 8), note: 'Field crew dispatched for tree removal' }
    ],
    createdAt: new Date(Date.now() - 3600000 * 10)
  },
  {
    _id: new Types.ObjectId('60c72b2f9b1d8b22a4567005'),
    citizenId: new Types.ObjectId('60c72b2f9b1d8b22a4567000'),
    title: 'Flickering streetlights on Outer Road',
    description: 'Several streetlights are completely dead or flickering, making the section highly hazardous for pedestrians after sunset.',
    imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=600&q=80',
    location: { type: 'Point', coordinates: [77.5750, 12.9590] },
    category: 'Streetlighting',
    severity: 'Low',
    department: 'ELECTRICITY',
    status: 'Resolved',
    isDuplicate: false,
    parentIncidentId: null,
    witnessCount: 1,
    assignedOfficerId: new Types.ObjectId('60c72b2f9b1d8b22a456700e'),
    resolvedAt: new Date(Date.now() - 3600000 * 12),
    resolutionNotes: 'Replaced 4 flickering streetlight units and rewired junction box.',
    statusHistory: [
      { status: 'Submitted', timestamp: new Date(Date.now() - 3600000 * 24), note: 'Citizen reported via mobile app' },
      { status: 'Verified', timestamp: new Date(Date.now() - 3600000 * 23), note: 'AI verification completed with 86% confidence' },
      { status: 'Assigned', timestamp: new Date(Date.now() - 3600000 * 22), note: 'Assigned to ELECTRICITY department' },
      { status: 'In_Progress', timestamp: new Date(Date.now() - 3600000 * 18), note: 'Electrician dispatched to site' },
      { status: 'Resolved', timestamp: new Date(Date.now() - 3600000 * 12), note: 'Replaced 4 flickering streetlight units and rewired junction box.' }
    ],
    createdAt: new Date(Date.now() - 3600000 * 24)
  }
];

memoryDb.Incident.push(...seedIncidents);

// Setup default dummy AI logs for seeded incidents
seedIncidents.forEach(inc => {
  memoryDb.AILog.push({
    incidentId: inc._id,
    promptTokens: 250 + Math.round(Math.random() * 80),
    completionTokens: 80 + Math.round(Math.random() * 40),
    latencyMs: 800 + Math.round(Math.random() * 600),
    modelName: 'gemini-flash-latest',
    imageFeatures: [inc.category.toLowerCase(), 'hazard_detected', 'urban_infrastructure'],
    confidenceScore: 0.85 + Math.random() * 0.12,
    reasoningReport: `### AI Decision Rationale\n- **Visual Analysis**: Extracted visual features suggest: ${inc.category}.\n- **Threat Level Assessment**: Assessed as **${inc.severity}** priority based on civic safety guidelines.\n- **Routing**: Routed to **${inc.department}** for priority action.`,
    nodePath: ['complaint_understanding_node', 'visual_verification_node', 'geo_verification_node', 'duplicate_detection_node', 'priority_assessment_node', 'department_routing_node', 'explainability_node'],
    executedAt: inc.createdAt
  });
});

export let isMongoConnected = false;
export const setMongoConnected = (connected: boolean) => {
  isMongoConnected = connected;
  logger.info(`[Database] Connection status synced to Proxy Layer. Connected = ${connected}`);
};

class MockQuery<T> {
  private data: T[];

  constructor(data: T[]) {
    this.data = [...data];
  }

  sort(sortObj: any) {
    const key = Object.keys(sortObj)[0];
    const order = sortObj[key];
    this.data.sort((a: any, b: any) => {
      const valA = a[key];
      const valB = b[key];
      if (valA instanceof Date && valB instanceof Date) {
        return order === -1 ? valB.getTime() - valA.getTime() : valA.getTime() - valB.getTime();
      }
      if (valA < valB) return order === -1 ? 1 : -1;
      if (valA > valB) return order === -1 ? -1 : 1;
      return 0;
    });
    return this;
  }

  skip(n: number) {
    this.data = this.data.slice(n);
    return this;
  }

  limit(n: number) {
    this.data = this.data.slice(0, n);
    return this;
  }

  async exec() {
    return this.data;
  }

  then(onfulfilled?: (value: T[]) => any, onrejected?: (reason: any) => any) {
    return Promise.resolve(this.data).then(onfulfilled, onrejected);
  }
}

const mockDocument = (doc: any, collectionName: string) => {
  if (!doc) return null;
  return {
    ...doc,
    save: async function() {
      const arr = memoryDb[collectionName];
      const idx = arr.findIndex((x) => x._id.toString() === this._id.toString());
      if (idx !== -1) {
        arr[idx] = { ...this };
      } else {
        arr.push(this);
      }
      return this;
    }
  };
};

export const createModelProxy = (modelName: string, realModel: any) => {
  return new Proxy(realModel, {
    get(target, prop, receiver) {
      if (isMongoConnected) {
        return Reflect.get(target, prop, receiver);
      }

      if (!isMongoConnected) {
        if (prop === 'find') {
          return (query: any) => {
            let filtered = memoryDb[modelName];
            if (query) {
              filtered = filtered.filter((item: any) => {
                for (const key in query) {
                  if (key === '$or') {
                    const match = query.$or.some((subQuery: any) => {
                      const field = Object.keys(subQuery)[0];
                      const regex = subQuery[field].$regex;
                      return item[field] && new RegExp(regex, 'i').test(item[field]);
                    });
                    if (!match) return false;
                    continue;
                  }
                  if (key === 'status') {
                    if (query.status && query.status.$ne) {
                      if (item.status === query.status.$ne) return false;
                      continue;
                    }
                  }
                  if (key === 'createdAt' && query.createdAt && query.createdAt.$gte) {
                    const itemTime = new Date(item.createdAt).getTime();
                    const targetTime = new Date(query.createdAt.$gte).getTime();
                    if (itemTime < targetTime) return false;
                    continue;
                  }
                  // skip coordinate geometry matching in location filter
                  if (key === 'location') {
                    continue;
                  }
                  if (item[key] !== query[key]) {
                    if (item[key] && item[key].toString() === query[key].toString()) {
                      continue;
                    }
                    return false;
                  }
                }
                return true;
              });
            }
            return new MockQuery(filtered.map(x => mockDocument(x, modelName)));
          };
        }

        if (prop === 'findOne') {
          return (query: any) => {
            const filtered = memoryDb[modelName].find((item: any) => {
              for (const key in query) {
                if (item[key] && item[key].toString() === query[key].toString()) continue;
                if (item[key] !== query[key]) return false;
              }
              return true;
            });
            const doc = mockDocument(filtered, modelName);
            return {
              then: (resolve: any) => resolve(doc),
              exec: async () => doc
            };
          };
        }

        if (prop === 'findById') {
          return (id: any) => {
            const found = memoryDb[modelName].find((item: any) => item._id.toString() === id.toString());
            const doc = mockDocument(found, modelName);
            return {
              then: (resolve: any) => resolve(doc),
              exec: async () => doc
            };
          };
        }

        if (prop === 'create') {
          return async (payload: any) => {
            const newDoc = {
              _id: new Types.ObjectId(),
              createdAt: new Date(),
              witnessCount: 1,
              isDuplicate: false,
              parentIncidentId: null,
              ...payload
            };
            memoryDb[modelName].push(newDoc);
            return mockDocument(newDoc, modelName);
          };
        }

        if (prop === 'findByIdAndUpdate') {
          return async (id: any, update: any) => {
            const idx = memoryDb[modelName].findIndex((item: any) => item._id.toString() === id.toString());
            if (idx === -1) return null;
            
            let updatedItem = { ...memoryDb[modelName][idx] };
            if (update.$inc) {
              for (const field in update.$inc) {
                updatedItem[field] = (updatedItem[field] || 0) + update.$inc[field];
              }
            }
            if (update.$set) {
              updatedItem = { ...updatedItem, ...update.$set };
            }
            memoryDb[modelName][idx] = updatedItem;
            return mockDocument(updatedItem, modelName);
          };
        }

        if (prop === 'countDocuments') {
          return async (query: any) => {
            let filtered = memoryDb[modelName];
            if (query) {
              filtered = filtered.filter((item: any) => {
                for (const key in query) {
                  if (item[key] !== query[key]) return false;
                }
                return true;
              });
            }
            return filtered.length;
          };
        }
      }

      return Reflect.get(target, prop, receiver);
    }
  });
};
