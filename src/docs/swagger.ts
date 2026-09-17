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
      description:
        "Customer and Admin authentication, JWT tokens, and session lifecycle",
    },
    {
      name: "Customers",
      description: "Customer management, profiles, and delivery addresses",
    },
    {
      name: "Admins",
      description:
        "Back-office administrator accounts and dashboard operations",
    },
    {
      name: "Categories",
      description:
        "Product category hierarchy, subcategories, homepage featuring, and R2 imagery",
    },
    {
      name: "Brands",
      description:
        "Official brand catalog with taglines, the storefront brands marquee, and R2 imagery",
    },
    {
      name: "Products",
      description:
        "E-commerce product catalog, multi-image R2 gallery, badges, vouchers, SEO, and variants",
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
          email: {
            type: "string",
            format: "email",
            example: "customer@teloscart.website",
          },
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
          email: {
            type: "string",
            format: "email",
            example: "admin@teloscart.website",
          },
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
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Smartphones & Tablets" },
          slug: { type: "string", example: "smartphones-tablets" },
          description: { type: "string", nullable: true },
          icon: { type: "string", nullable: true },
          image: { type: "string", nullable: true },
          imageKey: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
          isFeaturedHomepage: { type: "boolean", example: true },
          subCategories: {
            type: "array",
            items: { type: "object" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Brand: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Apple" },
          slug: { type: "string", example: "apple" },
          tagline: {
            type: "string",
            nullable: true,
            example: "Think Different",
          },
          description: { type: "string", nullable: true },
          image: { type: "string", nullable: true },
          imageKey: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
          isFeaturedMarquee: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
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
    "/register": {
      post: {
        tags: ["Auth"],
        summary: "Customer Registration",
        description:
          "Creates a new customer account with full name, email, unique phone number, and password.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "phone", "password"],
                properties: {
                  name: { type: "string", example: "Rahim Ahmed" },
                  email: {
                    type: "string",
                    format: "email",
                    example: "customer@teloscart.website",
                  },
                  phone: { type: "string", example: "+8801700000000" },
                  password: {
                    type: "string",
                    minLength: 6,
                    example: "Customer123!",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Customer registered successfully" },
          409: { description: "Email or phone already exists" },
        },
      },
    },
    "/login": {
      post: {
        tags: ["Auth"],
        summary: "Customer Login",
        description:
          "Authenticates a customer by email or phone number. Admins must use /admin/login.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    description: "Customer email or phone number",
                    example: "customer@teloscart.website",
                  },
                  password: { type: "string", example: "Customer123!" },
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
    "/admin/login": {
      post: {
        tags: ["Auth"],
        summary: "Admin Login",
        description:
          "Authenticates an admin from the admins table. There is no public admin registration route.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "admin@teloscart.website",
                  },
                  password: { type: "string", example: "SuperAdmin123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Admin login successful" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/customer/register": {
      post: {
        tags: ["Auth"],
        summary: "Customer Registration Alias",
        description: "Backward-compatible alias for /register.",
        responses: {
          201: { description: "Customer registered successfully" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Customer Registration Alias",
        description: "Backward-compatible alias for /register.",
        responses: {
          201: { description: "Customer registered successfully" },
        },
      },
    },
    "/auth/customer/login": {
      post: {
        tags: ["Auth"],
        summary: "Customer Login Alias",
        description: "Backward-compatible alias for /login.",
        responses: {
          200: { description: "Customer login successful" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Customer Login Alias",
        description: "Backward-compatible alias for /login.",
        responses: {
          200: { description: "Customer login successful" },
        },
      },
    },
    "/auth/admin/login": {
      post: {
        tags: ["Auth"],
        summary: "Admin Login Alias",
        description: "Backward-compatible alias for /admin/login.",
        responses: {
          200: { description: "Admin login successful" },
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
          {
            name: "status",
            in: "query",
            schema: { $ref: "#/components/schemas/UserStatus" },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: {
          200: { description: "List of customers" },
          403: { description: "Forbidden - Super Admin required" },
        },
      },
    },
    "/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories for admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "searchTerm", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          {
            name: "isFeaturedHomepage",
            in: "query",
            schema: { type: "boolean" },
          },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "sortBy", in: "query", schema: { type: "string" } },
          {
            name: "sortOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] },
          },
        ],
        responses: {
          200: { description: "Categories retrieved successfully" },
          403: { description: "Forbidden - Super Admin required" },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category or subcategory",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  icon: { type: "string", example: "Shirt" },
                  subCategories: {
                    type: "string",
                    description:
                      "JSON array string, e.g. [{\"name\":\"Men Shoes\"}]",
                  },
                  isActive: { type: "boolean", default: true },
                  isFeaturedHomepage: { type: "boolean", default: false },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Category created successfully" },
          400: { description: "Validation or hierarchy error" },
        },
      },
    },
    "/categories/tree": {
      get: {
        tags: ["Categories"],
        summary: "Get active public category tree",
        responses: {
          200: { description: "Category tree retrieved successfully" },
        },
      },
    },
    "/categories/featured-homepage": {
      get: {
        tags: ["Categories"],
        summary: "Get active categories featured on homepage",
        responses: {
          200: {
            description: "Featured homepage categories retrieved successfully",
          },
        },
      },
    },
    "/categories/parents": {
      get: {
        tags: ["Categories"],
        summary: "Get top-level categories for admin parent dropdown",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Parent categories retrieved successfully" },
        },
      },
    },
    "/categories/slug/{slug}": {
      get: {
        tags: ["Categories"],
        summary: "Get active category by slug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Category retrieved successfully" },
          404: { description: "Category not found" },
        },
      },
    },
    "/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get category by id for admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Category retrieved successfully" },
        },
      },
      patch: {
        tags: ["Categories"],
        summary: "Update category or subcategory",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  icon: { type: "string" },
                  subCategories: {
                    type: "string",
                    description:
                      "JSON array string replacing the current subcategory list",
                  },
                  isActive: { type: "boolean" },
                  isFeaturedHomepage: { type: "boolean" },
                  removeImage: { type: "boolean" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Category updated successfully" },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Soft delete category",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Category deleted successfully" },
          400: { description: "Category has active children" },
        },
      },
    },
    "/categories/{categoryId}/sub-categories": {
      post: {
        tags: ["Categories"],
        summary: "Create subcategory under a main category",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "categoryId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Men Shoes" },
                  description: { type: "string" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Subcategory created successfully" },
        },
      },
    },
    "/categories/sub-categories/{id}": {
      patch: {
        tags: ["Categories"],
        summary: "Update subcategory",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Subcategory updated successfully" },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Soft delete subcategory",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Subcategory deleted successfully" },
        },
      },
    },
    "/brands": {
      get: {
        tags: ["Brands"],
        summary: "List brands for admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "searchTerm", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          {
            name: "isFeaturedMarquee",
            in: "query",
            schema: { type: "boolean" },
          },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "sortBy", in: "query", schema: { type: "string" } },
          {
            name: "sortOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] },
          },
        ],
        responses: {
          200: { description: "Brands retrieved successfully" },
          403: { description: "Forbidden - Super Admin required" },
        },
      },
      post: {
        tags: ["Brands"],
        summary: "Create brand",
        description:
          "Creates a brand with a backend-generated slug. Multipart form-data; the `image` field is uploaded to Cloudflare R2 under `brands/<slug>/`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", example: "Apple" },
                  tagline: {
                    type: "string",
                    description: "Official tagline",
                    example: "Think Different",
                  },
                  description: { type: "string" },
                  isActive: { type: "boolean", default: true },
                  isFeaturedMarquee: {
                    type: "boolean",
                    default: false,
                    description:
                      "Featured in Official Brands Marquee (requires an image)",
                  },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Brand created successfully" },
          400: { description: "Validation error" },
        },
      },
    },
    "/brands/marquee": {
      get: {
        tags: ["Brands"],
        summary: "Get active brands featured in the official brands marquee",
        responses: {
          200: { description: "Official brands marquee retrieved successfully" },
        },
      },
    },
    "/brands/slug/{slug}": {
      get: {
        tags: ["Brands"],
        summary: "Get active brand by slug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Brand retrieved successfully" },
          404: { description: "Brand not found" },
        },
      },
    },
    "/brands/{id}": {
      get: {
        tags: ["Brands"],
        summary: "Get brand by id for admin",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Brand retrieved successfully" },
          404: { description: "Brand not found" },
        },
      },
      patch: {
        tags: ["Brands"],
        summary: "Update brand",
        description:
          "Multipart form-data. Sending a new `image` replaces and deletes the previous R2 object; `removeImage=true` clears it. Renaming regenerates the slug.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  tagline: { type: "string" },
                  description: { type: "string" },
                  isActive: { type: "boolean" },
                  isFeaturedMarquee: { type: "boolean" },
                  removeImage: { type: "boolean" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Brand updated successfully" },
          404: { description: "Brand not found" },
        },
      },
      delete: {
        tags: ["Brands"],
        summary: "Soft delete brand",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Brand deleted successfully" },
          404: { description: "Brand not found" },
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "Public product catalog with search, filters, and pagination",
        parameters: [
          { name: "searchTerm", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "subCategoryId", in: "query", schema: { type: "string" } },
          { name: "brandId", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          { name: "hasVoucher", in: "query", schema: { type: "boolean" } },
          { name: "isFeatured", in: "query", schema: { type: "boolean" } },
          { name: "isFlashDeal", in: "query", schema: { type: "boolean" } },
          { name: "stockStatus", in: "query", schema: { type: "string", enum: ["IN_STOCK", "OUT_OF_STOCK", "LOW_STOCK"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          200: { description: "Products retrieved successfully" },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create a new product (Super Admin only)",
        description: "Multipart form-data supporting single thumbnail and multiple gallery images (R2), auto SKU generation, storefront badges, promo vouchers, and optional color/size variants.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "price", "categoryId"],
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  originalPrice: { type: "number" },
                  costPrice: { type: "number" },
                  stock: { type: "integer", default: 0 },
                  lowStockThreshold: { type: "integer", default: 5 },
                  categoryId: { type: "string" },
                  subCategoryId: { type: "string" },
                  brandId: { type: "string" },
                  showStorefrontBadge: { type: "boolean" },
                  storefrontBadgeText: { type: "string" },
                  hasVoucher: { type: "boolean" },
                  voucherDiscountType: { type: "string", enum: ["PERCENTAGE", "FLAT"] },
                  voucherDiscountValue: { type: "number" },
                  voucherCouponCode: { type: "string" },
                  showVoucherBadge: { type: "boolean" },
                  shortDescription: { type: "string" },
                  description: { type: "string" },
                  specifications: { type: "string", description: "JSON stringified key-value object" },
                  warranty: { type: "string" },
                  metaTitle: { type: "string" },
                  metaDescription: { type: "string" },
                  metaKeywords: { type: "string" },
                  hasVariants: { type: "boolean" },
                  variants: { type: "string", description: "JSON stringified array of variant objects" },
                  isFeatured: { type: "boolean" },
                  isFlashDeal: { type: "boolean" },
                  isActive: { type: "boolean", default: true },
                  thumbnail: { type: "string", format: "binary" },
                  images: { type: "array", items: { type: "string", format: "binary" } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Product created successfully" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/products/admin": {
      get: {
        tags: ["Products"],
        summary: "Super Admin product catalog (includes drafts and stock health)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "searchTerm", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "subCategoryId", in: "query", schema: { type: "string" } },
          { name: "brandId", in: "query", schema: { type: "string" } },
          { name: "isActive", in: "query", schema: { type: "boolean" } },
          { name: "stockStatus", in: "query", schema: { type: "string" } },
          { name: "isFeatured", in: "query", schema: { type: "boolean" } },
          { name: "isFlashDeal", in: "query", schema: { type: "boolean" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "sortBy", in: "query", schema: { type: "string", default: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ],
        responses: {
          200: { description: "Admin products retrieved successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/products/slug/{slug}": {
      get: {
        tags: ["Products"],
        summary: "Public product details by slug",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Product retrieved successfully" },
          404: { description: "Product not found" },
        },
      },
    },
    "/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get product details by ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Product retrieved successfully" },
          404: { description: "Product not found" },
        },
      },
      patch: {
        tags: ["Products"],
        summary: "Update product (Super Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  originalPrice: { type: "number" },
                  costPrice: { type: "number" },
                  stock: { type: "integer" },
                  lowStockThreshold: { type: "integer" },
                  categoryId: { type: "string" },
                  subCategoryId: { type: "string" },
                  brandId: { type: "string" },
                  showStorefrontBadge: { type: "boolean" },
                  storefrontBadgeText: { type: "string" },
                  hasVoucher: { type: "boolean" },
                  voucherDiscountType: { type: "string", enum: ["PERCENTAGE", "FLAT"] },
                  voucherDiscountValue: { type: "number" },
                  voucherCouponCode: { type: "string" },
                  showVoucherBadge: { type: "boolean" },
                  shortDescription: { type: "string" },
                  description: { type: "string" },
                  specifications: { type: "string" },
                  warranty: { type: "string" },
                  metaTitle: { type: "string" },
                  metaDescription: { type: "string" },
                  metaKeywords: { type: "string" },
                  hasVariants: { type: "boolean" },
                  variants: { type: "string" },
                  isFeatured: { type: "boolean" },
                  isFlashDeal: { type: "boolean" },
                  isActive: { type: "boolean" },
                  removeThumbnail: { type: "boolean" },
                  removeImageIds: { type: "string" },
                  thumbnail: { type: "string", format: "binary" },
                  images: { type: "array", items: { type: "string", format: "binary" } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Product updated successfully" },
          404: { description: "Product not found" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Soft delete product (Super Admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Product deleted successfully" },
          404: { description: "Product not found" },
        },
      },
    },
  },
};

