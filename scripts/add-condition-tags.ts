import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addConditionTags() {
  console.log('🏷️  Adicionando tags de condição aos imóveis...\n');

  try {
    // Buscar todos os imóveis
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        furnished: true,
        yearBuilt: true,
      },
    });

    console.log(`📊 Encontrados ${properties.length} imóveis\n`);

    let updated = 0;

    for (const property of properties) {
      const tags: string[] = [];

      // Lógica para adicionar tags baseado nas características existentes
      
      // Se é mobiliado
      if (property.furnished === true) {
        tags.push('Mobiliado');
      } else if (property.furnished === false) {
        // Alguns podem ser semi-mobiliados (aleatório para demonstração)
        if (Math.random() > 0.7) {
          tags.push('Semi-mobiliado');
        }
      }

      // Se foi construído recentemente (últimos 2 anos)
      const currentYear = new Date().getFullYear();
      if (property.yearBuilt && property.yearBuilt >= currentYear - 2) {
        tags.push('Novo');
      }

      // Adicionar "Em construção" aleatoriamente a alguns imóveis (5%)
      if (Math.random() > 0.95) {
        tags.push('Em construção');
      }

      // Adicionar "Condomínio fechado" a apartamentos e condomínios (70% de chance)
      if ((property.type === 'APARTMENT' || property.type === 'CONDO') && Math.random() > 0.3) {
        tags.push('Condomínio fechado');
      }

      // Atualizar apenas se houver tags
      if (tags.length > 0) {
        await prisma.property.update({
          where: { id: property.id },
          data: { conditionTags: tags },
        });

        console.log(`✅ ${property.title}`);
        console.log(`   Tags: ${tags.join(', ')}\n`);
        updated++;
      }
    }

    console.log(`\n🎉 Processo concluído!`);
    console.log(`📊 ${updated} imóveis atualizados com tags`);
    console.log(`📊 ${properties.length - updated} imóveis sem tags adicionadas`);

  } catch (error) {
    console.error('❌ Erro ao adicionar tags:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addConditionTags();
