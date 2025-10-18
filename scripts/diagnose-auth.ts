import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log("Usage: npx tsx scripts/diagnose-auth.ts <email>");
    return;
  }
  
  console.log("\n🔍 AUTHENTICATION DIAGNOSIS");
  console.log("━".repeat(60));
  console.log(`\nChecking authentication for: ${email}\n`);
  
  // 1. Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
    include: { 
      accounts: true,
      sessions: true,
    },
  });
  
  if (!user) {
    console.log("❌ User NOT found in database");
    console.log("\nPossible issues:");
    console.log("  - User was never created");
    console.log("  - Email is incorrect");
    console.log("\nSolution:");
    console.log("  1. Try logging in again");
    console.log("  2. Check if email is correct");
    return;
  }
  
  console.log("✅ User found in database");
  console.log("\nUser Details:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Email Verified: ${user.emailVerified}`);
  
  // 2. Check OAuth accounts
  console.log("\n📱 OAuth Accounts:");
  if (user.accounts.length === 0) {
    console.log("   ⚠️  No OAuth accounts linked");
    console.log("   This user cannot login with OAuth");
  } else {
    user.accounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. ${acc.provider} (ID: ${acc.providerAccountId})`);
    });
  }
  
  // 3. Check sessions
  console.log("\n🔐 Active Sessions:");
  if (user.sessions.length === 0) {
    console.log("   No active sessions");
  } else {
    user.sessions.forEach((session, i) => {
      console.log(`   ${i + 1}. Expires: ${session.expires}`);
    });
  }
  
  // 4. Diagnosis
  console.log("\n📊 DIAGNOSIS:");
  console.log("━".repeat(60));
  
  if (user.role === "USER") {
    console.log("⚠️  ISSUE DETECTED: Role is USER");
    console.log("\nIf this user should be ADMIN/REALTOR/OWNER:");
    console.log(`  Run: npx tsx scripts/set-admin.ts`);
    console.log(`  Then enter email: ${email}`);
  } else {
    console.log(`✅ Role is correct: ${user.role}`);
  }
  
  if (user.accounts.length === 0) {
    console.log("\n❌ CRITICAL: No OAuth accounts linked");
    console.log("   User cannot login!");
  } else {
    console.log(`\n✅ OAuth accounts: ${user.accounts.length}`);
  }
  
  // 5. Next steps
  console.log("\n🔧 NEXT STEPS:");
  console.log("━".repeat(60));
  
  if (user.role === "USER") {
    console.log("1. Update role using: npx tsx scripts/set-admin.ts");
    console.log("2. Logout from website");
    console.log("3. Clear browser cookies");
    console.log("4. Login again");
  } else {
    console.log("1. Logout from website");
    console.log("2. Clear browser cookies (Ctrl+Shift+Del)");
    console.log("3. Close browser completely");
    console.log("4. Open browser again");
    console.log("5. Login again");
    console.log("6. Check console for: 'SignIn - Existing user'");
  }
  
  console.log("\n━".repeat(60));
  console.log("");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
