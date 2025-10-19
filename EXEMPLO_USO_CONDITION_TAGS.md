# 📋 Como Usar o ConditionTagsSelector

## Componente Criado

✅ **`src/components/ConditionTagsSelector.tsx`**

## Exemplo de Uso em Formulário

```tsx
"use client";

import { useState } from "react";
import ConditionTagsSelector from "@/components/ConditionTagsSelector";

export default function PropertyForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: 0,
    conditionTags: [] as string[],
    // ... outros campos
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Os dados já estão prontos para enviar
    const response = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        conditionTags: formData.conditionTags, // ✅ Array de strings
      }),
    });
    
    // ...
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Outros campos do formulário */}
      
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Título do imóvel"
      />

      {/* ... */}

      {/* Campo de Tags de Condição */}
      <ConditionTagsSelector
        value={formData.conditionTags}
        onChange={(tags) => setFormData({ ...formData, conditionTags: tags })}
        maxTags={5}
      />

      <button type="submit">Cadastrar Imóvel</button>
    </form>
  );
}
```

## Integração com API

### Backend (route.ts)

```typescript
import { PropertyCreateSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = await req.json();
  
  // Validação com Zod (já atualizado)
  const validated = PropertyCreateSchema.parse(body);
  
  // Criar imóvel
  const property = await prisma.property.create({
    data: {
      title: validated.title,
      description: validated.description,
      // ...
      conditionTags: validated.conditionTags || [], // ✅ Array de strings
    },
  });
  
  return Response.json(property);
}
```

## Funcionalidades do Componente

### ✅ Seleção Múltipla
- Click para selecionar/desselecionar
- Máximo de 5 tags (configurável)
- Visual claro do que está selecionado

### ✅ Feedback Visual
- **Selecionado:** Gradiente roxo/azul com ✓
- **Não selecionado:** Branco com borda
- **Desabilitado:** Cinza (quando atingir o máximo)

### ✅ Preview das Tags
- Mostra as tags selecionadas em um card
- Contador (X/5)
- Botão ✕ para remover rapidamente

### ✅ Validação
- Máximo de tags configurável
- Apenas valores permitidos (enum)
- Integrado com Zod schema

## Tags Disponíveis

1. **Mobiliado** - Imóvel totalmente mobiliado
2. **Semi-mobiliado** - Parcialmente mobiliado
3. **Novo** - Imóvel novo ou recém-construído
4. **Em construção** - Ainda em fase de construção
5. **Condomínio fechado** - Localizado em condomínio fechado

## Onde Adicionar

Você pode adicionar o `ConditionTagsSelector` em:

1. **Formulário de Criação de Imóvel**
   - Página de cadastro de novo imóvel
   - Modal de criação rápida

2. **Formulário de Edição de Imóvel**
   - Página de edição de imóvel existente
   - Painel de administração

3. **Filtros de Busca** (Opcional)
   - Permitir filtrar imóveis por tags
   - Adicionar ao SearchFiltersBar

## Próximos Passos

1. ✅ Schema Prisma atualizado
2. ✅ Migration executada
3. ✅ Componente criado
4. ✅ Schema Zod atualizado
5. ✅ Script de teste criado
6. ⏳ Integrar no formulário de cadastro
7. ⏳ Atualizar API de criação/edição
8. ⏳ Testar criação de imóvel com tags
