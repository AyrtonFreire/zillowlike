import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Database Validation");
  console.log("━".repeat(50));
  
  // Valida apenas que o banco está acessível e as tabelas foram criadas
  console.log("ℹ️  Mode: VALIDATION ONLY (no fake data)");
  console.log("");
  
  // Verifica conectividade e estrutura
  console.log("📊 Checking database structure...");
  
  try {
    const userCount = await prisma.user.count();
    const propertyCount = await prisma.property.count();
    const leadCount = await prisma.lead.count();
    const realtorQueueCount = await prisma.realtorQueue.count();
    
    console.log("");
    console.log("✅ Database is ready and accessible!");
    console.log("");
    console.log("📈 Current Stats:");
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Properties: ${propertyCount}`);
    console.log(`   - Leads: ${leadCount}`);
    console.log(`   - Realtors in queue: ${realtorQueueCount}`);
    console.log("");
    console.log("━".repeat(50));
    console.log("");
    console.log("🎯 Next Steps for Beta Testing:");
    console.log("");
    console.log("   1. Create your admin user:");
    console.log("      npm run create-admin");
    console.log("");
    console.log("   2. Start the dev server:");
    console.log("      npm run dev");
    console.log("");
    console.log("   3. Access http://localhost:3000");
    console.log("");
    console.log("   4. Share URL with beta testers");
    console.log("");
    console.log("━".repeat(50));
    console.log("");
    console.log("💡 This is a CLEAN database ready for REAL users!");
    console.log("   No fake data. No test accounts. Production-ready structure.");
    console.log("");
    
  } catch (error) {
    console.error("❌ Database validation failed:");
    console.error(error);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
