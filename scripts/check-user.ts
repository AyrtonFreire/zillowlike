import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log("Usage: npx tsx scripts/check-user.ts <email>");
    return;
  }
  
  console.log(`\nChecking user: ${email}\n`);
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });
  
  if (!user) {
    console.log("❌ User not found!");
    return;
  }
  
  console.log("✅ User found:");
  console.log(`   ID: ${user.id}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Email Verified: ${user.emailVerified}`);
  console.log(`   Accounts: ${user.accounts.length}`);
  
  user.accounts.forEach((acc, i) => {
    console.log(`     ${i + 1}. ${acc.provider} (${acc.providerAccountId})`);
  });
  
  console.log("");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
