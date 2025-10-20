import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// URLs de imagens do Unsplash (casas reais)
const PROPERTY_IMAGES = {
  casa: [
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3',
  ],
  apartamento: [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858',
  ],
  comercial: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
  ],
};

const CITIES = [
  {
    name: 'Petrolina',
    state: 'PE',
    neighborhoods: ['Centro', 'Areia Branca', 'Gercino Coelho', 'Vila Eduardo', 'Jardim Amazonas'],
    coords: { lat: -9.3891, lng: -40.5028 },
  },
  {
    name: 'Juazeiro',
    state: 'BA',
    neighborhoods: ['Centro', 'Santo Antônio', 'Piranga', 'Quitéria', 'João Paulo II'],
    coords: { lat: -9.4111, lng: -40.5028 },
  },
  {
    name: 'Salgueiro',
    state: 'PE',
    neighborhoods: ['Centro', 'Santo Antônio', 'Bom Jesus', 'Primavera', 'Vila Maria'],
    coords: { lat: -8.0742, lng: -39.1197 },
  },
  {
    name: 'Recife',
    state: 'PE',
    neighborhoods: ['Boa Viagem', 'Pina', 'Piedade', 'Espinheiro', 'Graças', 'Casa Forte', 'Aflitos', 'Madalena', 'Torre', 'Encruzilhada'],
    coords: { lat: -8.0476, lng: -34.8770 },
  },
];

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'COMMERCIAL', 'LAND', 'CONDO', 'TOWNHOUSE', 'STUDIO'];
const LISTING_TYPES = ['Venda', 'Aluguel'];
const CONDITION_TAGS = [
  'Novo',
  'Mobiliado',
  'Semi-mobiliado',
  'Em construção',
  'Reformado',
  'Pronto para morar',
  'Aceita permuta',
  'Aceita financiamento',
];
const FEATURES = [
  'Piscina',
  'Churrasqueira',
  'Área de lazer',
  'Portaria 24h',
  'Elevador',
  'Varanda',
  'Sacada',
  'Jardim',
  'Garagem coberta',
  'Armários embutidos',
  'Ar condicionado',
  'Aquecimento solar',
  'Sistema de segurança',
  'Interfone',
  'Salão de festas',
  'Academia',
  'Playground',
  'Quadra esportiva',
];

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePrice(type: string, listingType: string): number {
  if (listingType === 'Aluguel') {
    if (type === 'HOUSE') return getRandomInt(150000, 400000); // R$ 1.500 - 4.000
    if (type === 'APARTMENT' || type === 'CONDO' || type === 'STUDIO') return getRandomInt(100000, 300000); // R$ 1.000 - 3.000
    if (type === 'COMMERCIAL') return getRandomInt(200000, 800000); // R$ 2.000 - 8.000
    return getRandomInt(50000, 150000); // Terreno
  } else {
    if (type === 'HOUSE' || type === 'TOWNHOUSE') return getRandomInt(25000000, 80000000); // R$ 250k - 800k
    if (type === 'APARTMENT' || type === 'CONDO' || type === 'STUDIO') return getRandomInt(15000000, 50000000); // R$ 150k - 500k
    if (type === 'COMMERCIAL') return getRandomInt(30000000, 100000000); // R$ 300k - 1M
    return getRandomInt(5000000, 20000000); // Terreno
  }
}

function getPropertyImages(type: string): string[] {
  const imageType = type === 'COMMERCIAL' ? 'comercial' : type === 'APARTMENT' ? 'apartamento' : 'casa';
  const baseImages = PROPERTY_IMAGES[imageType as keyof typeof PROPERTY_IMAGES];
  return getRandomItems(baseImages, getRandomInt(3, 5));
}

async function main() {
  console.log('🌱 Iniciando seed de imóveis...\n');

  // Busca um usuário existente para ser o owner
  const user = await prisma.user.findFirst();
  
  if (!user) {
    console.error('❌ Nenhum usuário encontrado. Crie um usuário primeiro.');
    return;
  }

  console.log(`✅ Usando usuário: ${user.email}\n`);

  let totalCreated = 0;

  for (const city of CITIES) {
    console.log(`📍 Criando imóveis em ${city.name}, ${city.state}...`);

    for (let i = 0; i < 10; i++) {
      const type = PROPERTY_TYPES[getRandomInt(0, PROPERTY_TYPES.length - 1)] as any;
      const listingType = LISTING_TYPES[getRandomInt(0, 1)];
      const neighborhood = city.neighborhoods[getRandomInt(0, city.neighborhoods.length - 1)];
      const price = generatePrice(type, listingType);
      const imageUrls = getPropertyImages(type);
      
      const typeLabelMap: Record<string, string> = {
        HOUSE: 'Casa',
        APARTMENT: 'Apartamento',
        CONDO: 'Condomínio',
        TOWNHOUSE: 'Sobrado',
        STUDIO: 'Studio',
        COMMERCIAL: 'Imóvel Comercial',
        LAND: 'Terreno'
      };
      const typeLabel = typeLabelMap[type] || type;

      // Cria tags de condição incluindo o tipo de listagem
      const tags = [listingType, ...getRandomItems(CONDITION_TAGS, getRandomInt(1, 3))];

      const property = await prisma.property.create({
        data: {
          title: `${typeLabel} em ${neighborhood}`,
          description: `Excelente ${typeLabel.toLowerCase()} localizado no bairro ${neighborhood}, ${city.name}. ${
            type !== 'LAND' ? 'Imóvel com ótimo acabamento, ' : ''
          }em região privilegiada com fácil acesso a comércios e serviços.`,
          type,
          status: 'ACTIVE',
          price,
          bedrooms: type === 'LAND' || type === 'COMMERCIAL' ? null : type === 'STUDIO' ? 0 : getRandomInt(1, 5),
          bathrooms: type === 'LAND' ? null : getRandomInt(1, 4),
          areaM2: type === 'LAND' ? getRandomInt(200, 1000) : getRandomInt(30, 300),
          parkingSpots: type === 'LAND' ? null : getRandomInt(0, 4),
          street: `Rua ${['das Flores', 'Principal', 'do Comércio', 'da Paz', 'Central'][getRandomInt(0, 4)]}, ${getRandomInt(100, 999)}`,
          neighborhood,
          city: city.name,
          state: city.state,
          postalCode: `${getRandomInt(10000, 99999)}-${getRandomInt(100, 999)}`,
          latitude: city.coords.lat + (Math.random() - 0.5) * 0.1,
          longitude: city.coords.lng + (Math.random() - 0.5) * 0.1,
          conditionTags: tags,
          yearBuilt: type === 'LAND' ? null : getRandomInt(2000, 2024),
          ownerId: user.id,
          images: {
            create: imageUrls.map((url, index) => ({
              url,
              sortOrder: index,
              alt: `${typeLabel} - Foto ${index + 1}`,
            })),
          },
        },
      });

      totalCreated++;
      console.log(`  ✅ ${property.title} (${listingType}) - R$ ${(price / 100).toLocaleString('pt-BR')}`);
    }

    console.log('');
  }

  console.log(`\n🎉 Seed concluído! ${totalCreated} imóveis criados.\n`);
  console.log('📊 Distribuição:');
  console.log(`  - Petrolina: 10 imóveis`);
  console.log(`  - Juazeiro: 10 imóveis`);
  console.log(`  - Salgueiro: 10 imóveis`);
  console.log(`  - Recife: 10 imóveis`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
