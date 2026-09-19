import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import categoriesData from "./frontend-mock/categories.json";
import brandsData from "./frontend-mock/brands.json";
import productsData from "./frontend-mock/products.json";

const prisma = new PrismaClient();

// Pool of realistic review templates with genuine buyer sentiment
const REVIEW_TEMPLATES = [
  {
    rating: 5,
    title: "Exceptional build quality & performance!",
    comment:
      "Ordered this item last week and it arrived in pristine official packaging. Works flawlessly, super fast responsiveness, and completely genuine with official warranty intact. Highly recommended!",
  },
  {
    rating: 5,
    title: "100% genuine BD official unit, fast delivery",
    comment:
      "Delivered within 24 hours in Dhaka. The authenticity verification succeeded with no issues. Great battery life and premium in-hand feel. Totally worth every taka.",
  },
  {
    rating: 4,
    title: "Great value for money, very reliable",
    comment:
      "Using this daily for my work and personal tasks. Solid construction, sharp display/acoustics, and seamless performance. Minor point is packaging box was slightly bruised, but device is 10/10.",
  },
  {
    rating: 5,
    title: "Outstanding product, exceeded my expectations",
    comment:
      "Extremely happy with this purchase. Top-tier specs, sleek modern aesthetic, and customer support was very helpful when answering my delivery questions.",
  },
  {
    rating: 4,
    title: "Impressive specs and sleek design",
    comment:
      "Looks and feels very premium. Setup was effortless, connectivity is rock solid, and performance is snappy throughout. Would definitely purchase from TelosCart again.",
  },
  {
    rating: 5,
    title: "Best purchase in its category by far",
    comment:
      "Checked multiple stores before buying here. The price was competitive, official warranty coverage verified, and unit was brand new sealed. Five stars without hesitation!",
  },
  {
    rating: 4,
    title: "Smooth experience and verified warranty",
    comment:
      "Decent battery backup, fast charging, and fluid software experience. Customer support confirmed warranty registration within a few hours of delivery.",
  },
  {
    rating: 5,
    title: "Premium finish and lightning fast execution",
    comment:
      "From unboxing to full setup, everything about this unit is premium. Runs cool and delivers top-tier performance consistently.",
  },
];

async function main() {
  console.log("🌱 Starting TelosCart database seeding...\n");

  const saltRounds = 12;
  const adminPasswordHash = await bcryptjs.hash("SuperAdmin123!", saltRounds);
  const customerPasswordHash = await bcryptjs.hash("Customer123!", saltRounds);

  // ═══════════════════════════════════════════════════════════════
  // 1. SEED ADMIN & DEMO CUSTOMERS
  // ═══════════════════════════════════════════════════════════════

  const admin = await prisma.admin.upsert({
    where: { email: "admin@teloscart.website" },
    update: {
      name: "TelosCart Super Admin",
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      isDeleted: false,
    },
    create: {
      name: "TelosCart Super Admin",
      email: "admin@teloscart.website",
      password: adminPasswordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      phone: "+8801700000001",
      isDeleted: false,
    },
  });
  console.log(`✅ Super Admin seeded: ${admin.email}`);

  // 10 Customer profiles for rich, diverse reviews across all 255 products
  const demoCustomersData = [
    { customerId: "TC-2026-1001", name: "Demo Customer", email: "customer@teloscart.website", phone: "+8801700000000" },
    { customerId: "TC-2026-1002", name: "Rahim Ahmed", email: "rahim@demo.com", phone: "+8801711111111" },
    { customerId: "TC-2026-1003", name: "Fatima Khan", email: "fatima@demo.com", phone: "+8801722222222" },
    { customerId: "TC-2026-1004", name: "Karim Hassan", email: "karim@demo.com", phone: "+8801733333333" },
    { customerId: "TC-2026-1005", name: "Nadia Islam", email: "nadia@demo.com", phone: "+8801744444444" },
    { customerId: "TC-2026-1006", name: "Tanvir Hasan", email: "tanvir@demo.com", phone: "+8801755555555" },
    { customerId: "TC-2026-1007", name: "Sabrina Akter", email: "sabrina@demo.com", phone: "+8801766666666" },
    { customerId: "TC-2026-1008", name: "Anisul Haque", email: "anisul@demo.com", phone: "+8801777777777" },
    { customerId: "TC-2026-1009", name: "Mehnaz Parveen", email: "mehnaz@demo.com", phone: "+8801788888888" },
    { customerId: "TC-2026-1010", name: "Tariq Mahmud", email: "tariq@demo.com", phone: "+8801799999999" },
  ];

  const allCustomers = [];
  for (const custData of demoCustomersData) {
    const cust = await prisma.customer.upsert({
      where: { email: custData.email },
      update: {
        name: custData.name,
        password: customerPasswordHash,
        phone: custData.phone,
        status: "ACTIVE",
        isDeleted: false,
      },
      create: {
        customerId: custData.customerId,
        name: custData.name,
        email: custData.email,
        password: customerPasswordHash,
        phone: custData.phone,
        status: "ACTIVE",
        isDeleted: false,
      },
    });
    allCustomers.push(cust);
  }
  console.log(`✅ ${allCustomers.length} demo customers seeded`);

  // Default address for primary customer
  const primaryCustomer = allCustomers[0];
  const existingAddress = await prisma.customerAddress.findFirst({
    where: { customerId: primaryCustomer.id },
  });

  if (!existingAddress) {
    await prisma.customerAddress.create({
      data: {
        customerId: primaryCustomer.id,
        title: "Home",
        type: "SHIPPING",
        isDefault: true,
        street: "House 12, Road 4, Dhanmondi",
        city: "Dhaka",
        state: "Dhaka Division",
        postalCode: "1205",
        country: "Bangladesh",
      },
    });
    console.log(`✅ Default shipping address seeded for primary customer`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. SEED CATEGORIES & SUBCATEGORIES
  // ═══════════════════════════════════════════════════════════════

  console.log(`\n📦 Seeding ${categoriesData.length} categories...`);
  const categoryMap = new Map<string, string>(); // mock-id → db-id
  const subcategoryMap = new Map<string, string>(); // mock-id → db-id

  for (const cat of categoriesData) {
    const dbCategory = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        image: cat.image,
        imageKey: cat.image ? "external" : null,
        isActive: true,
        isFeaturedHomepage: cat.featured || false,
        isDeleted: false,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        image: cat.image,
        imageKey: cat.image ? "external" : null,
        isActive: true,
        isFeaturedHomepage: cat.featured || false,
        isDeleted: false,
      },
    });

    categoryMap.set(cat.id, dbCategory.id);
    console.log(`  ✅ Category: ${cat.name} (${cat.slug})`);

    // Seed subcategories
    if (cat.subcategories && cat.subcategories.length > 0) {
      for (const sub of cat.subcategories) {
        const dbSubcategory = await prisma.subCategory.upsert({
          where: {
            categoryId_slug: {
              categoryId: dbCategory.id,
              slug: sub.slug,
            },
          },
          update: {
            name: sub.name,
            isActive: true,
            isDeleted: false,
          },
          create: {
            categoryId: dbCategory.id,
            name: sub.name,
            slug: sub.slug,
            isActive: true,
            isDeleted: false,
          },
        });

        subcategoryMap.set(sub.id, dbSubcategory.id);
      }
      console.log(`    └─ ${cat.subcategories.length} subcategories`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. SEED BRANDS (WITH DIRECT LOGO URLS)
  // ═══════════════════════════════════════════════════════════════

  console.log(`\n🏷️  Seeding ${brandsData.length} brands...`);
  const brandMap = new Map<string, string>(); // brand-name → db-id

  for (const brand of brandsData as Array<any>) {
    const dbBrand = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {
        name: brand.name,
        tagline: brand.tag, // map "tag" → "tagline"
        image: brand.image || null,
        imageKey: brand.image ? "external" : null,
        isActive: true,
        isFeaturedMarquee: brand.featured || false,
        isDeleted: false,
      },
      create: {
        name: brand.name,
        slug: brand.slug,
        tagline: brand.tag,
        image: brand.image || null,
        imageKey: brand.image ? "external" : null,
        isActive: true,
        isFeaturedMarquee: brand.featured || false,
        isDeleted: false,
      },
    });

    brandMap.set(brand.name, dbBrand.id);
    console.log(`  ✅ Brand: ${brand.name}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. SEED PRODUCTS
  // ═══════════════════════════════════════════════════════════════

  console.log(`\n📱 Seeding ${productsData.length} products...`);

  // Helper: find subcategory by matching product tags or specifications
  const findSubcategoryId = (product: any, categoryId: string): string | null => {
    if (product.tags && product.tags.length > 0) {
      for (const tag of product.tags) {
        for (const [subId, subDbId] of subcategoryMap.entries()) {
          const subSlug = subId.replace("sub-", "");
          if (tag === subSlug) {
            return subDbId;
          }
        }
      }
    }

    if (product.specifications?.Subcategory) {
      const subName = product.specifications.Subcategory.toLowerCase();
      for (const cat of categoriesData) {
        if (cat.id === product.categoryId && cat.subcategories) {
          for (const sub of cat.subcategories) {
            if (sub.name.toLowerCase() === subName) {
              return subcategoryMap.get(sub.id) || null;
            }
          }
        }
      }
    }

    return null;
  };

  let skuCounter = 1000;
  let totalReviewsSeeded = 0;

  for (let pIdx = 0; pIdx < productsData.length; pIdx++) {
    const product = productsData[pIdx];
    const categoryId = categoryMap.get(product.categoryId);
    if (!categoryId) {
      console.warn(`  ⚠️  Skipping ${product.name}: category not found (${product.categoryId})`);
      continue;
    }

    const brandId = brandMap.get(product.brand) || null;
    const subCategoryId = findSubcategoryId(product, product.categoryId);

    // Financial integrity: purchase price (costPrice) with ~25% gross margin
    const sellingPrice = product.price;
    const costPrice = Math.round(product.price * 0.75);

    const stockStatus =
      product.stock === 0
        ? "OUT_OF_STOCK"
        : product.stock <= 5
          ? "LOW_STOCK"
          : "IN_STOCK";

    const hasBadge = !!product.badge && product.badge.trim() !== "";
    const hasVoucher = product.discountPercentage > 0;

    const dbProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        sku: product.sku || `TC-PRD-2026-${skuCounter++}`,
        price: sellingPrice,
        originalPrice: product.originalPrice || null,
        costPrice,
        stock: product.stock,
        lowStockThreshold: 5,
        stockStatus,
        showStorefrontBadge: hasBadge,
        storefrontBadgeText: hasBadge ? product.badge : null,
        hasVoucher,
        voucherDiscountType: hasVoucher ? "PERCENTAGE" : null,
        voucherDiscountValue: hasVoucher ? product.discountPercentage : null,
        categoryId,
        subCategoryId,
        brandId,
        thumbnail: product.thumbnail || product.images?.[0] || null,
        shortDescription: product.shortDescription,
        description: product.description,
        specifications: product.specifications || {},
        warranty: product.specifications?.Warranty || "1 Year Official Warranty",
        isFeatured: product.isFeatured || false,
        isFlashDeal: product.isFlashDeal || false,
        isActive: true,
        isDeleted: false,
      },
      create: {
        name: product.name,
        slug: product.slug,
        sku: product.sku || `TC-PRD-2026-${skuCounter++}`,
        price: sellingPrice,
        originalPrice: product.originalPrice || null,
        costPrice,
        stock: product.stock,
        lowStockThreshold: 5,
        stockStatus,
        showStorefrontBadge: hasBadge,
        storefrontBadgeText: hasBadge ? product.badge : null,
        hasVoucher,
        voucherDiscountType: hasVoucher ? "PERCENTAGE" : null,
        voucherDiscountValue: hasVoucher ? product.discountPercentage : null,
        showVoucherBadge: false,
        categoryId,
        subCategoryId,
        brandId,
        thumbnail: product.thumbnail || product.images?.[0] || null,
        shortDescription: product.shortDescription,
        description: product.description,
        specifications: product.specifications || {},
        warranty: product.specifications?.Warranty || "1 Year Official Warranty",
        isFeatured: product.isFeatured || false,
        isFlashDeal: product.isFlashDeal || false,
        isActive: true,
        isDeleted: false,
      },
    });

    // Seed direct image URLs with key: "external" (no R2 lookup needed)
    if (product.images && product.images.length > 0) {
      await prisma.productImage.deleteMany({
        where: { productId: dbProduct.id },
      });

      for (let i = 0; i < product.images.length; i++) {
        await prisma.productImage.create({
          data: {
            productId: dbProduct.id,
            url: product.images[i],
            key: "external",
            isThumbnail: i === 0,
            order: i,
          },
        });
      }
    }

    // Seed product variants
    if (product.variants && product.variants.length > 0) {
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: dbProduct.id },
      });

      if (existingVariants.length === 0) {
        for (let i = 0; i < product.variants.length; i++) {
          const variant = product.variants[i];
          await prisma.productVariant.create({
            data: {
              productId: dbProduct.id,
              sku: `${dbProduct.sku}-V${i + 1}`,
              color: i === 0 ? "Default" : `Variant ${i + 1}`,
              price: variant.price,
              costPrice: Math.round(variant.price * 0.75),
              stock: variant.inStock ? product.stock : 0,
            },
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. SEED VERIFIED REVIEWS FOR THIS PRODUCT (OPTION 1: ALL PRODUCTS)
    // ═══════════════════════════════════════════════════════════════

    // Seed 2 to 4 unique customer reviews per product
    const numReviews = 2 + ((pIdx * 3) % 3); // alternating 2, 3, or 4 reviews
    const assignedCustomers = [];

    // Select distinct customers using deterministic round-robin
    for (let c = 0; c < numReviews; c++) {
      const custIndex = (pIdx * 2 + c) % allCustomers.length;
      assignedCustomers.push(allCustomers[custIndex]);
    }

    let reviewRatingSum = 0;
    for (let r = 0; r < assignedCustomers.length; r++) {
      const reviewer = assignedCustomers[r];
      const templateIndex = (pIdx * 5 + r * 3) % REVIEW_TEMPLATES.length;
      const reviewTemplate = REVIEW_TEMPLATES[templateIndex];

      await prisma.review.upsert({
        where: {
          productId_customerId: {
            productId: dbProduct.id,
            customerId: reviewer.id,
          },
        },
        update: {
          rating: reviewTemplate.rating,
          title: reviewTemplate.title,
          comment: reviewTemplate.comment,
          isVerifiedPurchase: true,
          isDeleted: false,
        },
        create: {
          productId: dbProduct.id,
          customerId: reviewer.id,
          rating: reviewTemplate.rating,
          title: reviewTemplate.title,
          comment: reviewTemplate.comment,
          isVerifiedPurchase: true,
          isDeleted: false,
        },
      });

      reviewRatingSum += reviewTemplate.rating;
      totalReviewsSeeded++;
    }

    // Recalculate and update synchronized rating & reviewCount on Product
    const calculatedAvg = Number((reviewRatingSum / assignedCustomers.length).toFixed(1));
    await prisma.product.update({
      where: { id: dbProduct.id },
      data: {
        rating: calculatedAvg,
        reviewCount: assignedCustomers.length,
      },
    });

    if ((pIdx + 1) % 25 === 0 || pIdx === productsData.length - 1) {
      console.log(`  Processed ${pIdx + 1}/${productsData.length} products...`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. SEED DEMO CUSTOMER CARTS & WISHLISTS
  // ═══════════════════════════════════════════════════════════════

  console.log("\n🛒 Seeding active customer shopping carts & wishlists...");
  const sampleProducts = await prisma.product.findMany({
    take: 30,
    select: { id: true },
  });

  let totalCartsSeeded = 0;
  let totalWishlistsSeeded = 0;

  if (sampleProducts.length > 0) {
    for (let c = 0; c < Math.min(6, allCustomers.length); c++) {
      const customer = allCustomers[c];

      // Seed 1-3 cart items for this customer
      const cartProductCount = 1 + (c % 3);
      for (let cp = 0; cp < cartProductCount; cp++) {
        const prodIndex = (c * 4 + cp) % sampleProducts.length;
        const productId = sampleProducts[prodIndex].id;

        const existingCart = await prisma.cartItem.findFirst({
          where: { customerId: customer.id, productId },
        });

        if (!existingCart) {
          await prisma.cartItem.create({
            data: {
              customerId: customer.id,
              productId,
              quantity: 1 + (cp % 2),
            },
          });
          totalCartsSeeded++;
        }
      }

      // Seed 2-4 wishlist items for this customer
      const wishlistProductCount = 2 + (c % 3);
      for (let wp = 0; wp < wishlistProductCount; wp++) {
        const prodIndex = (c * 5 + wp + 7) % sampleProducts.length;
        const productId = sampleProducts[prodIndex].id;

        await prisma.wishlistItem.upsert({
          where: {
            customerId_productId: {
              customerId: customer.id,
              productId,
            },
          },
          update: {},
          create: {
            customerId: customer.id,
            productId,
          },
        });
        totalWishlistsSeeded++;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. SEED BASELINE ACTIVITY & AUDIT LOGS
  // ═══════════════════════════════════════════════════════════════
  const baselineActivityLogs = [
    {
      actorName: "Super Admin",
      actorEmail: "admin@teloscart.website",
      actorRole: "System Administrator",
      action: "Updated Category",
      entity: "Smartphones & Foldables",
      entityId: "cat-smartphones",
      category: "CATALOG" as const,
      severity: "INFO" as const,
      details: "Changed taxonomy banner imagery and adjusted subcategory hierarchies for Q3 campaign.",
      ipAddress: "103.205.180.42",
      device: "Chrome / Windows 11",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-16T13:24:00.000Z"),
    },
    {
      actorName: "Operations Lead",
      actorEmail: "ops@teloscart.website",
      actorRole: "Dispatcher",
      action: "Order Status Dispatched",
      entity: "Order #TLS-89241",
      entityId: "TLS-89241",
      category: "ORDERS" as const,
      severity: "SUCCESS" as const,
      details: "Assigned Steadfast tracking code ST-9912048 and notified customer via automated SMS.",
      ipAddress: "103.205.180.12",
      device: "Firefox / macOS",
      location: "Chittagong Hub, Bangladesh",
      createdAt: new Date("2026-09-16T12:45:10.000Z"),
    },
    {
      actorName: "Finance Desk",
      actorEmail: "billing@teloscart.website",
      actorRole: "Accounts Auditor",
      action: "Verified bKash Payment",
      entity: "Trx #9M48L912K",
      entityId: "trx-9m48l",
      category: "PAYMENTS" as const,
      severity: "SUCCESS" as const,
      details: "Reconciled BDT 145,000 against invoice #TLS-88902 with bKash Merchant API gateway.",
      ipAddress: "182.160.119.88",
      device: "Edge / Windows 11",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-16T11:15:30.000Z"),
    },
    {
      actorName: "Super Admin",
      actorEmail: "admin@teloscart.website",
      actorRole: "System Administrator",
      action: "Modified Security Policy",
      entity: "Two-Factor Auth Enforcement",
      category: "SECURITY" as const,
      severity: "WARNING" as const,
      details: "Mandatory hardware key / TOTP authentication enabled for all staff roles with inventory write access.",
      ipAddress: "103.205.180.42",
      device: "Chrome / Windows 11",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-16T09:30:00.000Z"),
    },
    {
      actorName: "Store Auditor",
      actorEmail: "reviews@teloscart.website",
      actorRole: "Moderator",
      action: "Moderated Customer Review",
      entity: "Samsung Galaxy S26 Ultra Review",
      entityId: "rev-201",
      category: "CATALOG" as const,
      severity: "INFO" as const,
      details: "Flagged review marked as verified after confirming customer serial number registration.",
      ipAddress: "118.179.130.22",
      device: "Safari / iOS",
      location: "Sylhet, Bangladesh",
      createdAt: new Date("2026-09-16T08:12:40.000Z"),
    },
    {
      actorName: "Security Sentinel",
      actorEmail: "system@teloscart.website",
      actorRole: "Automated System",
      action: "Blocked Suspicious Login Attempt",
      entity: "Admin Login Portal",
      category: "AUTH" as const,
      severity: "DANGER" as const,
      details: "Detected 5 consecutive failed password attempts targeting ops@teloscart.website from unknown IP.",
      ipAddress: "45.133.1.99",
      device: "Python-requests / Linux",
      location: "Frankfurt, Germany",
      createdAt: new Date("2026-09-15T19:50:00.000Z"),
    },
    {
      actorName: "Super Admin",
      actorEmail: "admin@teloscart.website",
      actorRole: "System Administrator",
      action: "Published New Brand Partner",
      entity: "Brand: Anker Innovations",
      entityId: "brand-anker",
      category: "CATALOG" as const,
      severity: "SUCCESS" as const,
      details: "Registered certified partner emblem, official warranty badges, and linked 24 power accessories.",
      ipAddress: "103.205.180.42",
      device: "Chrome / Windows 11",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-15T16:20:15.000Z"),
    },
    {
      actorName: "Inventory Manager",
      actorEmail: "warehouse@teloscart.website",
      actorRole: "Stock Controller",
      action: "Stock Inward Adjustment",
      entity: "Sony WH-1000XM6 Headphones",
      entityId: "prod-sony-xm6",
      category: "CATALOG" as const,
      severity: "INFO" as const,
      details: "Restocked 50 sealed units into Banani Central Fulfillment Depot. Updated minimum threshold to 10.",
      ipAddress: "103.205.180.70",
      device: "Chrome / Windows 10",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-15T14:05:00.000Z"),
    },
    {
      actorName: "Super Admin",
      actorEmail: "admin@teloscart.website",
      actorRole: "System Administrator",
      action: "Updated Store Shipping Rates",
      entity: "Dhaka Express 3-Hour Delivery",
      category: "SETTINGS" as const,
      severity: "INFO" as const,
      details: "Set express courier rate to BDT 120 and added emergency rain delivery surcharge toggle.",
      ipAddress: "103.205.180.42",
      device: "Chrome / Windows 11",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-15T10:18:22.000Z"),
    },
    {
      actorName: "Super Admin",
      actorEmail: "admin@teloscart.website",
      actorRole: "System Administrator",
      action: "Admin Profile Password Rotated",
      entity: "admin@teloscart.website",
      category: "AUTH" as const,
      severity: "WARNING" as const,
      details: "Periodic 90-day credentials rotation completed successfully. Revoked 3 inactive device sessions.",
      ipAddress: "103.205.180.42",
      device: "Chrome / Windows 11",
      location: "Dhaka, Bangladesh",
      createdAt: new Date("2026-09-14T22:40:11.000Z"),
    },
    {
      actorName: "Operations Lead",
      actorEmail: "ops@teloscart.website",
      actorRole: "Dispatcher",
      action: "Processed Customer Return",
      entity: "Order #TLS-87910",
      entityId: "TLS-87910",
      category: "ORDERS" as const,
      severity: "WARNING" as const,
      details: "Item received back in sealed condition; issued BDT 4,200 store credit voucher to user wallet.",
      ipAddress: "103.205.180.12",
      device: "Firefox / macOS",
      location: "Chittagong Hub, Bangladesh",
      createdAt: new Date("2026-09-14T17:10:00.000Z"),
    },
    {
      actorName: "Security Sentinel",
      actorEmail: "system@teloscart.website",
      actorRole: "Automated System",
      action: "SSL Certificate Auto-Renewed",
      entity: "telos.com.bd & api.telos.com.bd",
      category: "SECURITY" as const,
      severity: "SUCCESS" as const,
      details: "Let's Encrypt Wildcard TLS certificate refreshed for 90 days. Valid through Dec 13, 2026.",
      ipAddress: "127.0.0.1",
      device: "Certbot System Daemon",
      location: "Cloud Cluster, Singapore",
      createdAt: new Date("2026-09-14T12:00:00.000Z"),
    },
  ];

  const existingLogsCount = await prisma.activityLog.count();
  if (existingLogsCount === 0) {
    for (const log of baselineActivityLogs) {
      await prisma.activityLog.create({
        data: {
          ...log,
          adminId: admin.id,
        },
      });
    }
    console.log(`✅ Seeded ${baselineActivityLogs.length} baseline Activity Logs`);
  }

  console.log("\n🎉 TelosCart database seeding completed successfully!");
  console.log(`   Categories: ${categoryMap.size}`);
  console.log(`   Subcategories: ${subcategoryMap.size}`);
  console.log(`   Brands: ${brandMap.size}`);
  console.log(`   Products: ${productsData.length}`);
  console.log(`   Total Verified Reviews Seeded: ${totalReviewsSeeded}`);
  console.log(`   Sample Cart Items Seeded: ${totalCartsSeeded}`);
  console.log(`   Sample Wishlist Items Seeded: ${totalWishlistsSeeded}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
