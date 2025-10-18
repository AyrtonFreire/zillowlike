import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database validation...");
  
  // Valida apenas que o banco está acessível e as tabelas foram criadas
  console.log("ℹ️  Mode: VALIDATION ONLY (no fake data)");

  // Verifica conectividade e estrutura
  console.log("📊 Checking database structure...");
  
  // Test queries to validate schema
  const userCount = await prisma.user.count();
  const propertyCount = await prisma.property.count();
  const leadCount = await prisma.lead.count();
  
  console.log(`✅ Database is ready!");
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Properties: ${propertyCount}`);
  console.log(`   - Leads: ${leadCount}`);
  console.log("");
  console.log("🎯 Next steps:");
  console.log("   1. Run 'npm run create-admin' to create your first admin user");
  console.log("   2. Start the dev server: 'npm run dev'");
  console.log("   3. Access http://localhost:3000 and sign in");
  console.log("");
  console.log("💡 This is a CLEAN database ready for real users!");
  
  return; // Exit early - no fake data
  
  // OLD CODE BELOW (kept for reference, never executes)
  const OLD_PICS = [
    // Modern Houses - Fachadas
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1280&q=80", // Casa moderna
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1280&q=80", // Casa luxo
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1280&q=80", // Casa contemporânea
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1280&q=80", // Casa branca
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1280&q=80", // Casa noite
    // Apartments & Interiors - Salas
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1280&q=80", // Sala clean
    "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=1280&q=80", // Sala aconchegante
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1280&q=80", // Sala elegante
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1280&q=80", // Living room
    // Living Rooms - Decoração
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1280&q=80", // Sala decorada
    "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1280&q=80", // Sala minimalista
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1280&q=80", // Sala design
    // Kitchens - Cozinhas
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1280&q=80", // Cozinha moderna
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1280&q=80", // Cozinha branca
    // Bedrooms - Quartos
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1280&q=80", // Quarto moderno
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1280&q=80", // Quarto clean
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1280&q=80", // Quarto decorado
    // Bathrooms - Banheiros
    "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1280&q=80", // Banheiro moderno
    "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1280&q=80", // Banheiro luxo
    // Exteriors & Gardens - Áreas externas
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1280&q=80", // Casa exterior
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1280&q=80", // Casa piscina
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1280&q=80", // Jardim
  ];
  
  const pic = (i: number) => PICS[i % PICS.length];
  
  // Helper to generate multiple images for a property
  const getImages = (startIndex: number, count: number = 6) => {
    return Array.from({ length: count }, (_, i) => ({ url: pic(startIndex + i) }));
  };

  let samples: any[] = [
    // Petrolina - Endereços Reais
    {
      title: "Studio em Maria Auxiliadora",
      description: "Studio moderno e compacto, ideal para estudantes ou profissionais. Localizado próximo a escolas e comércio.",
      price: 230000 * 100,
      type: PropertyType.APARTMENT,
      street: "Rua Guararapes, 456",
      neighborhood: "Maria Auxiliadora",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3891,
      longitude: -40.5008,
      bedrooms: 1,
      bathrooms: 1,
      areaM2: 35,
      suites: 0,
      parkingSpots: 1,
      furnished: false,
      petFriendly: false,
      yearBuilt: 2020,
      images: getImages(0, 6),
    },
    {
      title: "Condomínio em Portal da Cidade",
      description: "Apartamento em condomínio fechado com área de lazer completa, piscina e academia.",
      price: 180000 * 100,
      type: PropertyType.CONDO,
      street: "Rua das Orquídeas, 789",
      neighborhood: "Portal da Cidade",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3856,
      longitude: -40.5042,
      bedrooms: 2,
      bathrooms: 1,
      areaM2: 70,
      suites: 0,
      parkingSpots: 1,
      furnished: false,
      petFriendly: true,
      condoFee: 35000,
      yearBuilt: 2018,
      images: getImages(1, 7),
    },
    {
      title: "Apartamento em Gercino Coelho",
      description: "Apartamento espaçoso com 2 quartos, próximo ao centro da cidade e com fácil acesso a comércio.",
      price: 630000 * 100,
      type: PropertyType.APARTMENT,
      street: "Avenida Souza Filho, 234",
      neighborhood: "Gercino Coelho",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3920,
      longitude: -40.4985,
      bedrooms: 2,
      bathrooms: 1,
      areaM2: 50,
      suites: 0,
      parkingSpots: 1,
      furnished: false,
      petFriendly: false,
      yearBuilt: 2015,
      images: getImages(2, 6),
    },
    {
      title: "Casa em Vila Mocó",
      description: "Casa ampla com quintal, ideal para famílias. Localizada em bairro tranquilo e seguro.",
      price: 580000 * 100,
      type: PropertyType.HOUSE,
      street: "Rua Clementino Coelho, 567",
      neighborhood: "Vila Mocó",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3785,
      longitude: -40.5156,
      bedrooms: 3,
      bathrooms: 2,
      areaM2: 140,
      suites: 1,
      parkingSpots: 2,
      furnished: false,
      petFriendly: true,
      yearBuilt: 2012,
      images: getImages(3, 8),
    },
    {
      title: "Apartamento em Cohab Massangano",
      description: "Apartamento bem localizado com 2 quartos, próximo a escolas e supermercados.",
      price: 430000 * 100,
      type: PropertyType.APARTMENT,
      street: "Rua Manoel Clementino, 123",
      neighborhood: "Cohab Massangano",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3698,
      longitude: -40.4892,
      bedrooms: 2,
      bathrooms: 1,
      areaM2: 115,
      suites: 0,
      parkingSpots: 1,
      furnished: false,
      petFriendly: false,
      yearBuilt: 2016,
      images: getImages(4, 7),
    },
    {
      title: "Casa em Jardim Amazonas",
      description: "Casa espaçosa com 4 quartos, área de lazer e garagem para 2 carros.",
      price: 480000 * 100,
      type: PropertyType.HOUSE,
      street: "Rua das Acácias, 890",
      neighborhood: "Jardim Amazonas",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3812,
      longitude: -40.4756,
      bedrooms: 4,
      bathrooms: 3,
      areaM2: 180,
      suites: 2,
      parkingSpots: 2,
      furnished: false,
      petFriendly: true,
      yearBuilt: 2010,
      images: getImages(5, 6),
    },
    {
      title: "Apartamento em Atrás da Banca",
      description: "Apartamento compacto e funcional, ideal para solteiros ou casais jovens.",
      price: 380000 * 100,
      type: PropertyType.APARTMENT,
      street: "Rua Pacífico Rodrigues da Luz, 345",
      neighborhood: "Atrás da Banca",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3945,
      longitude: -40.4823,
      bedrooms: 1,
      bathrooms: 1,
      areaM2: 45,
      suites: 0,
      parkingSpots: 1,
      furnished: true,
      petFriendly: false,
      yearBuilt: 2019,
      images: getImages(6, 8),
    },
    {
      title: "Casa em José e Maria",
      description: "Casa confortável com 3 quartos, quintal e área gourmet. Perfeita para famílias.",
      price: 750000 * 100,
      type: PropertyType.HOUSE,
      street: "Rua Professora Adalgisa Cavalcanti, 678",
      neighborhood: "José e Maria",
      city: "Petrolina",
      state: "PE",
      latitude: -9.4156,
      longitude: -40.4934,
      bedrooms: 3,
      bathrooms: 2,
      areaM2: 150,
      suites: 1,
      parkingSpots: 2,
      furnished: false,
      petFriendly: true,
      yearBuilt: 2014,
      images: getImages(7, 7),
    },
    {
      title: "Studio moderno para investimento",
      description: "Studio mobiliado, ideal para aluguel. Localizado próximo à universidade e centro comercial. Mobília nova, ar condicionado e internet incluída.",
      price: 220000 * 100,
      type: PropertyType.STUDIO,
      street: "Rua dos Estudantes, 321",
      neighborhood: "Universitário",
      city: "Petrolina",
      state: "PE",
      latitude: -9.3850,
      longitude: -40.4950,
      bedrooms: 1,
      bathrooms: 1,
      areaM2: 35,
      suites: 0,
      parkingSpots: 0,
      floor: 3,
      furnished: true,
      petFriendly: true,
      condoFee: 55000,
      yearBuilt: 2021,
      images: getImages(8, 6),
    },

    // Juazeiro - Endereços Reais
    {
      title: "Casa em Centro",
      description: "Casa no centro de Juazeiro, próxima a comércios e serviços. Ideal para famílias.",
      price: 210000 * 100,
      type: PropertyType.HOUSE,
      street: "Avenida Adolfo Viana, 234",
      neighborhood: "Centro",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4118,
      longitude: -40.5045,
      bedrooms: 3,
      bathrooms: 2,
      areaM2: 120,
      suites: 1,
      parkingSpots: 1,
      furnished: false,
      petFriendly: true,
      yearBuilt: 2008,
      images: getImages(0, 6),
    },
    {
      title: "Apartamento em Santo Antônio",
      description: "Apartamento moderno com 2 quartos, próximo a escolas e supermercados.",
      price: 190000 * 100,
      type: PropertyType.APARTMENT,
      street: "Rua Barão do Rio Branco, 567",
      neighborhood: "Santo Antônio",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4234,
      longitude: -40.5123,
      bedrooms: 2,
      bathrooms: 1,
      areaM2: 65,
      suites: 0,
      parkingSpots: 1,
      furnished: false,
      petFriendly: false,
      yearBuilt: 2017,
      images: getImages(1, 7),
    },
    {
      title: "Casa em Piranga",
      description: "Casa espaçosa com quintal amplo, ideal para quem busca tranquilidade.",
      price: 280000 * 100,
      type: PropertyType.HOUSE,
      street: "Rua José de Alencar, 890",
      neighborhood: "Piranga",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4289,
      longitude: -40.5234,
      bedrooms: 3,
      bathrooms: 2,
      areaM2: 140,
      suites: 1,
      parkingSpots: 2,
      furnished: false,
      petFriendly: true,
      yearBuilt: 2011,
      images: getImages(2, 6),
    },
    {
      title: "Apartamento em Dom José Rodrigues",
      description: "Apartamento bem localizado com 2 quartos e varanda.",
      price: 240000 * 100,
      type: PropertyType.APARTMENT,
      street: "Rua Coronel João Evangelista, 123",
      neighborhood: "Dom José Rodrigues",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4367,
      longitude: -40.5178,
      bedrooms: 2,
      bathrooms: 1,
      areaM2: 70,
      suites: 0,
      parkingSpots: 1,
      furnished: false,
      petFriendly: false,
      yearBuilt: 2015,
      images: getImages(3, 8),
    },
    {
      title: "Casa em Alto da Maravilha",
      description: "Casa com vista panorâmica, 4 quartos e área de lazer completa.",
      price: 520000 * 100,
      type: PropertyType.HOUSE,
      street: "Rua Manoel Novais, 456",
      neighborhood: "Alto da Maravilha",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4445,
      longitude: -40.5089,
      bedrooms: 4,
      bathrooms: 3,
      areaM2: 200,
      suites: 2,
      parkingSpots: 3,
      furnished: false,
      petFriendly: true,
      yearBuilt: 2013,
      images: getImages(4, 7),
    },
    {
      title: "Casa de praia com vista para o rio",
      description: "Casa de praia com 3 quartos, 2 banheiros, varanda com vista para o Rio São Francisco. Ideal para fins de semana e férias. Quintal grande com árvores frutíferas.",
      price: 380000 * 100,
      type: PropertyType.HOUSE,
      street: "Rua da Beira, 852",
      neighborhood: "Orla",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4050,
      longitude: -40.5000,
      bedrooms: 3,
      bathrooms: 2,
      areaM2: 110,
      suites: 1,
      parkingSpots: 2,
      furnished: true,
      petFriendly: true,
      yearBuilt: 2010,
      images: getImages(9, 8),
    },
    {
      title: "Terreno comercial em avenida principal",
      description: "Terreno comercial de 300m² em avenida principal, próximo ao centro da cidade. Ideal para construção de prédio comercial ou residencial.",
      price: 250000 * 100,
      type: PropertyType.LAND,
      street: "Av. Principal, 963",
      neighborhood: "Centro",
      city: "Juazeiro",
      state: "BA",
      latitude: -9.4120,
      longitude: -40.5080,
      areaM2: 300,
      images: getImages(10, 5),
    },
  ];

  // Programmatically add more sample properties across neighborhoods
  const petrolinaNeighborhoods = [
    "Centro","Orla","Jardim Amazonas","Atrás da Banca","José e Maria","Cohab Massangano",
    "Areia Branca","Antônio Cassimiro","Vila Mocó","Gercino Coelho","Portal da Cidade","Maria Auxiliadora"
  ];
  const juazeiroNeighborhoods = [
    "Centro","Santo Antônio","Piranga","Dom José Rodrigues","Alto da Maravilha","São Geraldo",
    "Cajueiro","Itaberaba","Quidé","Novo Encontro","Alagadiço","Argemiro"
  ];

  // helper removed (unused)

  function addGenerated(city: string, state: string, neighborhoods: string[], baseLat: number, baseLng: number) {
    neighborhoods.forEach((n, i) => {
      const price = 180000 + (i % 10) * 50000;
      const bedrooms = 1 + (i % 4);
      const bathrooms = 1 + (i % 3);
      const areaM2 = 40 + (i % 8) * 15;
      const lat = baseLat + (i % 5) * 0.002 - 0.004;
      const lng = baseLng + (i % 5) * 0.002 - 0.004;
      const type = [PropertyType.HOUSE, PropertyType.APARTMENT, PropertyType.CONDO, PropertyType.STUDIO][i % 4];
      samples.push({
        title: `${type === PropertyType.HOUSE ? 'Casa' : type === PropertyType.APARTMENT ? 'Apartamento' : type === PropertyType.CONDO ? 'Condomínio' : 'Studio'} em ${n}`,
        description: `Imóvel em ${n}, ${city}. Ideal para testes de filtro.`,
        price: price * 100,
        type,
        street: `Rua Teste ${i+1}`,
        neighborhood: n,
        city,
        state,
        latitude: lat,
        longitude: lng,
        bedrooms,
        bathrooms,
        areaM2,
        suites: i % 2,
        parkingSpots: i % 3,
        furnished: i % 2 === 0,
        petFriendly: i % 2 === 1,
        images: getImages(i * 3, 5 + (i % 4)),
      });
    });
  }

  addGenerated("Petrolina", "PE", petrolinaNeighborhoods, -9.395, -40.505);
  addGenerated("Juazeiro", "BA", juazeiroNeighborhoods, -9.41, -40.506);

  // Create demo users (usando upsert para idempotência)
  console.log("👤 Creating users...");
  const demoOwner = await prisma.user.upsert({
    where: { email: "maria@example.com" },
    update: {},
    create: {
      name: "Maria Silva",
      email: "maria@example.com",
      role: "OWNER" as any,
    },
  });

  const demoRealtor = await prisma.user.upsert({
    where: { email: "joao@example.com" },
    update: {},
    create: {
      name: "João Santos",
      email: "joao@example.com",
      role: "REALTOR" as any,
    },
  });

  console.log("🏠 Creating properties...");
  const createdProperties = [];
  for (const s of samples) {
    const property = await prisma.property.create({
      data: {
        title: s.title,
        description: s.description,
        price: s.price,
        type: s.type,
        status: "ACTIVE" as any,
        ownerId: Math.random() > 0.5 ? demoOwner.id : demoRealtor.id,
        street: s.street,
        neighborhood: s.neighborhood,
        city: s.city,
        state: s.state,
        latitude: s.latitude,
        longitude: s.longitude,
        bedrooms: s.bedrooms,
        bathrooms: s.bathrooms,
        areaM2: s.areaM2,
        suites: s.suites,
        parkingSpots: s.parkingSpots,
        furnished: s.furnished,
        petFriendly: s.petFriendly,
        yearBuilt: s.yearBuilt,
        condoFee: s.condoFee,
        floor: s.floor,
        images: { create: (s.images as Array<{ url: string }>).map((i: { url: string }, idx: number) => ({ url: i.url, sortOrder: idx })) },
      },
    });
    createdProperties.push(property);
  }

  // Create contacts
  console.log("📞 Creating contacts...");
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: "Carlos Oliveira",
        email: "carlos@example.com",
        phone: "(87) 99999-1111",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Ana Paula",
        email: "ana@example.com",
        phone: "(87) 99999-2222",
      },
    }),
    prisma.contact.create({
      data: {
        name: "Pedro Costa",
        email: "pedro@example.com",
        phone: "(87) 99999-3333",
      },
    }),
  ]);

  // Create leads for realtor
  console.log("📧 Creating leads...");
  const ownerProperties = createdProperties.filter(p => p.ownerId === demoOwner.id).slice(0, 3);
  const realtorProperties = createdProperties.filter(p => p.ownerId === demoRealtor.id).slice(0, 3);

  for (let i = 0; i < 5; i++) {
    const property = realtorProperties[i % realtorProperties.length];
    const contact = contacts[i % contacts.length];
    const daysAgo = i * 2;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const status = i === 0 ? "PENDING" : i === 1 ? "ACCEPTED" : i === 2 ? "REJECTED" : "ACCEPTED";
    const respondedAt = status !== "PENDING" ? new Date(createdAt.getTime() + 30 * 60000) : null;

    await prisma.lead.create({
      data: {
        propertyId: property.id,
        realtorId: demoRealtor.id,
        contactId: contact.id,
        status: status as any,
        message: `Tenho interesse no imóvel ${property.title}`,
        createdAt,
        respondedAt,
      },
    });
  }

  // Create leads for owner properties
  for (let i = 0; i < 3; i++) {
    const property = ownerProperties[i % ownerProperties.length];
    const contact = contacts[i % contacts.length];
    const daysAgo = i * 3;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await prisma.lead.create({
      data: {
        propertyId: property.id,
        realtorId: demoRealtor.id,
        contactId: contact.id,
        status: "ACCEPTED" as any,
        message: `Gostaria de visitar o imóvel`,
        createdAt,
        respondedAt: new Date(createdAt.getTime() + 45 * 60000),
      },
    });
  }

  // Create property views
  console.log("👁️  Creating property views...");
  for (const property of createdProperties.slice(0, 10)) {
    const viewCount = Math.floor(Math.random() * 50) + 10;
    for (let i = 0; i < viewCount; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const viewedAt = new Date();
      viewedAt.setDate(viewedAt.getDate() - daysAgo);

      await prisma.propertyView.create({
        data: {
          propertyId: property.id,
          viewedAt,
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        },
      });
    }
  }

  // Add realtor to queue
  console.log("🎯 Adding realtor to queue...");
  await prisma.realtorQueue.create({
    data: {
      realtorId: demoRealtor.id,
      position: 1,
      score: 50,
      status: "ACTIVE" as any,
    },
  });

  // Create stats for realtor
  await prisma.realtorStats.create({
    data: {
      realtorId: demoRealtor.id,
    },
  });

  // Mark some leads as AVAILABLE for mural
  console.log("📋 Marking leads as available...");
  const availableLeads = await prisma.lead.findMany({
    take: 3,
  });

  for (const lead of availableLeads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "AVAILABLE" as any,
        realtorId: null,
      },
    });
  }

  // This code is unreachable - validation only mode
}

main().finally(async () => {
  await prisma.$disconnect();
});


