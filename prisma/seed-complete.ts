import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo do banco de dados...\n');

  // Limpar dados existentes
  console.log('🗑️  Limpando dados existentes...');
  await prisma.image.deleteMany();
  await prisma.property.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Dados limpos!\n');

  // Criar usuários de teste
  console.log('👥 Criando usuários...');
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@zillowlike.com',
      name: 'Admin Master',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Admin criado:', admin.email);

  const realtor1 = await prisma.user.create({
    data: {
      email: 'corretor1@zillowlike.com',
      name: 'João Silva',
      role: 'REALTOR',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Corretor 1 criado:', realtor1.email);

  const realtor2 = await prisma.user.create({
    data: {
      email: 'corretor2@zillowlike.com',
      name: 'Maria Santos',
      role: 'REALTOR',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Corretor 2 criado:', realtor2.email);

  const owner1 = await prisma.user.create({
    data: {
      email: 'proprietario1@zillowlike.com',
      name: 'Carlos Oliveira',
      role: 'OWNER',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Proprietário 1 criado:', owner1.email);

  const owner2 = await prisma.user.create({
    data: {
      email: 'proprietario2@zillowlike.com',
      name: 'Ana Costa',
      role: 'OWNER',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Proprietário 2 criado:', owner2.email);

  const user1 = await prisma.user.create({
    data: {
      email: 'usuario@zillowlike.com',
      name: 'Pedro Almeida',
      role: 'USER',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Usuário comum criado:', user1.email);

  console.log('\n🏠 Criando imóveis...\n');

  // Imóveis do Proprietário 1 (Carlos)
  const property1 = await prisma.property.create({
    data: {
      title: 'Casa Moderna com Piscina - Petrolina',
      description: 'Linda casa moderna com 4 quartos, piscina, churrasqueira e área gourmet. Localizada em condomínio fechado de alto padrão.',
      price: 85000000,
      type: 'HOUSE',
      status: 'ACTIVE',
      bedrooms: 4,
      bathrooms: 3,
      parkingSpots: 2,
      areaM2: 250,
      street: 'Rua das Flores, 123',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56300-000',
      latitude: -9.3891,
      longitude: -40.5008,
      ownerId: owner1.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', order: 1 },
          { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', order: 2 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 1 criado:', property1.title);

  const property2 = await prisma.property.create({
    data: {
      title: 'Apartamento Luxuoso Centro - Juazeiro',
      description: 'Apartamento de alto padrão no centro de Juazeiro, com 3 suítes, varanda gourmet e vista panorâmica.',
      price: 450000,
      propertyType: 'APARTMENT',
      transactionType: 'SALE',
      bedrooms: 3,
      bathrooms: 3,
      parkingSpaces: 2,
      areaM2: 120,
      address: 'Avenida Principal, 456',
      city: 'Juazeiro',
      state: 'BA',
      zipCode: '48900-000',
      latitude: -9.4114,
      longitude: -40.5050,
      isFeatured: true,
      status: 'AVAILABLE',
      ownerId: owner1.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', order: 1 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 2 criado:', property2.title);

  // Imóveis do Proprietário 2 (Ana)
  const property3 = await prisma.property.create({
    data: {
      title: 'Terreno Comercial - Petrolina',
      description: 'Excelente terreno comercial em localização privilegiada, próximo a shopping e avenida principal.',
      price: 320000,
      propertyType: 'LAND',
      transactionType: 'SALE',
      areaM2: 500,
      address: 'Avenida Comercial, 789',
      city: 'Petrolina',
      state: 'PE',
      zipCode: '56302-000',
      latitude: -9.3950,
      longitude: -40.5100,
      isFeatured: false,
      status: 'AVAILABLE',
      ownerId: owner2.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', order: 0 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 3 criado:', property3.title);

  const property4 = await prisma.property.create({
    data: {
      title: 'Casa para Alugar - 3 Quartos',
      description: 'Casa confortável para locação, 3 quartos, garagem coberta, quintal amplo.',
      price: 2500,
      propertyType: 'HOUSE',
      transactionType: 'RENT',
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 1,
      areaM2: 150,
      address: 'Rua Residencial, 321',
      city: 'Petrolina',
      state: 'PE',
      zipCode: '56304-000',
      latitude: -9.3800,
      longitude: -40.4900,
      isFeatured: false,
      status: 'AVAILABLE',
      ownerId: owner2.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', order: 1 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 4 criado:', property4.title);

  const property5 = await prisma.property.create({
    data: {
      title: 'Sala Comercial - Centro Empresarial',
      description: 'Sala comercial moderna em prédio empresarial, ideal para escritório ou consultório.',
      price: 1800,
      propertyType: 'COMMERCIAL',
      transactionType: 'RENT',
      bathrooms: 1,
      parkingSpaces: 1,
      areaM2: 45,
      address: 'Edifício Business, Sala 302',
      city: 'Juazeiro',
      state: 'BA',
      zipCode: '48902-000',
      latitude: -9.4150,
      longitude: -40.5080,
      isFeatured: false,
      status: 'AVAILABLE',
      ownerId: owner2.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', order: 0 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 5 criado:', property5.title);

  // Mais imóveis variados
  const property6 = await prisma.property.create({
    data: {
      title: 'Cobertura Duplex - Vista Rio',
      description: 'Cobertura duplex de luxo com vista para o Rio São Francisco, 4 suítes, piscina privativa.',
      price: 1200000,
      propertyType: 'APARTMENT',
      transactionType: 'SALE',
      bedrooms: 4,
      bathrooms: 5,
      parkingSpaces: 3,
      areaM2: 280,
      address: 'Orla do Rio, 100',
      city: 'Juazeiro',
      state: 'BA',
      zipCode: '48905-000',
      latitude: -9.4200,
      longitude: -40.5150,
      isFeatured: true,
      status: 'AVAILABLE',
      ownerId: owner1.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', order: 1 },
          { url: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800', order: 2 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 6 criado:', property6.title);

  const property7 = await prisma.property.create({
    data: {
      title: 'Chácara com Casa - Zona Rural',
      description: 'Chácara de 5000m² com casa de 3 quartos, pomar, poço artesiano e área de lazer completa.',
      price: 550000,
      propertyType: 'HOUSE',
      transactionType: 'SALE',
      bedrooms: 3,
      bathrooms: 2,
      parkingSpaces: 4,
      areaM2: 5000,
      address: 'Zona Rural, Km 15',
      city: 'Petrolina',
      state: 'PE',
      zipCode: '56310-000',
      latitude: -9.3500,
      longitude: -40.4500,
      isFeatured: false,
      status: 'AVAILABLE',
      ownerId: owner1.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', order: 0 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 7 criado:', property7.title);

  const property8 = await prisma.property.create({
    data: {
      title: 'Apartamento Compacto - Estudante',
      description: 'Apartamento tipo studio, perfeito para estudantes, mobiliado, próximo à universidade.',
      price: 800,
      propertyType: 'APARTMENT',
      transactionType: 'RENT',
      bedrooms: 1,
      bathrooms: 1,
      parkingSpaces: 1,
      areaM2: 35,
      address: 'Rua Universitária, 555',
      city: 'Petrolina',
      state: 'PE',
      zipCode: '56306-000',
      latitude: -9.3700,
      longitude: -40.4850,
      isFeatured: false,
      status: 'AVAILABLE',
      ownerId: owner2.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', order: 0 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 8 criado:', property8.title);

  const property9 = await prisma.property.create({
    data: {
      title: 'Galpão Industrial - Distrito Industrial',
      description: 'Galpão de 800m² com pé direito alto, escritório, banheiros e amplo estacionamento.',
      price: 6500,
      propertyType: 'COMMERCIAL',
      transactionType: 'RENT',
      bathrooms: 2,
      parkingSpaces: 10,
      areaM2: 800,
      address: 'Distrito Industrial, Lote 42',
      city: 'Petrolina',
      state: 'PE',
      zipCode: '56320-000',
      latitude: -9.4100,
      longitude: -40.5200,
      isFeatured: false,
      status: 'AVAILABLE',
      ownerId: owner1.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800', order: 0 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 9 criado:', property9.title);

  const property10 = await prisma.property.create({
    data: {
      title: 'Sobrado Novo - Condomínio Fechado',
      description: 'Sobrado novo nunca habitado, 3 suítes, área gourmet, condomínio com segurança 24h.',
      price: 680000,
      propertyType: 'HOUSE',
      transactionType: 'SALE',
      bedrooms: 3,
      bathrooms: 4,
      parkingSpaces: 2,
      areaM2: 180,
      address: 'Condomínio Residencial, Casa 15',
      city: 'Juazeiro',
      state: 'BA',
      zipCode: '48908-000',
      latitude: -9.4050,
      longitude: -40.4950,
      isFeatured: true,
      status: 'AVAILABLE',
      ownerId: owner2.id,
      images: {
        create: [
          { url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800', order: 0 },
          { url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', order: 1 },
        ],
      },
    },
  });
  console.log('✅ Imóvel 10 criado:', property10.title);

  console.log('\n📊 Resumo do Seed:');
  console.log('==================');
  console.log(`👥 Usuários criados: 6`);
  console.log(`   - 1 Admin: ${admin.email}`);
  console.log(`   - 2 Corretores: ${realtor1.email}, ${realtor2.email}`);
  console.log(`   - 2 Proprietários: ${owner1.email}, ${owner2.email}`);
  console.log(`   - 1 Usuário: ${user1.email}`);
  console.log(`\n🏠 Imóveis criados: 10`);
  console.log(`   - 6 para Venda`);
  console.log(`   - 4 para Aluguel`);
  console.log(`   - 4 em Destaque`);
  console.log(`\n✅ Seed completo executado com sucesso!`);
  console.log('\n🔑 Para fazer login, use Google OAuth com qualquer um dos emails acima.');
  console.log('   Depois, use o script set-role.ts para definir o role correto.');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
