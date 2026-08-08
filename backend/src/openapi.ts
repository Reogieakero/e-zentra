export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Zentra School Information System API',
    version: '1.0.0',
    description:
      'REST API for Zentra, a school information system covering identity, academic structure, ' +
      'anecdotal records, referrals, specialist modules, ADM process, attendance & grading, risk ' +
      'classification, access control, student-facing records and notifications.',
  },
  servers: [{ url: '/api/v1', description: 'API base path' }],
  tags: [
    { name: 'Auth', description: 'Registration, login, refresh, logout' },
    { name: 'Users', description: 'Account listing, approval and rejection' },
    { name: 'Academic Structure', description: 'School years, terms, subjects, teacher assignments, adviser access' },
    { name: 'Anecdotal & Referrals', description: 'Anecdotal records, follow-ups and specialist referrals' },
    { name: 'Health & Home Visitation', description: 'Clinic records and home visitation / certification' },
    { name: 'ADM Process', description: 'ADM learner profiles, parent meetings and learning modules' },
    { name: 'Attendance & Grading', description: 'Attendance, assessments, student grades and final grade workflow' },
    { name: 'Risk & Oversight', description: 'Risk assessments, record flags, reflections, report cards' },
    { name: 'Notifications', description: 'User notification inbox' },
    { name: 'Sections', description: 'Class sections and section rosters' },
    { name: 'Parent Links', description: 'Parent-student link request, confirm and rejection' },
    { name: 'Uploads', description: 'Multipart file uploads (profile photos, report cards, ADM photos)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object', additionalProperties: true },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },
      Role: {
        type: 'string',
        enum: ['student', 'parent', 'teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse'],
      },
      AccountStatus: { type: 'string', enum: ['pending', 'active', 'inactive', 'suspended', 'rejected'] },
      GradeLevel: { type: 'string', enum: ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'] },
      GradeBand: { type: 'string', enum: ['junior_high', 'senior_high'] },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          middleName: { type: 'string', nullable: true },
          lastName: { type: 'string' },
          suffix: { type: 'string', nullable: true },
          role: { $ref: '#/components/schemas/Role' },
          provisioningType: { type: 'string', enum: ['self_registered', 'hardcoded'] },
          contactNumber: { type: 'string', nullable: true },
          profilePhotoUrl: { type: 'string', nullable: true },
          accountStatus: { $ref: '#/components/schemas/AccountStatus' },
          approvedBy: { type: 'string', format: 'uuid', nullable: true },
          approvedAt: { type: 'string', format: 'date-time', nullable: true },
          isVerified: { type: 'boolean' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
        required: ['accessToken', 'refreshToken'],
      },
      LoginResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { user: { $ref: '#/components/schemas/User' }, tokens: { $ref: '#/components/schemas/Tokens' } },
          },
        },
      },
    },
  },
  paths: {
    '/auth/register/student': {
      post: {
        tags: ['Auth'],
        summary: 'Register a student account (pending until approved by grade-band owner)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'lrn', 'birthdate', 'sex', 'gradeLevel'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  middleName: { type: 'string' },
                  lastName: { type: 'string' },
                  suffix: { type: 'string' },
                  contactNumber: { type: 'string' },
                  lrn: { type: 'string' },
                  birthdate: { type: 'string', format: 'date' },
                  sex: { type: 'string', enum: ['male', 'female'] },
                  gradeLevel: { $ref: '#/components/schemas/GradeLevel' },
                  sectionId: { type: 'string', format: 'uuid' },
                  address: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Student registered' },
          409: { $ref: '#/components/responses/ErrorResponse' },
          422: { $ref: '#/components/responses/ErrorResponse' },
          429: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/auth/register/parent': {
      post: {
        tags: ['Auth'],
        summary: 'Register a parent account with an optional pending child link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'relationship'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  middleName: { type: 'string' },
                  lastName: { type: 'string' },
                  suffix: { type: 'string' },
                  contactNumber: { type: 'string' },
                  relationship: { type: 'string', enum: ['mother', 'father', 'guardian'] },
                  occupation: { type: 'string' },
                  address: { type: 'string' },
                  childEmail: { type: 'string', format: 'email' },
                  childLrn: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Parent registered' },
          409: { $ref: '#/components/responses/ErrorResponse' },
          422: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/auth/register/teacher': {
      post: {
        tags: ['Auth'],
        summary: 'Register a teacher account (pending until approved by the Registrar)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'employeeId'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  middleName: { type: 'string' },
                  lastName: { type: 'string' },
                  suffix: { type: 'string' },
                  contactNumber: { type: 'string' },
                  employeeId: { type: 'string' },
                  department: { type: 'string' },
                  dateHired: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Teacher registered' },
          409: { $ref: '#/components/responses/ErrorResponse' },
          422: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive access + refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/LoginResponse' },
          401: { $ref: '#/components/responses/ErrorResponse' },
          429: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue new access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/LoginResponse' },
          401: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke a refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
            },
          },
        },
        responses: { 204: { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Current user' }, 401: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change own password (revokes all refresh tokens)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } },
            },
          },
        },
        responses: { 204: { description: 'Password changed' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List accounts (pending approval, students, etc.)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/AccountStatus' } },
          { name: 'role', in: 'query', schema: { $ref: '#/components/schemas/Role' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated user list' }, 401: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/users/{id}/approve': {
      post: {
        tags: ['Users'],
        summary: 'Approve a pending account. Record Keeper approves grades 7-10; Registrar approves grades 11-12 and all teachers.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Account approved' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          404: { $ref: '#/components/responses/ErrorResponse' },
          409: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/users/{id}/reject': {
      post: {
        tags: ['Users'],
        summary: 'Reject a pending account (grade-band owner only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Account rejected' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          404: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },


    '/school-years': {
      get: {
        tags: ['Academic Structure'],
        summary: 'List school years (offset pagination)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated school years' } },
      },
      post: {
        tags: ['Academic Structure'],
        summary: 'Create a school year (Principal only)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/school-years/{id}': {
      get: {
        tags: ['Academic Structure'],
        summary: 'Get a single school year',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'School year' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
      patch: {
        tags: ['Academic Structure'],
        summary: 'Update a school year (Principal only)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/terms': {
      get: {
        tags: ['Academic Structure'],
        summary: 'List terms',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated terms' } },
      },
      post: {
        tags: ['Academic Structure'],
        summary: 'Create a term (Principal only)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/terms/{id}': {
      get: {
        tags: ['Academic Structure'],
        summary: 'Get a single term',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Term' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/terms/{id}/transition': {
      post: {
        tags: ['Academic Structure'],
        summary: 'Transition a term status. Record Keeper owns JHS; Registrar owns SHS.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Term status updated' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/subjects': {
      get: {
        tags: ['Academic Structure'],
        summary: 'List subjects (grade-banded)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated subjects' } },
      },
      post: {
        tags: ['Academic Structure'],
        summary: 'Create a subject. Record Keeper owns JHS; Registrar owns SHS.',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/subjects/{id}': {
      get: {
        tags: ['Academic Structure'],
        summary: 'Get a single subject',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Subject' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/assignments': {
      get: {
        tags: ['Academic Structure'],
        summary: 'List teacher-subject assignments',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated assignments' } },
      },
      post: {
        tags: ['Academic Structure'],
        summary: 'Assign a teacher to a subject/section for a school year (grade-band owner)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/assignments/me': {
      get: {
        tags: ['Academic Structure'],
        summary: 'List my teaching assignments (teacher)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated assignments' } },
      },
    },
    '/assignments/{id}/deactivate': {
      patch: {
        tags: ['Academic Structure'],
        summary: 'Deactivate a teacher-subject assignment (grade-band owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Deactivated' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/adviser-access-requests': {
      get: {
        tags: ['Academic Structure'],
        summary: 'List adviser access requests',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated requests' } },
      },
      post: {
        tags: ['Academic Structure'],
        summary: 'Request fuller record access (teacher/adviser)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/adviser-access-requests/{id}/review': {
      post: {
        tags: ['Academic Structure'],
        summary: 'Approve or deny an adviser access request (grade-band owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Reviewed' }, 409: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },


    '/anecdotal-records': {
      get: {
        tags: ['Anecdotal & Referrals'],
        summary: 'List anecdotal records (confidentiality-aware)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated records' } },
      },
      post: {
        tags: ['Anecdotal & Referrals'],
        summary: 'File an anecdotal record (adviser, assigned subject teacher, or Guidance Counselor)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/anecdotal-records/{id}': {
      get: {
        tags: ['Anecdotal & Referrals'],
        summary: 'Get a single anecdotal record',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Record' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/anecdotal-records/{id}/followups': {
      post: {
        tags: ['Anecdotal & Referrals'],
        summary: 'Add a follow-up to an anecdotal record',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/referrals': {
      get: {
        tags: ['Anecdotal & Referrals'],
        summary: 'List referrals',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated referrals' } },
      },
      post: {
        tags: ['Anecdotal & Referrals'],
        summary: 'Create a referral from an anecdotal record (observer or Guidance Counselor)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/referrals/{id}': {
      get: {
        tags: ['Anecdotal & Referrals'],
        summary: 'Get a single referral',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Referral' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/referrals/{id}/status': {
      patch: {
        tags: ['Anecdotal & Referrals'],
        summary: 'Update referral status (receiving specialist role)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },


    '/health-records': {
      get: {
        tags: ['Health & Home Visitation'],
        summary: 'List health records (confidentiality-aware)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated records' } },
      },
      post: {
        tags: ['Health & Home Visitation'],
        summary: 'Record a clinic visit (Nurse only)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/health-records/{id}': {
      get: {
        tags: ['Health & Home Visitation'],
        summary: 'Get a single health record',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Record' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/home-visits': {
      get: {
        tags: ['Health & Home Visitation'],
        summary: 'List home visitations',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated records' } },
      },
      post: {
        tags: ['Health & Home Visitation'],
        summary: 'Record a home visitation (adviser for ADM follow-up, Guidance Counselor for counseling)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/home-visits/{id}': {
      get: {
        tags: ['Health & Home Visitation'],
        summary: 'Get a single home visitation record',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Record' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/home-visits/{id}/certify': {
      post: {
        tags: ['Health & Home Visitation'],
        summary: 'Issue a certification for a home visit (Guidance Counselor)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Certified' } },
      },
    },


    '/adm-profiles': {
      get: {
        tags: ['ADM Process'],
        summary: 'List ADM learner profiles',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated profiles' } },
      },
      post: {
        tags: ['ADM Process'],
        summary: 'Prepare an ADM learner profile (ADM Coordinator)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/adm-profiles/{id}': {
      get: {
        tags: ['ADM Process'],
        summary: 'Get a single ADM learner profile',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Profile' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/adm-profiles/{id}/submit': {
      post: {
        tags: ['ADM Process'],
        summary: 'Submit a draft ADM profile (ADM Coordinator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Submitted' } },
      },
    },
    '/adm-profiles/{id}/approve': {
      post: {
        tags: ['ADM Process'],
        summary: 'Approve an ADM profile (Principal)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Approved' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/adm-meetings': {
      post: {
        tags: ['ADM Process'],
        summary: 'Record a parent meeting for an ADM profile (ADM Coordinator)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/adm-profiles/{id}/modules': {
      post: {
        tags: ['ADM Process'],
        summary: 'Release a learning module for an approved ADM profile (ADM Coordinator)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 201: { description: 'Released' }, 409: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/adm-modules/{id}/submit': {
      post: {
        tags: ['ADM Process'],
        summary: 'Submit a completed ADM module (student or staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Submitted' } },
      },
    },


    '/grade-components': {
      get: {
        tags: ['Attendance & Grading'],
        summary: 'List grade components',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated components' } },
      },
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Set the full grade component set for a subject/term (must sum to 100; grade-band owner)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Set' }, 403: { $ref: '#/components/responses/ErrorResponse' }, 422: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/assessments': {
      get: {
        tags: ['Attendance & Grading'],
        summary: 'List assessments',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated assessments' } },
      },
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Create an assessment (assigned teacher)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/student-grades': {
      get: {
        tags: ['Attendance & Grading'],
        summary: 'List student grades',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated grades' } },
      },
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Record a student grade (assigned teacher). Rejected with 409 once the final grade is locked.',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' }, 409: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/final-grades': {
      get: {
        tags: ['Attendance & Grading'],
        summary: 'List final grades',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated final grades' } },
      },
    },
    '/final-grades/compute': {
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Compute/upsert a student final grade (assigned teacher); triggers risk recomputation',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Computed' }, 409: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/final-grades/{id}/finalize': {
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Finalize a final grade (assigned teacher)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Finalized' } },
      },
    },
    '/final-grades/{id}/lock': {
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Lock a final grade; blocks further grade edits (assigned teacher)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Locked' } },
      },
    },


    '/risk-assessments': {
      get: {
        tags: ['Risk & Oversight'],
        summary: 'List student risk assessments (staff)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated risk assessments' } },
      },
    },
    '/risk-assessments/assess': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Assess a student risk (computed from grades, attendance, anecdotal records)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Assessed' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/record-flags': {
      get: {
        tags: ['Risk & Oversight'],
        summary: 'List record flags',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated flags' } },
      },
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Flag a record for review',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/record-flags/{id}/resolve': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Resolve an open record flag',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Resolved' } },
      },
    },
    '/record-flags/{id}/escalate': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Escalate a record flag to the Principal',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Escalated' } },
      },
    },
    '/reflections': {
      get: {
        tags: ['Risk & Oversight'],
        summary: 'List student reflections',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated reflections' } },
      },
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Create a student reflection',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/report-cards': {
      get: {
        tags: ['Risk & Oversight'],
        summary: 'List report cards',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated report cards' } },
      },
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Create a report card (record custodian or Principal)',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } },
      },
    },
    '/report-cards/generate': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Auto-generate ready report cards from final grades for a term (record custodian or Principal)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['termId'], properties: { termId: { type: 'string', format: 'uuid' } } },
            },
          },
        },
        responses: {
          201: { description: 'Generated; body contains data (cards) and created count' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          404: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/report-cards/{id}/ready': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Mark a report card ready',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Ready' } },
      },
    },
    '/report-cards/{id}/release': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Release a report card (notifies the student)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Released' } },
      },
    },
    '/ocr/jobs/{id}': {
      get: {
        tags: ['Risk & Oversight'],
        summary: 'Get an OCR job and its status (job owner or records admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'OCR job' } },
      },
    },
    '/report-cards/{id}/extraction': {
      get: {
        tags: ['Risk & Oversight'],
        summary: 'Get the staged OCR extraction for a scanned report card (records admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Extraction' } },
      },
    },
    '/report-cards/{id}/extraction/approve': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Approve a verified OCR extraction; final grades are written and the card becomes ready (records admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  corrections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        subjectCode: { type: 'string' },
                        from: { type: 'number', nullable: true },
                        to: { type: 'number', nullable: true },
                        remarks: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Approved' } },
      },
    },
    '/report-cards/{id}/extraction/reject': {
      post: {
        tags: ['Risk & Oversight'],
        summary: 'Reject an OCR extraction that cannot be verified (records admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { reason: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: 'Rejected' } },
      },
    },


    '/sections': {
      get: {
        tags: ['Sections'],
        summary: 'List class sections (offset pagination, filters by school year / grade level / status)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'schoolYearId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'gradeLevel', in: 'query', schema: { $ref: '#/components/schemas/GradeLevel' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'archived'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated sections' }, 401: { $ref: '#/components/responses/ErrorResponse' } },
      },
      post: {
        tags: ['Sections'],
        summary: 'Create a class section (grade-band owner)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sectionName', 'gradeLevel', 'schoolYearId'],
                properties: {
                  sectionName: { type: 'string', maxLength: 50 },
                  gradeLevel: { $ref: '#/components/schemas/GradeLevel' },
                  adviserId: { type: 'string', format: 'uuid' },
                  schoolYearId: { type: 'string', format: 'uuid' },
                  maxStudents: { type: 'integer', minimum: 1, maximum: 1000 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' }, 422: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/sections/{id}': {
      get: {
        tags: ['Sections'],
        summary: 'Get a single section',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Section' }, 404: { $ref: '#/components/responses/ErrorResponse' } },
      },
      patch: {
        tags: ['Sections'],
        summary: 'Update a section (grade-band owner)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sectionName: { type: 'string', maxLength: 50 },
                  adviserId: { type: 'string', format: 'uuid', nullable: true },
                  maxStudents: { type: 'integer', nullable: true },
                  status: { type: 'string', enum: ['active', 'archived'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/sections/{id}/students': {
      get: {
        tags: ['Sections'],
        summary: 'List students enrolled in a section (section adviser, assigned subject teacher, or staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Paginated students' } },
      },
    },
    '/sections/{id}/attendance': {
      post: {
        tags: ['Attendance & Grading'],
        summary: 'Mark attendance for a section session (section adviser or assigned subject teacher)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['termId', 'attendanceDate', 'session', 'records'],
                properties: {
                  termId: { type: 'string', format: 'uuid' },
                  attendanceDate: { type: 'string', format: 'date' },
                  session: { type: 'string', enum: ['morning', 'afternoon'] },
                  records: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 100,
                    items: {
                      type: 'object',
                      required: ['studentId', 'status'],
                      properties: {
                        studentId: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] },
                        remarks: { type: 'string', maxLength: 1000 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Created' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
      get: {
        tags: ['Attendance & Grading'],
        summary: 'List section attendance records (section adviser, assigned subject teacher, or staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Paginated attendance' } },
      },
    },
    '/students/{id}/attendance': {
      get: {
        tags: ['Attendance & Grading'],
        summary: 'List a student\'s own attendance (student, confirmed parent, or staff)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Paginated attendance' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/attendance/{id}': {
      patch: {
        tags: ['Attendance & Grading'],
        summary: 'Update an attendance record (section adviser or assigned subject teacher)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] },
                  remarks: { type: 'string', maxLength: 1000, nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/parent-links': {
      get: {
        tags: ['Parent Links'],
        summary: 'List parent links. A parent sees only their own; custodians and the Principal may filter by parent/student/status.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending_confirmation', 'confirmed', 'rejected'] } },
          { name: 'parentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'studentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'Paginated parent links' }, 401: { $ref: '#/components/responses/ErrorResponse' } },
      },
      post: {
        tags: ['Parent Links'],
        summary: 'Request a parent-student link by studentId or LRN (parent only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                oneOf: [{ required: ['studentId'] }, { required: ['lrn'] }],
                properties: {
                  studentId: { type: 'string', format: 'uuid' },
                  lrn: { type: 'string', minLength: 5, maxLength: 20 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Link requested' }, 409: { $ref: '#/components/responses/ErrorResponse' }, 422: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/parent-links/{id}/confirm': {
      post: {
        tags: ['Parent Links'],
        summary: 'Confirm a pending parent link (the linked parent via app, or a custodian/Principal on record)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Confirmed' }, 403: { $ref: '#/components/responses/ErrorResponse' }, 404: { $ref: '#/components/responses/ErrorResponse' }, 409: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/parent-links/{id}/reject': {
      post: {
        tags: ['Parent Links'],
        summary: 'Reject a pending parent link (the linked parent via app, or a custodian/Principal on record)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Rejected' }, 403: { $ref: '#/components/responses/ErrorResponse' }, 404: { $ref: '#/components/responses/ErrorResponse' }, 409: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/uploads/{kind}': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload a file (multipart field "file"). Kinds: profile-photo, report-card, adm-photo. Each kind restricts which roles may upload.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: ['profile-photo', 'report-card', 'adm-photo'] } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Uploaded; data includes url, fileName, size, mimeType' },
          400: { $ref: '#/components/responses/ErrorResponse' },
          403: { $ref: '#/components/responses/ErrorResponse' },
          422: { $ref: '#/components/responses/ErrorResponse' },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List my notifications (cursor pagination)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Paginated notifications' } },
      },
    },
    '/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Count my unread notifications',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Unread count' } },
      },
    },
    '/notifications/{id}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark one notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Marked read' }, 403: { $ref: '#/components/responses/ErrorResponse' } },
      },
    },
    '/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark all my notifications as read',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Marked all read' } },
      },
    },
  },
};

(openApiSpec as { components: Record<string, unknown> }).components = {
  ...(openApiSpec as { components: Record<string, unknown> }).components,
  responses: {
    ErrorResponse: {
      description: 'Error response',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/Error' } },
      },
    },
    LoginResponse: {
      description: 'Successful login',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
      },
    },
  },
};

export type OpenApiSpec = typeof openApiSpec;
