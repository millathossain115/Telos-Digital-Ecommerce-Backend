export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "TelosCart - E-Commerce Backend API",
    version: "1.0.0",
    description:
      "Official REST API documentation for the TelosCart E-Commerce platform (https://www.teloscart.website/). Supports customer registration, authentication, multi-address management, and isolated admin dashboard operations.",
    contact: {
      name: "Telos Digital Team",
      url: "https://www.teloscart.website/",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "Current API Server (v1)",
    },
    {
      url: "http://localhost:5000/api/v1",
      description: "Local Development Server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "System health check and uptime monitor",
    },
    {
      name: "Auth",
      description: "Customer and Admin authentication, JWT tokens, and session lifecycle",
    },
    {
      name: "Customers",
      description: "Customer management, profiles, and delivery addresses",
    },
    {
      name: "Admins",
      description: "Back-office administrator accounts and dashboard operations",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Provide JWT token in format: Bearer <token>",
      },
    },
    schemas: {
      UserStatus: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      },
      AddressType: {
        type: "string",
        enum: ["SHIPPING", "BILLING"],
      },
      CustomerAddress: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customerId: { type: "string", format: "uuid" },
          title: { type: "string", example: "Home" },
          type: { $ref: "#/components/schemas/AddressType" },
          isDefault: { type: "boolean", example: true },
          street: { type: "string", example: "House 12, Road 4, Dhanmondi" },
          city: { type: "string", example: "Dhaka" },
          state: { type: "string", example: "Dhaka Division" },
          postalCode: { type: "string", example: "1205" },
          country: { type: "string", example: "Bangladesh" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          customerId: { type: "string", example: "TC-2026-1001" },
          name: { type: "string", example: "Rahim Ahmed" },
          email: { type: "string", format: "email", example: "customer@teloscart.website" },
          phone: { type: "string", example: "+8801700000000" },
          avatar: { type: "string", nullable: true },
          status: { $ref: "#/components/schemas/UserStatus" },
          addresses: {
            type: "array",
            items: { $ref: "#/components/schemas/CustomerAddress" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Admin: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "TelosCart Super Admin" },
          email: { type: "string", format: "email", example: "admin@teloscart.website" },
          role: { type: "string", example: "SUPER_ADMIN" },
          phone: { type: "string", nullable: true },
          avatar: { type: "string", nullable: true },
          status: { $ref: "#/components/schemas/UserStatus" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              user: { type: "object" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API status and health",
        responses: {
          200: { description: "Service is operational" },
        },
      },
    },
    "/auth/customer/register": {
      post: {
        tags: ["Auth"],
        summary: "Customer Registration",
        description: "Creates a new customer account with name, email, password, and optional phone.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Rahim Ahmed" },
                  email: { type: "string", format: "email", example: "customer@teloscart.website" },
                  password: { type: "string", minLength: 6, example: "Customer123!" },
                  phone: { type: "string", example: "+8801700000000" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Customer registered successfully" },
          409: { description: "Email already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Unified Login",
        description: "Authenticates either an Admin or Customer automatically.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@teloscart.website" },
                  password: { type: "string", example: "SuperAdmin123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get Current Authenticated Profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Profile retrieved successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/customers": {
      get: {
        tags: ["Customers"],
        summary: "List all customers (Super Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "searchTerm", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/UserStatus" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: { description: "List of customers" },
          403: { description: "Forbidden - Super Admin required" },
        },
      },
    },
  },
};
