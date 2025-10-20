import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔄 Inicializando fila de corretores...\n');

  // Buscar todos os usuários com role REALTOR
  const realtors = await prisma.user.findMany({
    where: { role: 'REALTOR' },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  console.log(`📊 Encontrados ${realtors.length} corretores\n`);

  if (realtors.length === 0) {
    console.log('⚠️  Nenhum corretor encontrado!');
    console.log('Crie corretores primeiro com: npm run set-role <email> REALTOR');
    return;
  }

  // Verificar quais corretores já estão na fila
  const existingQueues = await prisma.realtorQueue.findMany({
    select: { realtorId: true },
  });

  const existingRealtorIds = new Set(existingQueues.map((q: any) => q.realtorId));

  // Adicionar corretores que não estão na fila
  let added = 0;
  let skipped = 0;

  for (const realtor of realtors) {
    if (existingRealtorIds.has(realtor.id)) {
      console.log(`⏭️  ${realtor.name} (${realtor.email}) - Já está na fila`);
      skipped++;
      continue;
    }

    // Buscar a próxima posição disponível
    const maxPosition = await prisma.realtorQueue.findFirst({
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const nextPosition = (maxPosition?.position || 0) + 1;

    // Criar entrada na fila
    await prisma.realtorQueue.create({
      data: {
        realtorId: realtor.id,
        position: nextPosition,
        score: 0,
        status: 'ACTIVE',
        activeLeads: 0,
        bonusLeads: 0,
        totalAccepted: 0,
        totalRejected: 0,
        totalExpired: 0,
      },
    });

    console.log(`✅ ${realtor.name} (${realtor.email}) - Adicionado na posição ${nextPosition}`);
    added++;
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Adicionados: ${added}`);
  console.log(`   ⏭️  Já existiam: ${skipped}`);
  console.log(`   📋 Total na fila: ${added + skipped}`);

  // Mostrar fila atual
  console.log('\n📋 Fila atual:');
  const queue = await prisma.realtorQueue.findMany({
    include: {
      realtor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  queue.forEach((q: any) => {
    const statusIcon = q.status === 'ACTIVE' ? '🟢' : '🔴';
    console.log(`   ${statusIcon} #${q.position} - ${q.realtor.name} (${q.realtor.email})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
