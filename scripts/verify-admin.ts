import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🔍 Verificando roles dos usuários...\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  console.log('📊 Usuários encontrados:', users.length);
  console.log('');

  for (const user of users) {
    console.log(`👤 ${user.email}`);
    console.log(`   Nome: ${user.name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
  }

  // Verificar se existe admin
  const adminCount = users.filter((u: any) => u.role === 'ADMIN').length;
  console.log(`\n🔐 Total de ADMINS: ${adminCount}`);

  if (adminCount === 0) {
    console.log('\n⚠️  ATENÇÃO: Nenhum admin encontrado!');
    console.log('Execute: npm run set-admin <email> para criar um admin');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
