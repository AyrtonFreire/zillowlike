import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const role = process.argv[3] as 'USER' | 'ADMIN' | 'REALTOR' | 'OWNER';

  if (!email || !role) {
    console.log('❌ Uso: npm run set-role <email> <role>');
    console.log('   Roles disponíveis: USER, ADMIN, REALTOR, OWNER');
    console.log('\n📝 Exemplo: npm run set-role seu@email.com ADMIN');
    process.exit(1);
  }

  if (!['USER', 'ADMIN', 'REALTOR', 'OWNER'].includes(role)) {
    console.log('❌ Role inválido! Use: USER, ADMIN, REALTOR ou OWNER');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.log(`❌ Usuário com email ${email} não encontrado!`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { role },
  });

  console.log(`✅ Role do usuário ${email} atualizado para ${role}!`);
  console.log('🔄 Faça logout e login novamente para aplicar as mudanças.');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
