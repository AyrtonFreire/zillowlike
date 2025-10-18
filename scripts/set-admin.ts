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
  console.log("🔐 Set User as Admin");
  console.log("━".repeat(50));
  console.log("");
  
  try {
    const email = await question("Enter email to make admin: ");
    
    if (!email) {
      console.log("❌ Email is required!");
      rl.close();
      return;
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      console.log("");
      console.log(`❌ User with email "${email}" not found!`);
      rl.close();
      return;
    }
    
    console.log("");
    console.log("Found user:");
    console.log(`   Name:  ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role}`);
    console.log("");
    
    if (user.role === "ADMIN") {
      console.log("✅ User is already an admin!");
      rl.close();
      return;
    }
    
    const confirm = await question("Make this user an ADMIN? (y/N): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("Cancelled.");
      rl.close();
      return;
    }
    
    // Update user to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    
    console.log("");
    console.log("✅ User updated successfully!");
    console.log("");
    console.log("━".repeat(50));
    console.log("");
    console.log("👤 Admin Details:");
    console.log(`   Name:  ${updatedUser.name}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Role:  ${updatedUser.role}`);
    console.log("");
    console.log("🔑 Next Steps:");
    console.log("");
    console.log("   1. Sign out from the application");
    console.log("   2. Sign in again");
    console.log("   3. You will now have admin access!");
    console.log("");
    console.log("━".repeat(50));
    console.log("");
    
  } catch (error) {
    console.error("❌ Error updating user:");
    console.error(error);
  } finally {
    rl.close();
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
