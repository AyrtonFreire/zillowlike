import { prisma } from "../src/lib/prisma";
import { createPublicCode } from "../src/lib/public-code";

function isPublicCodeCollision(err: any) {
  return (
    err &&
    String(err.code || "") === "P2002" &&
    (Array.isArray(err?.meta?.target)
      ? err.meta.target.includes("publicCode")
      : String(err?.meta?.target || "").includes("publicCode"))
  );
}

async function backfill(model: "property" | "lead", prefix: "P" | "L") {
  let updated = 0;
  while (true) {
    const batch: Array<{ id: string }> = await (prisma as any)[model].findMany({
      where: { publicCode: null },
      select: { id: true },
      take: 250,
      orderBy: { createdAt: "asc" },
    });

    if (!batch.length) break;

    for (const row of batch) {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          await (prisma as any)[model].update({
            where: { id: String(row.id) },
            data: { publicCode: createPublicCode(prefix) },
            select: { id: true },
          });
          updated++;
          break;
        } catch (err: any) {
          if (isPublicCodeCollision(err) && attempt < 7) continue;
          throw err;
        }
      }
    }
  }
  return updated;
}

async function main() {
  const updatedProperties = await backfill("property", "P");
  const updatedLeads = await backfill("lead", "L");

  console.log(
    JSON.stringify(
      {
        updatedProperties,
        updatedLeads,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
