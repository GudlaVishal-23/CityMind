export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AI CITY (CityMind) Autonomous Civic Operating System API',
    version: '1.0.0',
    description: 'Enterprise civic intelligence, cognitive dispatch, geospatial analytics, and citizen engagement engine.'
  },
  servers: [
    {
      url: '/api',
      description: 'AI CITY Gateway'
    }
  ],
  tags: [
    { name: 'Health', description: 'System vitality and persistence tier telemetry' },
    { name: 'Auth', description: 'User synchronization and identity verification' },
    { name: 'Incidents', description: 'Civic incident ingestion, retrieval, and media management' },
    { name: 'Officer', description: 'Field officer incident workflow, status transitions, and resolution' },
    { name: 'Admin', description: 'Executive oversight, AI overrides, and audit trails' },
    { name: 'Notifications', description: 'User alerting and message read tracking' },
    { name: 'Feedback', description: 'AI classification feedback and agreement analytics' },
    { name: 'Graph', description: 'Geospatial dependency analysis and field routing' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'System health check and persistence telemetry',
        responses: {
          '200': {
            description: 'Persistence tiers and service operational status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/sync': {
      get: {
        tags: ['Auth'],
        summary: 'Synchronize and verify user identity',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Authenticated user profile' },
          '401': { description: 'Missing or invalid authentication token' }
        }
      },
      post: {
        tags: ['Auth'],
        summary: 'Create or update user profile from auth token',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Profile synchronized successfully' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/incidents': {
      post: {
        tags: ['Incidents'],
        summary: 'Submit a new citizen incident report',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/IncidentInput' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Incident created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IncidentResponse' }
              }
            }
          },
          '200': {
            description: 'Duplicate incident detected and merged',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DuplicateResponse' }
              }
            }
          },
          '400': { description: 'Validation error in submitted payload' },
          '401': { description: 'Unauthorized' }
        }
      },
      get: {
        tags: ['Incidents'],
        summary: 'List incidents with tenant isolation and search filters',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved', 'Rejected']
            }
          },
          {
            name: 'severity',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['Low', 'Medium', 'High', 'Critical']
            }
          },
          {
            name: 'department',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION']
            }
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Sanitized regex-safe text search'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 }
          },
          {
            name: 'all',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Privileged global queue query (Officer/Admin only)'
          }
        ],
        responses: {
          '200': { description: 'Paginated incident queue' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Non-privileged user requested all=true' }
        }
      }
    },
    '/incidents/upload': {
      post: {
        tags: ['Incidents'],
        summary: 'Upload incident media image (Base64)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', description: 'Base64 encoded image string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Image successfully uploaded to Cloudinary' },
          '400': { description: 'Missing image payload' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/incidents/{id}': {
      get: {
        tags: ['Incidents'],
        summary: 'Get incident details by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Incident detail record' },
          '400': { description: 'Invalid incident ID format' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Incident not found or tenant access denied' }
        }
      }
    },
    '/officer/incidents/{id}/status': {
      patch: {
        tags: ['Officer'],
        summary: 'Update incident operational status',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved', 'Rejected']
                  },
                  note: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Status updated and audit log appended' },
          '400': { description: 'Invalid status value or ID' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Requires officer or admin role' },
          '404': { description: 'Incident not found' }
        }
      }
    },
    '/officer/incidents/{id}/close': {
      post: {
        tags: ['Officer'],
        summary: 'Resolve and close an incident with resolution notes',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  resolutionNotes: {
                    type: 'string',
                    minLength: 10,
                    description: 'Detailed closing resolution remarks'
                  },
                  resolutionNote: {
                    type: 'string',
                    minLength: 10,
                    description: 'Alias for resolutionNotes'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Incident closed and marked Resolved' },
          '400': { description: 'Missing or short resolution notes (< 10 chars)' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Incident not found' }
        }
      }
    },
    '/officer/incidents/{id}/accept': {
      post: {
        tags: ['Officer'],
        summary: 'Accept an assigned incident',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Incident accepted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' }
        }
      }
    },
    '/officer/incidents/{id}/reject': {
      post: {
        tags: ['Officer'],
        summary: 'Reject an assigned incident with reason',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: { reason: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Incident rejected and reassigned' },
          '400': { description: 'Missing rejection reason' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' }
        }
      }
    },
    '/officer/incidents/{id}/request-info': {
      post: {
        tags: ['Officer'],
        summary: 'Request clarifying info from reporting citizen',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: { message: { type: 'string' } }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Information request notification dispatched' },
          '400': { description: 'Missing message' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' }
        }
      }
    },
    '/incidents/{id}/override': {
      patch: {
        tags: ['Admin'],
        summary: 'Apply manual administrative override with dual-write transaction',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason'],
                properties: {
                  severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                  department: { type: 'string', enum: ['PWD', 'ELECTRICITY', 'WATER_BOARD', 'SANITATION'] },
                  reason: { type: 'string', minLength: 15 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Override committed to MongoDB and Neo4j' },
          '400': { description: 'Validation error: reason < 15 chars or missing override field' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Admin role required' },
          '404': { description: 'Incident not found' }
        }
      }
    },
    '/incidents/{id}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Admin status transition with audit note',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved', 'Rejected']
                  },
                  note: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Status updated' },
          '400': { description: 'Invalid status' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Admin only' }
        }
      }
    },
    '/incidents/{id}/audit': {
      get: {
        tags: ['Admin'],
        summary: 'Retrieve immutable status history and audit records',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Audit log entries and overrides' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Admin only' }
        }
      }
    },
    '/incidents/{id}/audit/pdf': {
      get: {
        tags: ['Admin'],
        summary: 'Export tamper-evident audit report as PDF',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'PDF stream binary',
            content: { 'application/pdf': {} }
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Admin only' }
        }
      }
    },
    '/analytics/health': {
      get: {
        tags: ['Admin'],
        summary: 'Executive operational health, SLA compliance, and dispatch KPIs',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Operational metrics and department performance' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Admin only' }
        }
      }
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Retrieve user notification inbox and unread count',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of user notifications and unread counter' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark single notification as read (with tenant ownership check)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Notification marked as read' },
          '400': { description: 'Invalid notification ID format' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Notification not found or access denied' }
        }
      }
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read for current user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'All notifications marked as read' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/feedback': {
      post: {
        tags: ['Feedback'],
        summary: 'Submit AI confidence feedback comparing AI vs officer decisions',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['incidentId', 'reason'],
                properties: {
                  incidentId: { type: 'string' },
                  aiSeverity: { type: 'string' },
                  officerSeverity: { type: 'string' },
                  aiDepartment: { type: 'string' },
                  officerDepartment: { type: 'string' },
                  reason: { type: 'string', minLength: 10 }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Feedback logged for cognitive retraining' },
          '400': { description: 'Validation error: reason < 10 chars' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Officer or Admin only' }
        }
      }
    },
    '/feedback/stats': {
      get: {
        tags: ['Feedback'],
        summary: 'Retrieve AI vs Human agreement rates and recent feedback',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Agreement metrics and feedback history' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Admin only' }
        }
      }
    },
    '/graph/route': {
      post: {
        tags: ['Graph'],
        summary: 'Execute Graph Cypher routing traversal for incident',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['department', 'lat', 'lng'],
                properties: {
                  department: { type: 'string' },
                  lat: { type: 'number' },
                  lng: { type: 'number' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Optimized municipal dispatch routing result' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Officer or Admin only' }
        }
      }
    },
    '/graph/officers/nearest': {
      get: {
        tags: ['Graph'],
        summary: 'Find nearest available field officers by geospatial coordinates',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
          { name: 'department', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'List of nearest officers with sanitized credentials' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden: Officer or Admin only' }
        }
      }
    },
    '/graph/wards/stats': {
      get: {
        tags: ['Graph'],
        summary: 'Ward incident density and SLA statistics',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Ward analytics and hot-spot indicators' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/graph/clusters': {
      get: {
        tags: ['Graph'],
        summary: 'Civic spatial and infrastructure asset dependency clusters',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Graph clustering and dependency chains' },
          '401': { description: 'Unauthorized' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'CityMind / Firebase Admin Bearer JWT authentication header'
      }
    },
    schemas: {
      IncidentInput: {
        type: 'object',
        required: ['title', 'description', 'imageUrl', 'location'],
        properties: {
          title: { type: 'string', minLength: 5, maxLength: 100 },
          description: { type: 'string', minLength: 10 },
          imageUrl: { type: 'string', format: 'uri' },
          location: {
            type: 'object',
            required: ['lat', 'lng'],
            properties: {
              lat: { type: 'number', minimum: -90, maximum: 90 },
              lng: { type: 'number', minimum: -180, maximum: 180 }
            }
          }
        }
      },
      IncidentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          duplicateFound: { type: 'boolean', example: false },
          data: { type: 'object' }
        }
      },
      DuplicateResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          duplicateFound: { type: 'boolean', example: true },
          parentIncidentId: { type: 'string' },
          message: { type: 'string' }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'OK' },
          timestamp: { type: 'string', format: 'date-time' },
          persistence: {
            type: 'object',
            properties: {
              mongoTier: { type: 'string' },
              isMongoConnected: { type: 'boolean' },
              mongoMemoryRecords: { type: 'number' },
              neo4jMode: { type: 'string' },
              isNeo4jConnected: { type: 'boolean' },
              graphMemoryNodes: { type: 'number' }
            }
          }
        }
      }
    }
  }
};

export default openApiSpec;
