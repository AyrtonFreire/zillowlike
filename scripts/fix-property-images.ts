import { PrismaClient, Property } from "@prisma/client";

/**
 * Script de manutenção para corrigir imagens dos imóveis.
 * - Substitui links problemáticos (ex.: source.unsplash.com) por URLs diretas do CDN (images.unsplash.com)
 * - Usa um pool CURADO de fotos por tipo (apartamento, casa, condomínio, comercial, studio, terreno)
 * - Evita repetições globais de imagens (tenta ao máximo não repetir entre imóveis)
 * - Gera entre 6–8 fotos por imóvel, com sortOrder crescente
 *
 * Execução:
 *   npx tsx scripts/fix-property-images.ts
 *
 * ATENÇÃO: Este script altera dados em produção se o DATABASE_URL apontar para o banco de prod.
 */

const prisma = new PrismaClient();

// Pool de fotos por tipo (IDs do Unsplash com foco em imóveis, evitando pessoas)
// Expandido para reduzir repetições visuais. Podemos continuar ampliando conforme necessário.
const POOL: Record<string, string[]> = {
  HOUSE: [
    "1501045661006-fcebe0257c3f","1505691723518-36a5ac3b2d52","1500530855697-94f52f9b9b6b",
    "1493666438817-866a91353ca9","1520880867055-1e30d1cb001c","1519710164239-da123dc03ef4",
    "1505693416388-ac5ce068fe85","1505691938895-1758d7feb511","1524758631624-e2822e304c36",
    "1501183007986-d0d080b147f9","1560184897-a3ddc27b5857","1502673530728-f79b4cab31b1",
    "1505691938895-1758d7feb511","1523217582562-09d0def993a6","1512918728675-ed5a9ecdebfd",
    "1505693416388-ac5ce068fe85","1497366216548-37526070297c"
  ],
  APARTMENT: [
    "1505693416388-ac5ce068fe85","1519710164239-da123dc03ef4","1493666438817-866a91353ca9",
    "1524758631624-e2822e304c36","1520880867055-1e30d1cb001c","1501045661006-fcebe0257c3f",
    "1505691938895-1758d7feb511","1501183007986-d0d080b147f9","1554995203-94b4c8eaf1f0",
    "1521783988139-893ce4bfbfd5","1523217582562-09d0def993a6","1512918728675-ed5a9ecdebfd"
  ],
  CONDO: [
    "1501183007986-d0d080b147f9","1512918728675-ed5a9ecdebfd","1486325212027-8081e485255e",
    "1486308510493-aa64833637b8","1480074568708-e7b720bb3f09","1523217582562-09d0def993a6",
    "1505691723518-36a5ac3b2d52","1501045661006-fcebe0257c3f","1505691938895-1758d7feb511"
  ],
  STUDIO: [
    "1493666438817-866a91353ca9","1524758631624-e2822e304c36","1519710164239-da123dc03ef4",
    "1520880867055-1e30d1cb001c","1505693416388-ac5ce068fe85","1501045661006-fcebe0257c3f",
    "1521783988139-893ce4bfbfd5"
  ],
  COMMERCIAL: [
    "1497366216548-37526070297c","1483058712412-4245e9b90334","1466354424719-343280fe118b",
    "1460353581641-37baddab0fa2","1500534314209-a25ddb2bd429","1505691723518-36a5ac3b2d52"
  ],
  LAND: [
    // Terrenos/lotes (sem pessoas)
    "1500534314209-a25ddb2bd429","1496307042754-b4aa456c4a2d","1469474968028-56623f02e42e",
    "1501785888041-af3ef285b470","1441974231531-c6227db76b6e","1501785888041-af3ef285b470"
  ],
};

function buildUrl(id: string, w = 1600, q = 80) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hash simples do ID para rotação determinística por imóvel
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Seleciona imagens com rotação baseada no ID e limite global de reutilização
function pickImagesForType(propertyId: string, type: string, count: number, usage: Map<string, number>, maxReuse = 1) {
  const pool = POOL[type] || POOL["HOUSE"]; // fallback
  const start = hashId(propertyId) % pool.length;
  const urls: string[] = [];
  const seen = new Set<string>();

  // 1) Passo preferencial: sem repetir globalmente acima de maxReuse e sem repetir no próprio imóvel
  for (let k = 0; k < pool.length && urls.length < count; k++) {
    const id = pool[(start + k) % pool.length];
    const url = buildUrl(id);
    const times = usage.get(url) || 0;
    if (times < maxReuse && !seen.has(url)) {
      usage.set(url, times + 1);
      seen.add(url);
      urls.push(url);
    }
  }

  // 2) Se ainda faltar, permita reutilizar até atingir count, mas nunca duplicando dentro do mesmo imóvel
  for (let k = 0; urls.length < count && k < pool.length * 2; k++) {
    const id = pool[(start + k) % pool.length];
    const url = buildUrl(id);
    if (!seen.has(url)) {
      const times = usage.get(url) || 0;
      usage.set(url, times + 1);
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

async function main() {
  console.log("🔧 Corrigindo imagens de imóveis...");

  // uso global por URL para reduzir repetições
  const usage = new Map<string, number>();
  const batchSize = 50;
  let cursor: string | null = null;
  let processed = 0;

  for (;;) {
    const page: { id: string; type: string }[] = await prisma.property.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, type: true }
    });

    if (page.length === 0) break;

    for (const p of page) {
      const type = (p.type as string) || "HOUSE";
      const desired = rand(6, 8);
      const urls = pickImagesForType(p.id, type, desired, usage, 1);

      // Replace strategy: apaga e recria ordenado
      await prisma.$transaction([
        prisma.image.deleteMany({ where: { propertyId: p.id } }),
        prisma.image.createMany({
          data: urls.map((url, idx) => ({
            propertyId: p.id,
            url,
            sortOrder: idx,
          })),
        }),
      ]);

      processed++;
      if (processed % 10 === 0) {
        console.log(`  ✅ ${processed} imóveis atualizados...`);
      }
    }

    cursor = page[page.length - 1].id;
  }

  console.log(`🎉 Concluído. Imóveis atualizados: ${processed}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
