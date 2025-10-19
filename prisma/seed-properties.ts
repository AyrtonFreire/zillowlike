import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populando banco de dados com imóveis...\n');

  // Criar usuário proprietário se não existir
  let owner = await prisma.user.findUnique({
    where: { email: 'proprietario@zillowlike.com' },
  });

  if (!owner) {
    owner = await prisma.user.create({
      data: {
        email: 'proprietario@zillowlike.com',
        name: 'Imobiliária ZillowLike',
        role: 'OWNER',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Proprietário criado:', owner.email);
  } else {
    console.log('✅ Proprietário já existe:', owner.email);
  }

  console.log('\n🏠 Criando imóveis em Petrolina e Juazeiro...\n');

  // Limpar imóveis existentes
  await prisma.image.deleteMany();
  await prisma.property.deleteMany();
  console.log('🗑️  Imóveis antigos removidos\n');

  // PETROLINA - Imóveis para Venda
  const properties = [
    {
      title: 'Casa Moderna no Jardim São Paulo',
      description: 'Linda casa com 4 quartos, sendo 2 suítes, piscina, área gourmet completa e garagem para 3 carros. Acabamento de primeira qualidade.',
      price: 75000000, // R$ 750.000
      type: 'HOUSE',
      street: 'Rua das Acácias, 234',
      neighborhood: 'Jardim São Paulo',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56328-000',
      latitude: -9.3891,
      longitude: -40.5008,
      bedrooms: 4,
      bathrooms: 3,
      suites: 2,
      parkingSpots: 3,
      areaM2: 280,
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
        'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800',
        'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
      ],
    },
    {
      title: 'Apartamento Luxo no Centro de Petrolina',
      description: 'Apartamento de alto padrão com 3 suítes, varanda gourmet, 2 vagas de garagem. Prédio com elevador, portaria 24h e salão de festas.',
      price: 45000000, // R$ 450.000
      type: 'APARTMENT',
      street: 'Avenida Cardoso de Sá, 1500',
      neighborhood: 'Centro',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56304-000',
      latitude: -9.3859,
      longitude: -40.5025,
      bedrooms: 3,
      bathrooms: 3,
      suites: 3,
      parkingSpots: 2,
      areaM2: 120,
      floor: 8,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      ],
    },
    {
      title: 'Cobertura Duplex - Orla do Rio São Francisco',
      description: 'Cobertura duplex de luxo com vista para o Rio São Francisco. 4 suítes, piscina privativa, churrasqueira, 4 vagas. Acabamento premium.',
      price: 120000000, // R$ 1.200.000
      type: 'APARTMENT',
      street: 'Avenida Guararapes, 800',
      neighborhood: 'Orla',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56320-000',
      latitude: -9.3795,
      longitude: -40.5089,
      bedrooms: 4,
      bathrooms: 5,
      suites: 4,
      parkingSpots: 4,
      areaM2: 350,
      floor: 15,
      images: [
        'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
        'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800',
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
        'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
      ],
    },
    {
      title: 'Sobrado Novo - Condomínio Fechado Gercino Coelho',
      description: 'Sobrado novo nunca habitado em condomínio fechado. 3 suítes, área gourmet, piscina, 2 vagas. Segurança 24h.',
      price: 58000000, // R$ 580.000
      type: 'HOUSE',
      street: 'Rua do Condomínio, 45',
      neighborhood: 'Gercino Coelho',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56330-000',
      latitude: -9.3920,
      longitude: -40.4950,
      bedrooms: 3,
      bathrooms: 4,
      suites: 3,
      parkingSpots: 2,
      areaM2: 220,
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
        'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800',
        'https://images.unsplash.com/photo-1600563438938-a9a27216b4f5?w=800',
      ],
    },
    {
      title: 'Terreno Comercial - Avenida Principal',
      description: 'Excelente terreno comercial em avenida de grande movimento. Ideal para construção de loja, escritório ou prédio comercial.',
      price: 35000000, // R$ 350.000
      type: 'LAND',
      street: 'Avenida Souza Filho, 2100',
      neighborhood: 'Centro',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56302-000',
      latitude: -9.3850,
      longitude: -40.5100,
      areaM2: 600,
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
    },

    // JUAZEIRO - Imóveis para Venda
    {
      title: 'Casa Espaçosa no Jardim Primavera',
      description: 'Casa ampla com 4 quartos, sala de estar e jantar, cozinha planejada, quintal grande. Ótima localização.',
      price: 38000000, // R$ 380.000
      type: 'HOUSE',
      street: 'Rua das Flores, 567',
      neighborhood: 'Jardim Primavera',
      city: 'Juazeiro',
      state: 'BA',
      postalCode: '48903-000',
      latitude: -9.4114,
      longitude: -40.5050,
      bedrooms: 4,
      bathrooms: 2,
      parkingSpots: 2,
      areaM2: 200,
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      ],
    },
    {
      title: 'Apartamento 3 Quartos - Centro Juazeiro',
      description: 'Apartamento bem localizado no centro de Juazeiro. 3 quartos, sala, cozinha, área de serviço. Prédio com elevador.',
      price: 28000000, // R$ 280.000
      type: 'APARTMENT',
      street: 'Avenida Adolfo Viana, 890',
      neighborhood: 'Centro',
      city: 'Juazeiro',
      state: 'BA',
      postalCode: '48900-000',
      latitude: -9.4150,
      longitude: -40.5080,
      bedrooms: 3,
      bathrooms: 2,
      parkingSpots: 1,
      areaM2: 85,
      floor: 5,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      ],
    },
    {
      title: 'Chácara com Casa - Zona Rural Juazeiro',
      description: 'Chácara de 5000m² com casa de 3 quartos, pomar com árvores frutíferas, poço artesiano, área de lazer completa.',
      price: 48000000, // R$ 480.000
      type: 'HOUSE',
      street: 'Zona Rural, Km 12',
      neighborhood: 'Zona Rural',
      city: 'Juazeiro',
      state: 'BA',
      postalCode: '48910-000',
      latitude: -9.3500,
      longitude: -40.4500,
      bedrooms: 3,
      bathrooms: 2,
      parkingSpots: 4,
      areaM2: 5000,
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      ],
    },

    // PETROLINA - Imóveis para Alugar
    {
      title: 'Casa para Alugar - 3 Quartos Vila Eduardo',
      description: 'Casa confortável para locação. 3 quartos, sala, cozinha, garagem coberta, quintal. Próximo a escolas e comércio.',
      price: 180000, // R$ 1.800/mês
      type: 'HOUSE',
      street: 'Rua São José, 123',
      neighborhood: 'Vila Eduardo',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56306-000',
      latitude: -9.3700,
      longitude: -40.4850,
      bedrooms: 3,
      bathrooms: 2,
      parkingSpots: 1,
      areaM2: 150,
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      ],
    },
    {
      title: 'Apartamento Studio - Próximo UNIVASF',
      description: 'Studio mobiliado perfeito para estudantes. Cozinha americana, banheiro, 1 vaga. Condomínio com segurança.',
      price: 80000, // R$ 800/mês
      type: 'STUDIO',
      street: 'Rua Universitária, 789',
      neighborhood: 'Areia Branca',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56314-000',
      latitude: -9.3650,
      longitude: -40.4900,
      bedrooms: 1,
      bathrooms: 1,
      parkingSpots: 1,
      areaM2: 35,
      furnished: true,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      ],
    },
    {
      title: 'Sala Comercial - Edifício Empresarial',
      description: 'Sala comercial moderna em edifício empresarial. Ideal para escritório, consultório ou pequena empresa. 1 vaga.',
      price: 150000, // R$ 1.500/mês
      type: 'COMMERCIAL',
      street: 'Avenida Cardoso de Sá, 2000 - Sala 302',
      neighborhood: 'Centro',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56304-000',
      latitude: -9.3860,
      longitude: -40.5020,
      bathrooms: 1,
      parkingSpots: 1,
      areaM2: 45,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      ],
    },
    {
      title: 'Galpão Industrial - Distrito Industrial',
      description: 'Galpão de 800m² com pé direito alto, escritório, banheiros, amplo estacionamento. Ótimo para indústria ou logística.',
      price: 650000, // R$ 6.500/mês
      type: 'COMMERCIAL',
      street: 'Distrito Industrial, Lote 42',
      neighborhood: 'Distrito Industrial',
      city: 'Petrolina',
      state: 'PE',
      postalCode: '56320-000',
      latitude: -9.4100,
      longitude: -40.5200,
      bathrooms: 2,
      parkingSpots: 10,
      areaM2: 800,
      images: [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
        'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800',
      ],
    },

    // JUAZEIRO - Imóveis para Alugar
    {
      title: 'Apartamento 2 Quartos - Aluguel Juazeiro',
      description: 'Apartamento bem conservado para locação. 2 quartos, sala, cozinha, área de serviço, 1 vaga.',
      price: 120000, // R$ 1.200/mês
      type: 'APARTMENT',
      street: 'Rua Barão do Rio Branco, 456',
      neighborhood: 'Centro',
      city: 'Juazeiro',
      state: 'BA',
      postalCode: '48902-000',
      latitude: -9.4120,
      longitude: -40.5060,
      bedrooms: 2,
      bathrooms: 1,
      parkingSpots: 1,
      areaM2: 70,
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      ],
    },
    {
      title: 'Casa Ampla para Alugar - 4 Quartos',
      description: 'Casa grande ideal para família. 4 quartos, 2 banheiros, sala ampla, cozinha, quintal grande, 2 vagas.',
      price: 220000, // R$ 2.200/mês
      type: 'HOUSE',
      street: 'Rua das Palmeiras, 890',
      neighborhood: 'Santo Antônio',
      city: 'Juazeiro',
      state: 'BA',
      postalCode: '48905-000',
      latitude: -9.4050,
      longitude: -40.4950,
      bedrooms: 4,
      bathrooms: 2,
      parkingSpots: 2,
      areaM2: 180,
      images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      ],
    },
    {
      title: 'Loja Comercial - Rua Movimentada',
      description: 'Loja comercial em rua de grande movimento. Ótima para comércio em geral. Banheiro, depósito.',
      price: 280000, // R$ 2.800/mês
      type: 'COMMERCIAL',
      street: 'Avenida Adolfo Viana, 1200',
      neighborhood: 'Centro',
      city: 'Juazeiro',
      state: 'BA',
      postalCode: '48900-000',
      latitude: -9.4140,
      longitude: -40.5070,
      bathrooms: 1,
      areaM2: 120,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      ],
    },
  ];

  // Criar cada imóvel
  for (const prop of properties) {
    const { images, ...propertyData } = prop;
    
    const property = await prisma.property.create({
      data: {
        ...propertyData,
        status: 'ACTIVE',
        ownerId: owner.id,
      },
    });

    // Adicionar imagens
    for (let i = 0; i < images.length; i++) {
      await prisma.image.create({
        data: {
          url: images[i],
          propertyId: property.id,
          sortOrder: i,
        },
      });
    }

    console.log(`✅ ${property.title}`);
  }

  console.log(`\n📊 Total de imóveis criados: ${properties.length}`);
  console.log(`   - Petrolina: ${properties.filter(p => p.city === 'Petrolina').length}`);
  console.log(`   - Juazeiro: ${properties.filter(p => p.city === 'Juazeiro').length}`);
  console.log(`\n✅ Seed completo! Acesse http://localhost:3000 para ver os imóveis.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
