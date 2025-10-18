# ⚡ GUIA RÁPIDO DE INTEGRAÇÃO

## 🎯 OBJETIVO
Integrar o sistema de UI inteligente nas páginas de imóveis em **5 minutos**.

---

## 📋 CHECKLIST PRÉ-INTEGRAÇÃO

- [ ] Migração do Prisma executada (`npx prisma migrate dev`)
- [ ] Prisma Client gerado (`npx prisma generate`)
- [ ] Componentes criados (já feito ✅)
- [ ] API criada (já feito ✅)

---

## 🚀 PASSO A PASSO

### **1. Execute a Migração (1 min)**

```powershell
# Terminal na raiz do projeto
npx prisma migrate dev --name add_is_direct_field
npx prisma generate

# Limpa cache do Next.js
Remove-Item -Recurse -Force .next
```

✅ **Resultado:** Campo `isDirect` adicionado ao banco

---

### **2. Importe o Componente (30 seg)**

Na sua página de imóvel (`app/property/[id]/page.tsx`):

```tsx
import { PropertyContactSection } from "@/components/leads/PropertyContactSection";
```

---

### **3. Use o Componente (30 seg)**

Adicione onde você quer que o botão de contato/agendamento apareça:

```tsx
export default async function PropertyPage({ params }: { params: { id: string } }) {
  // ... seu código existente ...

  return (
    <div>
      {/* Suas seções existentes */}
      <PropertyHeader />
      <PropertyGallery />
      <PropertyDetails />
      
      {/* 🆕 ADICIONE AQUI */}
      <PropertyContactSection propertyId={params.id} />
      
      {/* Resto do conteúdo */}
      <PropertyMap />
    </div>
  );
}
```

---

### **4. Teste (3 min)**

#### **Teste A: Imóvel de Pessoa Física**
```bash
# 1. Inicie o servidor
npm run dev

# 2. Acesse um imóvel onde owner.role = "USER" ou "OWNER"
# 3. Verifique:
✅ Aparece formulário de agendamento
✅ Calendário funciona
✅ Grid de horários aparece
```

#### **Teste B: Imóvel de Corretor**
```bash
# 1. Acesse um imóvel onde owner.role = "REALTOR"
# 2. Verifique:
✅ Aparece card azul do corretor
✅ Botão WhatsApp funciona
✅ Botão E-mail funciona
```

---

## 🎨 CUSTOMIZAÇÃO (OPCIONAL)

### **Mudar Posição do Componente**

```tsx
// Exemplo: Colocar antes dos detalhes
<PropertyContactSection propertyId={params.id} />
<PropertyDetails />
```

### **Adicionar Classes Customizadas**

```tsx
<div className="my-8 max-w-2xl mx-auto">
  <PropertyContactSection propertyId={params.id} />
</div>
```

### **Condicional (se necessário)**

```tsx
{property.status === "AVAILABLE" && (
  <PropertyContactSection propertyId={params.id} />
)}
```

---

## 🔧 TROUBLESHOOTING

### **Erro: "Cannot find module PropertyContactSection"**

**Solução:**
```bash
# Verifique se o arquivo existe
ls src/components/leads/PropertyContactSection.tsx

# Se não existir, crie novamente (ver código nos docs)
```

---

### **Erro: Prisma types não atualizados**

**Solução:**
```bash
npx prisma generate
Remove-Item -Recurse -Force .next
npm run dev
```

---

### **Componente não aparece**

**Checklist:**
- [ ] Import correto?
- [ ] propertyId sendo passado?
- [ ] API `/api/properties/[id]/owner-info` respondendo?

**Debug:**
```tsx
// Adicione console.log temporário
<PropertyContactSection propertyId={params.id} />

// No componente PropertyContactSection.tsx:
console.log("PropertyId:", propertyId);
console.log("IsRealtorProperty:", isRealtorProperty);
```

---

### **WhatsApp não abre**

**Causa:** Telefone sem formato correto

**Solução:**
Garanta que telefone está no formato: `(87) 99999-9999` ou `87999999999`

```typescript
// O componente já limpa automaticamente:
const cleanPhone = realtor.phone.replace(/\D/g, "");
// "87999999999"
```

---

## 📱 EXEMPLO COMPLETO

```tsx
// app/property/[id]/page.tsx

import { PropertyContactSection } from "@/components/leads/PropertyContactSection";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PropertyPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  // Busca imóvel
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      images: true,
      owner: {
        select: {
          name: true,
          role: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{property.title}</h1>
        <p className="text-2xl text-primary font-semibold mt-2">
          R$ {property.price.toLocaleString("pt-BR")}
        </p>
      </div>

      {/* Galeria */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {property.images.map((img) => (
          <img
            key={img.id}
            src={img.url}
            alt={property.title}
            className="rounded-lg"
          />
        ))}
      </div>

      {/* Detalhes */}
      <div className="prose max-w-none mb-8">
        <h2>Descrição</h2>
        <p>{property.description}</p>
        
        <h3>Características</h3>
        <ul>
          <li>Quartos: {property.bedrooms}</li>
          <li>Banheiros: {property.bathrooms}</li>
          <li>Área: {property.areaM2}m²</li>
        </ul>
      </div>

      {/* 🆕 COMPONENTE INTELIGENTE */}
      <div className="max-w-2xl mx-auto my-12">
        <PropertyContactSection propertyId={property.id} />
      </div>

      {/* Mapa */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Localização</h2>
        {/* Seu componente de mapa */}
      </div>
    </div>
  );
}
```

---

## ✅ CHECKLIST FINAL

Antes de fazer commit:

- [ ] Migração executada com sucesso
- [ ] Componente integrado na página
- [ ] Testado com imóvel de pessoa física (mostra agendamento)
- [ ] Testado com imóvel de corretor (mostra contato)
- [ ] WhatsApp abre corretamente
- [ ] E-mail abre corretamente
- [ ] Calendário funciona (se pessoa física)
- [ ] Sem erros no console
- [ ] Build funciona (`npm run build`)

---

## 🎉 PRONTO!

Seu sistema agora tem **UI inteligente** que:
- ✅ Detecta automaticamente tipo de imóvel
- ✅ Mostra interface apropriada
- ✅ Zero erros para o cliente
- ✅ Máxima conversão

---

## 📊 PRÓXIMOS PASSOS

1. **Monitorar métricas:**
   - Taxa de cliques em WhatsApp
   - Taxa de conclusão de agendamento

2. **Coletar feedback dos usuários**

3. **Ajustar design** se necessário

4. **Documentar casos de uso** específicos

---

## 🆘 SUPORTE

Se encontrar problemas:

1. Verifique logs do console do navegador
2. Verifique logs do servidor Next.js
3. Teste a API manualmente: `GET /api/properties/[id]/owner-info`
4. Revise a documentação completa em:
   - `LEAD_SYSTEM_UI_APPROACH.md`
   - `IMPLEMENTACAO_UI_INTELIGENTE.md`

---

**Tempo total de integração:** ~5 minutos  
**Complexidade:** Baixa  
**Resultado:** Alta qualidade UX
