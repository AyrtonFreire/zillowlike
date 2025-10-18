import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("🔐 Create First Admin User");
  console.log("━".repeat(50));
  console.log("");
  
  try {
    // Check if admin already exists
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    
    if (adminCount > 0) {
      console.log("⚠️  Admin user already exists!");
      const existingAdmins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { email: true, name: true },
      });
      
      console.log("");
      console.log("Existing admin(s):");
      existingAdmins.forEach((admin) => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
      console.log("");
      
      const proceed = await question("Create another admin? (y/N): ");
      if (proceed.toLowerCase() !== "y") {
        console.log("Cancelled.");
        rl.close();
        return;
      }
    }
    
    console.log("Enter admin details:");
    console.log("");
    
    const name = await question("Name: ");
    const email = await question("Email: ");
    
    if (!name || !email) {
      console.log("❌ Name and email are required!");
      rl.close();
      return;
    }
    
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existing) {
      console.log("");
      console.log(`❌ User with email "${email}" already exists!`);
      console.log(`   Name: ${existing.name}`);
      console.log(`   Role: ${existing.role}`);
      rl.close();
      return;
    }
    
    console.log("");
    console.log("Creating admin user...");
    
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        role: "ADMIN",
        emailVerified: new Date(), // Pre-verified for admin
      },
    });
    
    console.log("");
    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("━".repeat(50));
    console.log("");
    console.log("👤 Admin Details:");
    console.log(`   Name:  ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   ID:    ${admin.id}`);
    console.log("");
    console.log("🔑 Next Steps:");
    console.log("");
    console.log("   1. Start the server: npm run dev");
    console.log("");
    console.log("   2. Sign in with OAuth (GitHub/Google) using:");
    console.log(`      ${admin.email}`);
    console.log("");
    console.log("   3. Your role will automatically be ADMIN");
    console.log("");
    console.log("━".repeat(50));
    console.log("");
    
  } catch (error) {
    console.error("❌ Error creating admin:");
    console.error(error);
  } finally {
    rl.close();
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
