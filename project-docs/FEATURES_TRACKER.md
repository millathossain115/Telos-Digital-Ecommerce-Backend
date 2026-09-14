# TelosCart - Master Feature & Deliverables Tracker

> **Project Name:** TelosCart E-Commerce Backend  
> **Platform Website:** [https://www.teloscart.website/](https://www.teloscart.website/)  
> **Tracker Purpose:** Real-time tracking of all features, roles, and specification deliverables.  
> **Status Legend:**  
> - ⏳ `[ ] Pending` (Awaiting implementation)  
> - 🚧 `[/] In Progress` (Currently under active development)  
> - ✅ `[x] Done` (Implemented, verified & tested)

---

## 🏛️ Core Architecture & Domain Separation Rules

| Rule / Governance Requirement | Status | Notes |
| :--- | :---: | :--- |
| **Clean Domain Separation:** Separate tables for shoppers (`Customer`) and store operators (`Admin`). | ✅ `[x] Done` | Database models `customers`, `admins`, `customer_addresses` in PostgreSQL. |
| **Lean Registration:** Customer signup requires only `name`, `email`, `password`, optional `phone`. | ✅ `[x] Done` | Implemented in `auth.service.ts` & Zod validation. Unique `TC-2026-XXXX` generated. |
| **Multi-Address Checkout Support:** Dedicated `CustomerAddress` model with default flag. | ✅ `[x] Done` | Full address CRUD with default address switching under `/api/v1/customers/addresses`. |
| **Administrative Route Protection:** Strict hardcoded checks for `SUPER_ADMIN`. | ✅ `[x] Done` | Implemented via `auth("SUPER_ADMIN")` middleware. Non-admins blocked with 403. |
| **Unified & Dedicated Login:** Support customer-only, admin-only, and unified login routes. | ✅ `[x] Done` | `/auth/customer/login`, `/auth/admin/login`, `/auth/login`. |
| **Interactive API Documentation:** Live Swagger OpenAPI 3.0 documentation. | ✅ `[x] Done` | Accessible at `/api/v1/docs` and `/docs`. |

---

## 📦 Feature Checklist & Implementation Status

### Module 1: System Health & Infrastructure
- [x] **Express App & Graceful Shutdown**: `server.ts` handles SIGINT, SIGTERM, unhandled exceptions.
- [x] **Prisma Singleton Client**: Reuses connections, avoids connection leaks.
- [x] **Centralized Error Pipeline**: `globalErrorHandler.ts` handles Zod, Prisma, and JWT errors.
- [x] **Uptime & Health Monitor**: `GET /api/v1/health` verified.

### Module 2: Authentication & Security
- [x] **Customer Registration**: `POST /api/v1/auth/customer/register`
- [x] **Customer Login**: `POST /api/v1/auth/customer/login`
- [x] **Admin Login**: `POST /api/v1/auth/admin/login`
- [x] **Unified Login**: `POST /api/v1/auth/login`
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
- [ ] **Category Model**: `id`, `name`, `slug`, `image`, `parentId` (hierarchy), `isActive`
- [ ] **Public Category Tree API**: Hierarchical listing for header mega-menu
- [ ] **Admin Category CRUD**: Create, update, reorder, delete

### Module 6: Products & Variants (`/api/v1/products`)
- [ ] **Product Model**: `name`, `slug`, `sku`, `price`, `discountPrice`, `stock`, `images`, `categoryId`
- [ ] **Public Product Catalog**: Search, category filter, price range, brand, pagination
- [ ] **Product Detail API**: Fetch by slug/ID with stock availability
- [ ] **Admin Product Management**: Full CRUD with image upload support

### Module 7: Shopping Cart (`/api/v1/cart`)
- [ ] **Cart & CartItem Models**: `customerId`, `productId`, `quantity`, `priceSnapshot`
- [ ] **Cart Operations**: Add to cart, update quantity, remove item, clear cart

### Module 8: Checkout & Orders (`/api/v1/orders`)
- [ ] **Order & OrderItem Models**: `orderNumber` (e.g. `TC-ORD-2026-XXXX`), status, paymentStatus, total
- [ ] **Checkout API**: Converts cart items into order, captures shipping address snapshot
- [ ] **Inventory Decrement**: Atomic stock deduction on order placement
- [ ] **Customer Order History**: View past orders and delivery tracking
- [ ] **Admin Order Management**: Status transitions (`PENDING` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`)
