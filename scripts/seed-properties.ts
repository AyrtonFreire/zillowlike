import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gerador de imagens únicas por tipo usando Unsplash Source (random + sig)
// Garante URLs distintas entre propriedades e >5 fotos por imóvel
const IMG_QUERY: Record<string, string> = {
  HOUSE: 'house,modern,exterior',
  TOWNHOUSE: 'townhouse,modern,exterior',
  APARTMENT: 'apartment,interior,living-room',
  CONDO: 'condo,interior,architecture',
  STUDIO: 'studio,apartment,interior',
  COMMERCIAL: 'office,building,interior,exterior',
  LAND: 'land,lot,field,real-estate'
};
// Use direct Unsplash image IDs to avoid redirect/optimizer issues on Vercel
// Photo IDs are public Unsplash IDs by theme. Feel free to expand.
const UNSPLASH_PHOTOS: Record<string, string[]> = {
  HOUSE: [
    '1500530855697-94f52f9b9b6b', // exterior house
    '1560184897-a3ddc27b5857',
    '1502673530728-f79b4cab31b1',
    '1501045661006-fcebe0257c3f',
    '1505691723518-36a5ac3b2d52',
    '1501183007986-d0d080b147f9',
  ],
  APARTMENT: [
    '1505693416388-ac5ce068fe85',
    '1519710164239-da123dc03ef4',
    '1505691938895-1758d7feb511',
    '1505691723518-36a5ac3b2d52',
    '1554995203-94b4c8eaf1f0',
    '1521783988139-893ce4bfbfd5',
  ],
  CONDO: [
    '1486308510493-aa64833637b8',
    '1480074568708-e7b720bb3f09',
    '1486325212027-8081e485255e',
    '1501183007986-d0d080b147f9',
    '1523217582562-09d0def993a6',
    '1512918728675-ed5a9ecdebfd',
  ],
  STUDIO: [
    '1493666438817-866a91353ca9',
    '1524758631624-e2822e304c36',
    '1520880867055-1e30d1cb001c',
    '1501045661006-fcebe0257c3f',
    '1519710164239-da123dc03ef4',
    '1524758631624-e2822e304c36',
  ],
  LAND: [
    '1501785888041-af3ef285b470',
    '1469474968028-56623f02e42e',
    '1441974231531-c6227db76b6e',
    '1441974231531-c6227db76b6e',
    '1500534314209-a25ddb2bd429',
    '1496307042754-b4aa456c4a2d',
  ],
  COMMERCIAL: [
    '1497366216548-37526070297c',
    '1466354424719-343280fe118b',
    '1500534314209-a25ddb2bd429',
    '1483058712412-4245e9b90334',
    '1497366216548-37526070297c',
    '1460353581641-37baddab0fa2',
  ],
};

function imagesFromIds(type: string, count: number): string[] {
  const fallback = '1501183007986-d0d080b147f9';
  const ids = UNSPLASH_PHOTOS[type] || UNSPLASH_PHOTOS['HOUSE'] || [fallback];
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = ids[i % ids.length] || fallback;
    // Direct Unsplash CDN URL, no redirect
    list.push(`https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`);
  }
  return list;
}

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

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'COMMERCIAL', 'LAND', 'CONDO', 'TOWNHOUSE', 'STUDIO'] as const;
const LISTING_TYPES = ['Venda', 'Aluguel'] as const;
// Tags de condição alinhadas ao formulário de cadastro (uma por imóvel)
const CONDITION_TAGS = [
  'Novo',
  'Condomínio',
  'Aceita pets',
  'Aceita permuta',
  'Mobiliado',
  'Semi-mobiliado',
  'Em obras',
  'Em construção',
  'Na planta',
  'Reformado',
  'Pronto para morar',
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
    // valores em centavos (inteiros), arredondados para múltiplos de 100 (sem centavos quebrados)
    if (type === 'HOUSE') return Math.round(getRandomInt(150000, 400000) / 100) * 100; // R$ 1.500 - 4.000
    if (type === 'APARTMENT' || type === 'CONDO' || type === 'STUDIO') return Math.round(getRandomInt(100000, 300000) / 100) * 100; // R$ 1.000 - 3.000
    if (type === 'COMMERCIAL') return Math.round(getRandomInt(200000, 800000) / 100) * 100; // R$ 2.000 - 8.000
    return Math.round(getRandomInt(50000, 150000) / 100) * 100; // Terreno
  } else {
    if (type === 'HOUSE' || type === 'TOWNHOUSE') return Math.round(getRandomInt(25000000, 80000000) / 100) * 100; // R$ 250k - 800k
    if (type === 'APARTMENT' || type === 'CONDO' || type === 'STUDIO') return Math.round(getRandomInt(15000000, 50000000) / 100) * 100; // R$ 150k - 500k
    if (type === 'COMMERCIAL') return Math.round(getRandomInt(30000000, 100000000) / 100) * 100; // R$ 300k - 1M
    return Math.round(getRandomInt(5000000, 20000000) / 100) * 100; // Terreno
  }
}

function getPropertyImages(type: string): string[] {
  return imagesFromIds(type, getRandomInt(6, 8)); // sempre >5
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

  // Limpeza total de dados anteriores (imagens e imóveis)
  console.log('🧹 Limpando imóveis e dependências (favorites, leads, views, images)...');
  await prisma.$transaction([
    prisma.favorite.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.propertyView.deleteMany({}),
    prisma.image.deleteMany({}),
    prisma.property.deleteMany({}),
  ]);
  console.log('✅ Limpeza concluída.');

  let totalCreated = 0;

  for (const city of CITIES) {
    console.log(`📍 Criando imóveis em ${city.name}, ${city.state}...`);

    for (let i = 0; i < 10; i++) {
      const type = PROPERTY_TYPES[getRandomInt(0, PROPERTY_TYPES.length - 1)] as typeof PROPERTY_TYPES[number];
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

      // Cria UMA tag de condição (Novo, Reformado, etc.) sem incluir Venda/Aluguel
      const tags = getRandomItems(CONDITION_TAGS, 1);

      const purpose = listingType === 'Aluguel' ? 'RENT' : 'SALE';
      const bedrooms = type === 'LAND' || type === 'COMMERCIAL' ? null : (type === 'STUDIO' ? 0 : getRandomInt(1, 5));
      const bathrooms = type === 'LAND' ? null : getRandomInt(1, 4);
      const areaM2 = type === 'LAND' ? getRandomInt(200, 1000) : getRandomInt(30, 300);
      const parkingSpots = type === 'LAND' ? null : getRandomInt(0, 4);
      const suites = bedrooms && bedrooms > 2 ? getRandomInt(1, Math.min(2, bedrooms - 1)) : 0;
      const floor = type === 'APARTMENT' || type === 'CONDO' ? getRandomInt(1, 20) : null;
      const condoFee = (type === 'APARTMENT' || type === 'CONDO') ? getRandomInt(15000, 65000) : null; // em centavos

      // Recursos adicionais alinhados ao schema
      const extras = {
        hasBalcony: Math.random() < 0.5,
        hasElevator: (type === 'APARTMENT' || type === 'CONDO') ? Math.random() < 0.8 : Math.random() < 0.2,
        hasPool: Math.random() < 0.35,
        hasGym: Math.random() < 0.3,
        hasPlayground: Math.random() < 0.25,
        hasPartyRoom: Math.random() < 0.3,
        hasGourmet: Math.random() < 0.35,
        hasConcierge24h: Math.random() < 0.25,
        accRamps: Math.random() < 0.3,
        accWideDoors: Math.random() < 0.3,
        accAccessibleElevator: Math.random() < 0.2,
        accTactile: Math.random() < 0.15,
        comfortAC: Math.random() < 0.5,
        comfortHeating: Math.random() < 0.15,
        comfortSolar: Math.random() < 0.1,
        comfortNoiseWindows: Math.random() < 0.25,
        comfortLED: Math.random() < 0.4,
        comfortWaterReuse: Math.random() < 0.12,
        finishFloor: ((): any => {
          const options = [null, 'PORCELANATO', 'MADEIRA', 'VINILICO', 'OUTRO'];
          // Tendência a ter algum acabamento (~60%)
          return options[Math.floor(Math.random() * (Math.random() < 0.6 ? options.length - 1 : 1))] || null;
        })(),
        finishCabinets: Math.random() < 0.55,
        finishCounterGranite: Math.random() < 0.35,
        finishCounterQuartz: Math.random() < 0.25,
        viewSea: city.name === 'Recife' ? Math.random() < 0.2 : false,
        viewCity: Math.random() < 0.4,
        positionFront: Math.random() < 0.5,
        positionBack: Math.random() < 0.5,
        petsSmall: Math.random() < 0.5,
        petsLarge: Math.random() < 0.25,
        sunOrientation: ((): any => {
          const opts = [null, 'NASCENTE', 'POENTE', 'OUTRA'];
          return opts[Math.floor(Math.random() * opts.length)] || null;
        })(),
      };

      const property = await prisma.property.create({
        data: {
          title: `${typeLabel} em ${neighborhood}`,
          description: `Excelente ${typeLabel.toLowerCase()} localizado no bairro ${neighborhood}, ${city.name}. ${
            type !== 'LAND' ? 'Imóvel com ótimo acabamento, ' : ''
          }em região privilegiada com fácil acesso a comércios e serviços.`,
          type,
          purpose: purpose as any,
          status: 'ACTIVE',
          price,
          bedrooms,
          bathrooms,
          areaM2,
          suites,
          parkingSpots,
          floor,
          furnished: Math.random() < 0.35,
          petFriendly: Math.random() < 0.4,
          condoFee,
          street: `Rua ${['das Flores', 'Principal', 'do Comércio', 'da Paz', 'Central'][getRandomInt(0, 4)]}, ${getRandomInt(100, 999)}`,
          neighborhood,
          city: city.name,
          state: city.state,
          postalCode: `${getRandomInt(10000, 99999)}-${getRandomInt(100, 999)}`,
          latitude: city.coords.lat + (Math.random() - 0.5) * 0.03,
          longitude: city.coords.lng + (Math.random() - 0.5) * 0.03,
          conditionTags: tags,
          yearBuilt: type === 'LAND' ? null : getRandomInt(1995, 2024),
          ownerId: user.id,
          ...extras,
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
