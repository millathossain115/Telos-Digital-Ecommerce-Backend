# Project Knowledge & AI Architecture Playbook - TelosCart E-Commerce Backend

> **ROLE & ARCHITECTURAL MINDSET:**
> Act as a **Staff / Principal E-Commerce Backend Engineer & System Architect with 10+ years of enterprise experience**.
> When writing, extending, or maintaining code in this repository, use this playbook as your single source of truth. Build clean, modular, scalable, and production-ready code that adheres to strict financial integrity, deterministic decimal math, domain-driven isolation, and role-based security. Any AI agent or developer reading this file can understand and extend the entire backend without needing to re-scan every source file.

---

## 1. Project Overview & Tech Stack

- **Product Name**: **TelosCart**
- **Official Website**: [https://www.teloscart.website/](https://www.teloscart.website/)
- **Repository / Package Name**: `teloscart-backend`
- **Application Purpose**: Scalable, high-performance E-Commerce Backend API providing customer authentication, multi-address management, product catalogs, cart, order processing, and back-office store administration.
- **Runtime**: **Node.js (LTS v20+ / v22+)**
- **Language**: **TypeScript 5.7+** (Strict mode enabled, zero implicit `any`)
- **Web Framework**: **Express.js 4.21+**
- **Database**: **PostgreSQL 16+**
- **ORM & Migrations**: **Prisma ORM 5.22+**
- **Validation**: **Zod 3.24+** (Runtime schema validation for body, query, params)
- **Authentication**: **JWT (`jsonwebtoken`) + Secure HTTP-only Cookies / Bearer Tokens** + **`bcryptjs`**
- **Documentation**: **Swagger UI / OpenAPI 3.0** (`swagger-ui-express` mounted at `/api/v1/docs`)
- **API Base Route**: `/api/v1`

---

## 2. Directory Architecture & Responsibilities

```
Telos Digital Ecommerce Backend/
├── prisma/
│   ├── schema.prisma              # Database schema (Datasource, Enums, Models, Relations)
│   ├── migrations/                # Version-controlled Prisma database migration files
│   └── seed.ts                    # Database seeder (seeds Super Admin & Demo Customer)
│
├── project-docs/
│   ├── KNOWLEDGE.md               # Architectural single source of truth (this file)
│   └── FEATURES_TRACKER.md        # Master feature and deliverables checklist
│
├── src/
│   ├── app.ts                     # Express app setup, CORS, parsers, global middlewares, Swagger & root route
│   ├── server.ts                  # HTTP server bootstrapper, port listener, graceful shutdown & uncaught error traps
│   │
│   ├── config/
│   │   └── index.ts               # Centralized typed environment variables loaded from .env
│   │
│   ├── docs/
│   │   └── swagger.ts             # Complete OpenAPI 3.0 JSON specification for Swagger UI
│   │
│   ├── errors/                    # Operational error classes & specialized error formatters
│   │   ├── AppError.ts            # Custom operational error class extending Error (statusCode, message)
│   │   ├── handleZodError.ts      # Formats Zod validation issues into standardized errorSources
│   │   ├── handlePrismaError.ts   # Maps Prisma Client known request codes (P2002, P2003, P2025)
│   │   └── handleJWTError.ts      # Catches TokenExpiredError & JsonWebTokenError (401 Unauthorized)
│   │
│   ├── interface/                 # Global TypeScript types & namespace extensions
│   │   ├── error.ts               # TErrorSource & TGenericErrorResponse contracts
│   │   └── index.d.ts             # Express.Request augmentation (declares req.user: TAuthUser)
│   │
│   ├── lib/                       # Third-party client singletons & wrappers
│   │   └── prisma.ts              # Global PrismaClient singleton (prevents connection leaks during dev reload)
│   │
│   ├── middlewares/               # Express middleware chain
│   │   ├── auth.ts                # JWT authentication, Bearer parsing, active-status checks, and RBAC
│   │   ├── globalErrorHandler.ts  # Master error interceptor; sanitizes production outputs
│   │   ├── notFound.ts            # 404 handler for undefined API routes
│   │   └── validateRequest.ts     # Zod schema validation middleware for body, query, params
│   │
│   ├── modules/                   # Domain-Driven Feature Modules (Clean Modular Architecture)
│   │   ├── Health/                # Health check & system uptime endpoint
│   │   │   ├── health.controller.ts
│   │   │   └── health.route.ts
│   │   │
│   │   ├── Auth/                  # Customer & Admin Authentication, JWT lifecycle, register, login, refresh, getMe
│   │   │   ├── auth.interface.ts
│   │   │   ├── auth.validation.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.route.ts
│   │   │
│   │   ├── Customer/              # E-commerce shopper management & multi-address operations
│   │   │   ├── customer.interface.ts
│   │   │   ├── customer.constant.ts
│   │   │   ├── customer.validation.ts
│   │   │   ├── customer.service.ts
│   │   │   ├── customer.controller.ts
│   │   │   └── customer.route.ts
│   │   │
│   │   ├── Admin/                 # Back-office store administrators & management
│   │   │   ├── admin.interface.ts
│   │   │   ├── admin.constant.ts
│   │   │   ├── admin.validation.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── admin.controller.ts
│   │   │   └── admin.route.ts
│   │   │
│   │   ├── Category/              # Main categories, separate sub_categories, slugs, icons, R2 imagery
│   │   ├── Brand/                 # Official brands (flat, no children), taglines, marquee featuring, slugs, R2 imagery
│   │   ├── Product/               # [Upcoming] Catalog items, SKU, variants, stock, pricing, image assets
│   │   ├── Cart/                  # [Upcoming] Customer shopping cart & guest session cart
│   │   ├── Order/                 # [Upcoming] Checkout, order status pipeline, invoice numbering
│   │   └── Payment/               # [Upcoming] Payment gateway (bKash/Nagad/Stripe/SSLCommerz/COD)
│   │
│   ├── routes/
│   │   └── index.ts               # Master router aggregating all module routers under /api/v1
│   │
│   └── shared/                    # Reusable cross-cutting utilities
│       ├── catchAsync.ts          # Higher-order function wrapping async controllers to route errors to next()
│       ├── sendResponse.ts        # Standardized JSON success response envelope
│       ├── paginationHelper.ts    # Reusable pagination math & meta generator with safety caps (DoS protection)
│       └── filterHelper.ts        # Reusable Prisma text search, date range & safe sort order builders
│
├── .env                           # Local environment secrets (ignored by Git)
├── .env.example                   # Environment configuration template for team members
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies, scripts, project metadata
├── start.bat                      # 1-click startup script for Windows developers
└── tsconfig.json                  # TypeScript compiler settings
```

---

## 3. The Modular Architecture Pattern (Apollo-Level 2 Standard)

Every feature module in `src/modules/<ModuleName>/` adheres strictly to this 6-file structure:

```
src/modules/<ModuleName>/
├── <module>.interface.ts   # Type definitions (payloads, filters, query parameters)
├── <module>.constant.ts    # Module constants (searchable fields, filterable fields, enums)
├── <module>.validation.ts  # Zod validation schemas for incoming HTTP requests
├── <module>.service.ts     # Business logic, Prisma queries, data transformation, password hashing
├── <module>.controller.ts # Express handlers: parses inputs, calls service, wraps in catchAsync & sendResponse
└── <module>.route.ts      # Express Router: binds URL path, auth() middleware, validateRequest(), and controller
```

### Data Flow Lifecycle:
1. **HTTP Request** arrives at `/api/v1/<module>`.
2. **`auth(...roles)`** verifies the JWT `Bearer <token>`, checks user active status, and enforces RBAC (`SUPER_ADMIN` check).
3. **`validateRequest(schema)`** validates `req.body`, `req.query`, and `req.params` against the Zod schema.
4. **`<module>.controller.ts`** extracts sanitized parameters and passes them to `<module>.service.ts`.
5. **`<module>.service.ts`** executes business logic, interacts with PostgreSQL via `prisma`, and performs deterministic computations.
6. **`sendResponse(res, { statusCode, success, message, data, meta })`** returns a normalized JSON response.
7. If any error throws, **`catchAsync`** catches it and forwards it directly to **`globalErrorHandler`**.

---

## 4. Standard Response Envelope (`sendResponse`)

All successful API responses **MUST** use `sendResponse()` from `src/shared/sendResponse.ts`. Never use ad-hoc `res.json()` in controllers.

```ts
sendResponse(res, {
  statusCode: httpStatus.OK,
  success: true,
  message: 'Customers retrieved successfully',
  meta: {
    page: 1,
    limit: 20,
    total: 42,
    totalPage: 3,
  },
  data: customers,
});
```

### Response Schema:
```json
{
  "success": true,
  "message": "Human-readable confirmation message",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPage": 3
  },
  "data": { ... }
}
```

---

## 5. Global Error Handling Strategy & Standard

All errors thrown in controllers, services, or middleware are centralized in `src/middlewares/globalErrorHandler.ts`.

### Error Response Schema:
```json
{
  "success": false,
  "message": "Brief error category",
  "errorSources": [
    {
      "path": "email",
      "message": "Invalid email address format"
    }
  ],
  "stack": "Error: ... (development only)"
}
```

### Handled Error Classes:
| Error Type | HTTP Status | Handler | Description |
| :--- | :--- | :--- | :--- |
| **Zod Validation** (`ZodError`) | `400 BAD REQUEST` | `handleZodError.ts` | Formats validation issues with offending field paths. |
| **Unique Constraint** (`P2002`) | `409 CONFLICT` | `handlePrismaError.ts` | Detects duplicate email/code and identifies offending field. |
| **Foreign Key Violation** (`P2003`) | `400 BAD REQUEST` | `handlePrismaError.ts` | Prevents orphan records. |
| **Record Not Found** (`P2025`) | `404 NOT FOUND` | `handlePrismaError.ts` | Standardizes missing record errors. |
| **Prisma Schema Mismatch** | `400 BAD REQUEST` | Direct mapping | Database validation error. |
| **Prisma Connection Lost** | `503 SERVICE UNAVAILABLE` | Direct mapping | Returns database connection unavailable message. |
| **JWT Expired** (`TokenExpiredError`) | `401 UNAUTHORIZED` | `handleJWTError.ts` | Clean message requesting user to log in again. |
| **JWT Invalid / Tampered** (`JsonWebTokenError`) | `401 UNAUTHORIZED` | `handleJWTError.ts` | Clean token invalid message. |
| **Operational Error** (`AppError`) | `err.statusCode` | Direct mapping | Custom business logic errors thrown deliberately. |
| **Uncaught JavaScript Error** | `500 INTERNAL SERVER ERROR` | Fallback | Generic error message (raw SQL / server paths never leaked in prod). |

---

## 6. Routing & Aggregator Architecture

All modules register their routes in `src/routes/index.ts`:

```ts
import { Router } from "express";
import { AdminRoutes } from "../modules/Admin/admin.route";
import { AuthRoutes } from "../modules/Auth/auth.route";
import { CustomerRoutes } from "../modules/Customer/customer.route";
import { HealthRoutes } from "../modules/Health/health.route";

const router = Router();

const moduleRoutes = [
  { path: "/health", route: HealthRoutes },
  { path: "/auth", route: AuthRoutes },
  { path: "/customers", route: CustomerRoutes },
  { path: "/admins", route: AdminRoutes },
  // Upcoming e-commerce modules:
  // { path: "/categories", route: CategoryRoutes },
  // { path: "/products", route: ProductRoutes },
  // { path: "/cart", route: CartRoutes },
  // { path: "/orders", route: OrderRoutes },
  // { path: "/payments", route: PaymentRoutes },
  // { path: "/reviews", route: ReviewRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
```

In `src/app.ts`, this router is mounted at:
```ts
app.use("/api/v1", router);
```

---

## 7. Swagger / OpenAPI 3.0 Documentation Standard

Interactive API documentation is powered by **Swagger UI** (`swagger-ui-express`).

- **Access URLs**:
  - `http://localhost:5001/api/v1/docs`
  - `http://localhost:5001/docs`
- **Spec File**: `src/docs/swagger.ts`

### ⚠️ MANDATORY RULE FOR FUTURE APIS & MODULES:
**Whenever you create or modify any endpoint or module:**
1. Open `src/docs/swagger.ts`.
2. Add or update the endpoint's path under `paths: { ... }`.
3. Specify its tags, summary, security (`bearerAuth`), request body schema, and response schemas.
4. Add any new data models or DTOs under `components.schemas`.
5. This ensures the frontend team and clients always have an up-to-date, live, testable API reference.

---

## 8. Non-Negotiable E-Commerce & Financial Integrity Rules

1. **Clean Domain Separation (No Generic User Bloat)**:
   - Shoppers are strictly represented in the `Customer` table (`customers`).
   - Store managers are strictly represented in the `Admin` table (`admins`).
   - Never mix administrative staff into customer queries, marketing lists, or sales analytics.
2. **Lean & Frictionless Customer Registration**:
   - Initial registration must remain fast: only full name (`name` or `fullName`), `email`, required unique `phone`, and `password`.
   - Full shipping and billing addresses must **never** be forced during registration; they belong in the dedicated `CustomerAddress` model at checkout or in profile settings.
3. **No Floating-Point Math for Money**:
   - Store all currency amounts (prices, discounts, taxes, shipping fees, totals) in PostgreSQL as `Decimal(12, 2)` or integer cents.
   - Never use standard JavaScript `number` arithmetic for financial totals (`0.1 + 0.2 != 0.3`).
4. **Universal Soft Delete Policy**:
   - Customer and admin records must never be hard-deleted from the database (`isDeleted: true`, `deletedAt: new Date()`).
5. **Customer Data Isolation**:
   - Customers must **NEVER** be able to view or modify another customer's profile, address, or orders. Enforce `req.user.role === 'CUSTOMER' ? req.user.id === targetId : true` in services.
6. **Hardcoded Administrative Route Protection**:
   - Back-office endpoints (managing customers, admins, stock, orders, settings) must enforce `auth("SUPER_ADMIN")`.

---

## 9. Step-by-Step Recipe: Adding a New E-Commerce Module

When creating a new module (e.g., `Product` or `Category`):

1. **Update `prisma/schema.prisma`**:
   - Define model(s), relations, and enums.
   - Run `npx prisma migrate dev --name init_<module>` and `npx prisma generate`.
2. **Create `src/modules/<ModuleName>/`**:
   - `<module>.interface.ts`: Filter & payload types.
   - `<module>.constant.ts`: Searchable/filterable fields.
   - `<module>.validation.ts`: Zod schemas for create/update.
   - `<module>.service.ts`: Prisma database queries with pagination & filtering.
   - `<module>.controller.ts`: Wrappers with `catchAsync` and `sendResponse`.
   - `<module>.route.ts`: Router with `auth(...)` and `validateRequest(...)`.
3. **Mount in `src/routes/index.ts`**:
   - Add `{ path: '/<plural-name>', route: <Module>Routes }`.
4. **Update Swagger Documentation**:
   - Add paths and schemas to `src/docs/swagger.ts`.
5. **Verify**:
   - Run `npm run build` (`tsc`) to guarantee 0 compiler errors.

---

## 10. Useful Development Commands

```bash
# Start development server with live reload (ts-node-dev)
npm run dev

# Compile TypeScript to JavaScript in /dist
npm run build

# Start production build from /dist
npm run start

# Generate Prisma Client after schema changes
npm run db:generate

# Run Prisma database migrations
npm run db:migrate

# Seed database with initial accounts
npm run db:seed

# Open interactive Prisma database GUI
npm run db:studio

# Format codebase with Prettier
npm run prettier
```

---

## 11. Customer vs Admin Authentication & Route Protection

The platform utilizes dedicated separate tables for maximum security and domain clarity:

### Data Flow & Resolution:
1. **Customer Accounts (`customers`)**: Authenticated buyers. Tokens carry payload `{ id, email, role: "CUSTOMER" }`.
2. **Admin Accounts (`admins`)**: Back-office store operators. Tokens carry payload `{ id, email, role: "SUPER_ADMIN" }`.
3. **Role Enforcement in `auth.ts`**:
   - If endpoint specifies `auth("SUPER_ADMIN")`: verified token role must equal `"SUPER_ADMIN"`.
   - If endpoint specifies `auth()`: allows either authenticated customer or admin.
4. **Public Login Separation**:
   - Customer login is exposed at `/api/v1/login` and accepts email or phone plus password.
   - Admin login is exposed at `/api/v1/admin/login` and authenticates only against the `admins` table. There is no public admin registration route.
5. **Token Refresh Rotation**:
   - Handles refresh tokens delivered via HTTP-only secure cookies or JSON body and validates the token role against its dedicated table.

### Default Seeded Credentials:
- **Super Admin**: `admin@teloscart.website` / `SuperAdmin123!`
- **Demo Customer**: `customer@teloscart.website` / `Customer123!` (CustomerId: `TC-2026-1001`)
