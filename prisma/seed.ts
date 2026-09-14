import bcryptjs from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting TelosCart database seeding...");

  const saltRounds = 12;
  const adminPasswordHash = await bcryptjs.hash("SuperAdmin123!", saltRounds);
  const customerPasswordHash = await bcryptjs.hash("Customer123!", saltRounds);

  // 1. Seed Super Admin
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

  // 2. Seed Demo Customer
  const customer = await prisma.customer.upsert({
    where: { email: "customer@teloscart.website" },
    update: {
      name: "Demo Customer",
      password: customerPasswordHash,
      status: "ACTIVE",
      isDeleted: false,
    },
    create: {
      customerId: "TC-2026-1001",
      name: "Demo Customer",
      email: "customer@teloscart.website",
      password: customerPasswordHash,
      phone: "+8801700000000",
      status: "ACTIVE",
      isDeleted: false,
    },
  });
  console.log(`✅ Demo Customer seeded: ${customer.email} (${customer.customerId})`);

  // 3. Seed Default Address for Demo Customer
  const existingAddress = await prisma.customerAddress.findFirst({
    where: { customerId: customer.id },
  });

  if (!existingAddress) {
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
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
    console.log(`✅ Default shipping address seeded for customer.`);
  }

  console.log("🎉 TelosCart database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
