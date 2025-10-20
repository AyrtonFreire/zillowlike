import { prisma } from '../src/lib/prisma';

async function main() {
  const email = 'ayrtonofreire@gmail.com';
  
  console.log(`🔍 Verificando role de: ${email}\n`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
    },
  });

  if (!user) {
    console.log('❌ Usuário não encontrado no banco de dados!');
    console.log('\nCriando usuário como ADMIN...');
    
    const newUser = await prisma.user.create({
      data: {
        email,
        name: 'Ayrton Freire',
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    });
    
    console.log('✅ Usuário criado como ADMIN!');
    console.log(newUser);
  } else {
    console.log('📊 Dados do usuário:');
    console.log('   Email:', user.email);
    console.log('   Nome:', user.name);
    console.log('   Role:', user.role);
    console.log('   ID:', user.id);
    console.log('   Email Verificado:', user.emailVerified);
    
    if (user.role !== 'ADMIN') {
      console.log('\n⚠️  Role atual NÃO é ADMIN!');
      console.log('Atualizando para ADMIN...');
      
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
      });
      
      console.log('✅ Role atualizado para ADMIN!');
    } else {
      console.log('\n✅ Role já é ADMIN!');
    }
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
