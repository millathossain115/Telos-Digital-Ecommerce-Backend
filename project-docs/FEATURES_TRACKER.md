# TelosCart - Master Feature & Deliverables Tracker

> **Project Name:** TelosCart E-Commerce Backend  
> **Platform Website:** [https://www.teloscart.website/](https://www.teloscart.website/)  
> **Tracker Purpose:** Real-time tracking of all features, roles, and specification deliverables.  
> **Status Legend:**
>
> - ⏳ `[ ] Pending` (Awaiting implementation)
> - 🚧 `[/] In Progress` (Currently under active development)
> - ✅ `[x] Done` (Implemented, verified & tested)

---

## 🏛️ Core Architecture & Domain Separation Rules

| Rule / Governance Requirement                                                                         |    Status     | Notes                                                                                                          |
| :---------------------------------------------------------------------------------------------------- | :-----------: | :------------------------------------------------------------------------------------------------------------- |
| **Clean Domain Separation:** Separate tables for shoppers (`Customer`) and store operators (`Admin`). | ✅ `[x] Done` | Database models `customers`, `admins`, `customer_addresses` in PostgreSQL.                                     |
| **Lean Registration:** Customer signup requires full name, `email`, unique `phone`, and `password`.   | ✅ `[x] Done` | Implemented in `auth.service.ts` & Zod validation. Unique `TC-2026-XXXX` generated.                            |
| **Multi-Address Checkout Support:** Dedicated `CustomerAddress` model with default flag.              | ✅ `[x] Done` | Full address CRUD with default address switching under `/api/v1/customers/addresses`.                          |
| **Administrative Route Protection:** Strict hardcoded checks for `SUPER_ADMIN`.                       | ✅ `[x] Done` | Implemented via `auth("SUPER_ADMIN")` middleware. Non-admins blocked with 403.                                 |
| **Customer & Admin Login Separation:** Public customer login and isolated admin login.                | ✅ `[x] Done` | `/login` for customers using email/phone, `/admin/login` for admins. `/auth/*` aliases kept for compatibility. |
| **Interactive API Documentation:** Live Swagger OpenAPI 3.0 documentation.                            | ✅ `[x] Done` | Accessible at `/api/v1/docs` and `/docs`.                                                                      |

---

## 📦 Feature Checklist & Implementation Status

### Module 1: System Health & Infrastructure

- [x] **Express App & Graceful Shutdown**: `server.ts` handles SIGINT, SIGTERM, unhandled exceptions.
- [x] **Prisma Singleton Client**: Reuses connections, avoids connection leaks.
- [x] **Centralized Error Pipeline**: `globalErrorHandler.ts` handles Zod, Prisma, and JWT errors.
- [x] **Uptime & Health Monitor**: `GET /api/v1/health` verified.

### Module 2: Authentication & Security

- [x] **Customer Registration**: `POST /api/v1/register`
- [x] **Customer Login**: `POST /api/v1/login` (email or phone)
- [x] **Admin Login**: `POST /api/v1/admin/login`
- [x] **Auth Compatibility Aliases**: `POST /api/v1/auth/register`, `/api/v1/auth/customer/register`, `/api/v1/auth/customer/login`, `/api/v1/auth/login`, `/api/v1/auth/admin/login`
- [x] **Token Refresh**: `POST /api/v1/auth/refresh-token` (HTTP-only cookie + body)
- [x] **Authenticated Profile**: `GET /api/v1/auth/me` (Includes addresses)
- [x] **Password Update**: `POST /api/v1/auth/change-password`
- [x] **Logout**: `POST /api/v1/auth/logout`

### Module 3: Customer Management

- [x] **Customer Listing**: `GET /api/v1/customers` (Super Admin with search, filters, pagination)
- [x] **Customer Profile Details**: `GET /api/v1/customers/:id` (Self or Super Admin)
- [x] **Customer Profile Update**: `PATCH /api/v1/customers/:id` (Self or Super Admin)
- [x] **Customer Soft Delete**: `DELETE /api/v1/customers/:id` (Super Admin)
- [x] **Add Address**: `POST /api/v1/customers/addresses` (Customer)
- [x] **Update Address**: `PATCH /api/v1/customers/addresses/:addressId` (Customer)
- [x] **Delete Address**: `DELETE /api/v1/customers/addresses/:addressId` (Customer)

### Module 4: Store Administration (Admin)

- [x] **Admin Listing**: `GET /api/v1/admins` (Super Admin)
- [x] **Create New Admin**: `POST /api/v1/admins` (Super Admin)
- [x] **Admin Details**: `GET /api/v1/admins/:id` (Super Admin)
- [x] **Update Admin**: `PATCH /api/v1/admins/:id` (Super Admin)
- [x] **Soft Delete Admin**: `DELETE /api/v1/admins/:id` (Super Admin; self-delete blocked)

---

## 🚀 Upcoming E-Commerce Modules (Roadmap)

### Module 5: Categories Catalog (`/api/v1/categories`)

- [x] **Category & SubCategory Models**: main `categories` table with image/icon/homepage fields and separate `sub_categories` table under category
- [x] **Public Category Tree API**: Hierarchical listing for header mega-menu
- [x] **Admin Category CRUD**: Create, update, reorder, delete with R2 image upload

### Module 6: Brands Catalog (`/api/v1/brands`)

- [x] **Brand Model**: flat `brands` table (no children/sub-brands) with `name`, backend-generated `slug`, `tagline`, `description`, `image`/`imageKey`, `isActive`, `isFeaturedMarquee`, soft delete
- [x] **Admin Brand Listing**: `GET /api/v1/brands` (Super Admin with search, `isActive` / `isFeaturedMarquee` filters, pagination, sorting)
- [x] **Create Brand**: `POST /api/v1/brands` (Super Admin, multipart with R2 logo upload, slug auto-generated)
- [x] **Brand Details**: `GET /api/v1/brands/:id` (Super Admin)
- [x] **Update Brand**: `PATCH /api/v1/brands/:id` (Super Admin, image replace/remove, slug regenerated on rename)
- [x] **Soft Delete Brand**: `DELETE /api/v1/brands/:id` (Super Admin; also clears marquee featuring)
- [x] **Public Official Brands Marquee API**: `GET /api/v1/brands/marquee` (active + featured brands for the storefront strip)
- [x] **Public Brand By Slug API**: `GET /api/v1/brands/slug/:slug`

### Module 7: Products & Variants (`/api/v1/products`)

- [x] **Product, ProductImage & ProductVariant Models**: `name`, auto-generated `slug`, auto-generated `sku`, `price`, `originalPrice`, `costPrice`, `stock`, `lowStockThreshold`, `stockStatus`, storefront badge, voucher promo ribbon, SEO fields, dynamic specifications, R2 multi-image gallery, and color/size variants
- [x] **Public Product Catalog**: Search, category filter, subcategory filter, brand filter, price range, voucher filter, pagination, and sorting
- [x] **Product Detail API**: Fetch by slug/ID with full taxonomy, gallery images, and variant breakdown
- [x] **Admin Product Management**: Full CRUD (`create`, `getAllAdmin`, `update`, `softDelete`) with Cloudflare R2 multi-image upload


### Module 8: Shopping Cart (`/api/v1/cart`)

- [ ] **Cart & CartItem Models**: `customerId`, `productId`, `quantity`, `priceSnapshot`
- [ ] **Cart Operations**: Add to cart, update quantity, remove item, clear cart

### Module 9: Checkout & Orders (`/api/v1/orders`)

- [x] **Order, OrderItem, OrderCustomerDetails & OrderTransaction Models**: auto-generated `TC-XXXXX` order numbers, immutable product price/thumbnail/variant snapshotting, immutable recipient delivery details snapshotting, dynamic payment transactions
- [x] **Checkout API**: `POST /api/v1/orders` converts cart/checkout into order, creates immutable snapshots
- [x] **Inventory Decrement & Audit Log**: Atomic stock deduction on order placement with `StockAuditLog` recording
- [x] **Customer Order History**: `GET /api/v1/orders/my`, `GET /api/v1/orders/my/:id`, and `PATCH /api/v1/orders/my/:id/cancel`
- [x] **Admin Order Management**: `GET /api/v1/orders`, `GET /api/v1/orders/stats`, `GET /api/v1/orders/:id`, `PATCH /api/v1/orders/:id/status`, `PATCH /api/v1/orders/:id/courier`

### Module 10: System Activity & Audit Logs (`/api/v1/activity-logs`)

- [x] **ActivityLog Model & Enums**: `activity_logs` table with `ActivityCategory` and `ActivitySeverity` enums, actor snapshots, IP, device, and location
- [x] **Universal Audit Logging Service**: Centralized non-blocking `ActivityLogService.logActivity` hook capturing operational changes
- [x] **System-Wide Instrumentation**: Auto-logging across Admin Auth, Order lifecycle, Courier dispatch, Payment verification, Stock adjustments, Catalog taxonomy, and Staff management
- [x] **Super Admin API Endpoints**: `GET /api/v1/activity-logs` (paginated stream with keyword search, category, severity, and date range filters) and `GET /api/v1/activity-logs/summary` (KPI counters)
- [x] **Interactive Swagger UI**: Documented under tag `Activity Logs` with full query parameters and schemas
- [x] **Frontend Admin Portal**: Connected `http://localhost:3000/dashboard/activity` via RTK Query `activityApi` while preserving 100% of the polished UI, tables, badges, filter dock, and KPI strip

