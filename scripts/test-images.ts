// Script para testar URLs de imagens e identificar 404s

const PICS = [
  // Modern Houses - Fachadas
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1280&q=80", // Casa moderna
  "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1280&q=80", // Casa luxo
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1280&q=80", // Casa contemporânea
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1280&q=80", // Casa branca
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1280&q=80", // Casa noite
  // Apartments & Interiors - Salas
  "https://images.unsplash.com/photo-1502005229762-cf1b2da7c52f?w=1280&q=80", // Sala moderna
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
  "https://images.unsplash.com/photo-1556912167-f556f1f39faa?w=1280&q=80", // Cozinha gourmet
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

async function testImage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Testando URLs de imagens...\n');
  
  const validUrls: string[] = [];
  const invalidUrls: string[] = [];
  
  for (const url of PICS) {
    const isValid = await testImage(url);
    if (isValid) {
      validUrls.push(url);
      console.log('✅', url);
    } else {
      invalidUrls.push(url);
      console.log('❌', url);
    }
  }
  
  console.log('\n📊 Resultado:');
  console.log(`✅ URLs válidas: ${validUrls.length}`);
  console.log(`❌ URLs inválidas: ${invalidUrls.length}`);
  
  console.log('\n📝 URLs válidas para usar no seed.ts:');
  console.log('const PICS = [');
  validUrls.forEach(url => {
    console.log(`  "${url}",`);
  });
  console.log('];');
}

main();
