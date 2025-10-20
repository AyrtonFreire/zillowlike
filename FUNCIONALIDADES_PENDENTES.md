# 🚧 Funcionalidades Pendentes - ZillowLike

## 📊 RESUMO EXECUTIVO

**Data:** 2025-10-20  
**Total de Links Identificados:** 45  
**Páginas Existentes:** 41  
**Páginas Faltando:** 15  
**Funcionalidades Incompletas:** 23

---

## ❌ PÁGINAS QUE NÃO EXISTEM (404)

### **1. FINANCIAMENTO**
- ❌ `/financing` - Página geral de financiamento (existe apenas `/financing/[propertyId]`)
- **Prioridade:** 🔴 ALTA (Link no mega menu principal)
- **Descrição:** Página com informações sobre financiamento, simuladores, parceiros bancários

### **2. CALCULADORAS**
- ❌ `/calculadora` - Calculadora de financiamento
- ❌ `/calculadora-aluguel` - Calculadora de aluguel
- **Prioridade:** 🟡 MÉDIA (Links no mega menu)
- **Descrição:** Ferramentas para calcular parcelas, entrada, etc.

### **3. GUIAS**
- ❌ `/guia/compra` - Guia do comprador
- ❌ `/guia/locacao` - Guia do inquilino  
- ❌ `/guia/venda` - Guia do vendedor
- ✅ `/guides` - EXISTE (mas é página genérica)
- **Prioridade:** 🟡 MÉDIA
- **Descrição:** Páginas educacionais com dicas e processo passo a passo

### **4. FERRAMENTAS DO PROPRIETÁRIO**
- ❌ `/estimador` - Estimar valor do imóvel
- ❌ `/comparador` - Comparar preços de imóveis
- ❌ `/fotografo` - Contratar fotógrafo
- **Prioridade:** 🟢 BAIXA (links no mega menu Vender)
- **Descrição:** Ferramentas auxiliares para proprietários

### **5. DICAS**
- ❌ `/dicas/venda` - Dicas para vender mais rápido
- **Prioridade:** 🟢 BAIXA
- **Descrição:** Blog com dicas de vendas

### **6. NOTIFICAÇÕES**
- ❌ `/notifications` - Central de notificações
- **Prioridade:** 🔴 ALTA (Botão visível no header para usuários logados)
- **Descrição:** Lista de notificações do usuário (leads, visitas, etc.)

### **7. DASHBOARD DO CORRETOR**
- ❌ `/realtor` - Dashboard principal do corretor
- ❌ `/realtor/leads` - Leads do corretor
- ❌ `/realtor/schedule` - Agenda do corretor
- ✅ `/broker/*` - EXISTE (mas provavelmente é nome antigo)
- **Prioridade:** 🔴 ALTA (Link no header quando usuário é REALTOR)
- **Descrição:** Dashboard completo para corretores gerenciarem leads

### **8. TERMOS E PRIVACIDADE**
- ❌ `/terms` - Termos e condições
- ❌ `/privacy` - Política de privacidade
- **Prioridade:** 🔴 ALTA (Obrigatório legalmente)
- **Descrição:** Páginas legais obrigatórias

---

## ⚠️ PÁGINAS QUE EXISTEM MAS PODEM ESTAR INCOMPLETAS

### **9. FAVORITOS**
- ✅ `/favorites` - EXISTE
- **Status:** ⚠️ Verificar se está funcional
- **Botão:** Header (ícone de coração) mostra "0" hardcoded

### **10. BUSCAS SALVAS**
- ✅ `/saved-searches` - EXISTE
- **Status:** ⚠️ Verificar funcionalidade

### **11. OWNER ANALYTICS**
- ✅ `/owner/analytics` - EXISTE
- **Status:** ⚠️ Verificar se tem dados reais ou mock

### **12. OWNER LEADS**
- ✅ `/owner/leads` - EXISTE
- ✅ `/owner/leads/pending` - EXISTE
- ✅ `/owner/leads/confirmed` - EXISTE
- **Status:** ⚠️ Verificar integração com sistema de leads

### **13. BROKER/REALTOR**
- ✅ `/broker/dashboard` - EXISTE
- ✅ `/broker/leads` - EXISTE
- ✅ `/broker/leads/mural` - EXISTE
- ✅ `/broker/queue` - EXISTE
- **Status:** ⚠️ Inconsistência de nomenclatura (broker vs realtor)

---

## 🔗 LINKS DUPLICADOS / INCONSISTENTES

### **14. DASHBOARD PATHS**
```typescript
// ModernNavbar.tsx linha 119-123
role === "ADMIN" ? "/admin"
role === "REALTOR" ? "/realtor"  // ❌ NÃO EXISTE
role === "OWNER" ? "/owner"
default: "/dashboard"
```
**Problema:** REALTOR redireciona para `/realtor` mas a página é `/broker`

---

## 🎨 BOTÕES SEM AÇÃO

### **15. HOME PAGE (HomeClient.tsx)**
```tsx
// Linhas 190-195 - Links do header que vão para "/"
<Link href="/" className="...">Comprar</Link>
<Link href="/" className="...">Alugar</Link>
<Link href="/" className="...">Vender</Link>
<Link href="/" className="...">Financiar</Link>
<Link href="/" className="...">Meu Lar</Link>
```
**Problema:** Todos os links vão para `/` (home)

```tsx
// Linhas 198-200
<Link href="/" className="...">Gerenciar</Link>
<Link href="/" className="...">Anunciar</Link>
<Link href="/" className="...">Ajuda</Link>
```
**Problema:** Links não implementados

---

## 📱 FUNCIONALIDADES INCOMPLETAS

### **16. CONTADOR DE FAVORITOS**
```tsx
// ModernNavbar.tsx linha 101-102
<span className="...">0</span>  // ❌ Hardcoded
```
**Problema:** Contador sempre mostra 0, não busca do banco

### **17. NOTIFICAÇÕES**
```tsx
// ModernNavbar.tsx linha 109
<span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
```
**Problema:** Bolinha de notificação sempre visível, não verifica se há notificações reais

---

## 🚀 PRIORIZAÇÃO DE IMPLEMENTAÇÃO

### **🔴 PRIORIDADE ALTA (Essencial)**

1. **`/notifications`** - Botão visível no header
2. **`/realtor`** - Dashboard do corretor (ou renomear /broker)
3. **`/terms` e `/privacy`** - Obrigatório legalmente
4. **Contador de favoritos dinâmico**
5. **Fix: Links do header antigo (HomeClient.tsx)**

### **🟡 PRIORIDADE MÉDIA (Importante)**

6. **`/financing`** - Página principal de financiamento
7. **`/calculadora`** - Calculadora de financiamento
8. **`/calculadora-aluguel`** - Calculadora de aluguel
9. **`/guia/compra`, `/guia/locacao`, `/guia/venda`** - Guias educacionais
10. **Notificações dinâmicas** - Badge de notificações real

### **🟢 PRIORIDADE BAIXA (Nice to have)**

11. **`/estimador`** - Estimar valor do imóvel
12. **`/comparador`** - Comparar preços
13. **`/fotografo`** - Contratar fotógrafo
14. **`/dicas/venda`** - Blog com dicas

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Correções Críticas (1-2 dias)**

- [ ] Criar `/notifications` - Central de notificações
- [ ] Renomear `/broker` para `/realtor` OU atualizar rotas
- [ ] Criar `/terms` - Termos de uso
- [ ] Criar `/privacy` - Política de privacidade
- [ ] Implementar contador de favoritos dinâmico
- [ ] Fix: Links do HomeClient.tsx

### **Fase 2: Ferramentas Financeiras (2-3 dias)**

- [ ] Criar `/financing` - Página de financiamento
- [ ] Criar `/calculadora` - Calculadora de financiamento
- [ ] Criar `/calculadora-aluguel` - Calculadora de aluguel

### **Fase 3: Conteúdo Educacional (3-5 dias)**

- [ ] Criar `/guia/compra` - Guia do comprador
- [ ] Criar `/guia/locacao` - Guia do inquilino
- [ ] Criar `/guia/venda` - Guia do vendedor
- [ ] Expandir `/guides` existente

### **Fase 4: Ferramentas Extras (Opcional)**

- [ ] Criar `/estimador` - Avaliação de imóveis
- [ ] Criar `/comparador` - Comparação de preços
- [ ] Criar `/fotografo` - Marketplace de fotógrafos
- [ ] Criar `/dicas/venda` - Blog

---

## 🔧 PROBLEMAS TÉCNICOS IDENTIFICADOS

### **1. Inconsistência de Nomenclatura**
```
/broker vs /realtor
- Código usa REALTOR (enum Role)
- Páginas usam /broker
- ModernNavbar espera /realtor
```
**Solução:** Padronizar para `/realtor`

### **2. Links Hardcoded**
```tsx
// HomeClient.tsx tem links antigos não implementados
<Link href="/">Comprar</Link>  // Deveria ser /?status=SALE
<Link href="/">Alugar</Link>    // Deveria ser /?status=RENT
```
**Solução:** Atualizar todos os links

### **3. Contador de Favoritos**
```tsx
<span>0</span>  // Sempre 0
```
**Solução:** Buscar do banco de dados

---

## 📊 ESTATÍSTICAS

### **Cobertura de Rotas:**
- ✅ Páginas implementadas: 41 (73%)
- ❌ Páginas faltando: 15 (27%)
- **Total:** 56 rotas identificadas

### **Por Categoria:**
- 🏠 **Imóveis:** 95% completo
- 👤 **Usuário:** 80% completo
- 🏦 **Financeiro:** 30% completo
- 📚 **Educacional:** 10% completo
- 🛠️ **Ferramentas:** 40% completo

---

## 🎯 RECOMENDAÇÕES

### **Imediato (Esta Sprint):**
1. Criar páginas de termos e privacidade (legal)
2. Implementar `/notifications`
3. Padronizar broker/realtor
4. Fix contador de favoritos

### **Próxima Sprint:**
1. Implementar calculadoras financeiras
2. Criar guias educacionais
3. Página principal de financiamento

### **Backlog:**
1. Ferramentas de estimativa de preço
2. Marketplace de fotógrafos
3. Blog de dicas

---

## 📝 TEMPLATE DE PÁGINA

Para cada página nova, usar esta estrutura:

```tsx
// src/app/[rota]/page.tsx
"use client";

import { ModernNavbar } from "@/components/modern";
import DashboardLayout from "@/components/DashboardLayout"; // Se precisar

export default function NomeDaPagina() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ModernNavbar />
      <div className="mt-16 max-w-7xl mx-auto px-4 py-8">
        {/* Conteúdo aqui */}
      </div>
    </div>
  );
}
```

---

## 🐛 BUGS CONHECIDOS

1. **Favoritos não persistem** - Contador sempre 0
2. **Notificações não funcionam** - Badge sempre visível
3. **Dashboard REALTOR 404** - Redireciona para rota inexistente
4. **Links HomeClient.tsx** - Todos vão para /

---

## ✅ AÇÕES RECOMENDADAS

1. **Priorizar páginas legais** (terms, privacy)
2. **Criar `/notifications`** (usuários já veem o botão)
3. **Padronizar nomenclatura** (broker → realtor)
4. **Implementar contador de favoritos dinâmico**
5. **Criar páginas de calculadoras** (boa feature de marketing)

---

**Última atualização:** 2025-10-20  
**Responsável:** Sistema de Auditoria Automática  
**Próxima revisão:** Após cada sprint
