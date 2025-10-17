# ✅ Checklist de Ações - Corrigir Placeholders e Features

## 🎯 Como Usar Este Checklist
Marque com `[x]` as ações que você quer que eu implemente.

---

## 🔴 CRÍTICO - Corrigir Agora

### Dashboard - Ações nos Cards de Imóveis
- [ ] **Implementar edição de imóvel** - Criar handler que redireciona para `/owner/edit/[id]`
- [ ] **Implementar exclusão de imóvel** - Criar API DELETE e modal de confirmação
- [ ] **Implementar toggle de status** - Criar API PATCH para ativar/pausar imóvel
- [ ] **Alternativa**: Remover botões e adicionar apenas link "Ver detalhes"

### Dashboard do Corretor - Gerenciamento de Leads
- [ ] **Criar API de atualização de leads** - PATCH `/api/leads/[id]` (aceitar/rejeitar)
- [ ] **Implementar handlers de aceitar/rejeitar** - Conectar botões à API
- [ ] **Adicionar feedback visual** - Toast de sucesso/erro
- [ ] **Alternativa**: Remover botões e adicionar "Ver todos os leads"

### Páginas do Broker Faltando
- [ ] **Criar `/broker/properties`** - Lista de imóveis do corretor
- [ ] **Criar `/broker/properties/new`** - Formulário de novo imóvel
- [ ] **Criar `/broker/leads`** - Página de gerenciamento de leads
- [ ] **Criar `/broker/credits`** - Página de créditos/planos
- [ ] **Alternativa**: Remover links dos dashboards temporariamente

### Menu Mobile
- [ ] **Implementar menu mobile funcional** - Drawer/sidebar responsivo
- [ ] **Alternativa**: Ocultar botão em mobile e mostrar apenas logo

---

## 🟡 IMPORTANTE - Corrigir em Breve

### Links do Menu Principal (TopNavMega)
- [ ] **Criar `/guia/venda`** - Página com guia do vendedor
- [ ] **Criar `/estimar`** - Calculadora de preço de imóvel
- [ ] **Criar `/mercado`** - Dashboard de mercado imobiliário
- [ ] **Alternativa**: Remover esses links do menu

### Footer - Links Institucionais
- [ ] **Criar `/sobre`** - Página sobre a empresa
- [ ] **Criar `/carreiras`** - Página de vagas
- [ ] **Criar `/contato`** - Formulário de contato
- [ ] **Criar `/faq`** - Perguntas frequentes
- [ ] **Criar `/termos`** - Termos de uso
- [ ] **Criar `/privacidade`** - Política de privacidade
- [ ] **Alternativa**: Remover links ou apontar para email/WhatsApp

### Página de Edição de Imóvel
- [ ] **Testar `/owner/edit/[id]`** - Verificar se funciona
- [ ] **Corrigir bugs se houver**
- [ ] **Adicionar validação de propriedade** - Só owner pode editar seu imóvel

### Sistema de Buscas Salvas
- [ ] **Testar funcionalidade completa** - Salvar, listar, deletar
- [ ] **Corrigir bugs se houver**
- [ ] **Alternativa**: Remover link do menu se não funcionar

---

## 🟢 MELHORIAS - Backlog

### Calculadora de Financiamento
- [ ] **Revisar cálculos** - Validar fórmulas
- [ ] **Melhorar UI** - Tornar mais intuitiva
- [ ] **Adicionar mais opções** - Diferentes tipos de financiamento

### Página de Guias
- [ ] **Adicionar conteúdo** - Artigos sobre compra/venda
- [ ] **Alternativa**: Remover link do menu

### Limpeza de Código
- [ ] **Remover console.logs** - Limpar código
- [ ] **Resolver TODOs** - Implementar ou remover
- [ ] **Remover arquivos backup** - Ex: HeroSearch_backup.tsx

### Botão "Ver mais" em Destaques
- [ ] **Apontar para página de busca** - Com filtro de destaque
- [ ] **Alternativa**: Remover botão

---

## 🚀 ABORDAGENS SUGERIDAS

### Opção A: MVP Limpo (Recomendado) ⭐
**Tempo**: 2-3 dias  
**Objetivo**: Remover tudo que não funciona, manter apenas o essencial

**Ações**:
- [x] Remover botões de editar/deletar dos dashboards
- [x] Substituir por link "Ver detalhes" que vai para `/property/[id]`
- [x] Remover links do menu que não existem (guia/venda, estimar, mercado)
- [x] Remover links do footer ou apontar para email
- [x] Implementar apenas handlers de aceitar/rejeitar leads (crítico)
- [x] Criar apenas página `/broker/leads` (crítico)
- [x] Ocultar botão de menu mobile

**Resultado**: Site 100% funcional, sem placeholders, pronto para usuários

---

### Opção B: Implementação Completa
**Tempo**: 2-3 semanas  
**Objetivo**: Implementar todas as funcionalidades

**Ações**:
- [x] Todas as ações marcadas acima
- [x] Criar todas as páginas faltantes
- [x] Implementar todos os handlers
- [x] Adicionar conteúdo a todas as páginas

**Resultado**: Plataforma completa, mas demora mais

---

### Opção C: Híbrido (Equilibrado)
**Tempo**: 1 semana  
**Objetivo**: Implementar crítico + remover resto

**Ações Críticas** (Implementar):
- [x] Handlers de aceitar/rejeitar leads
- [x] Página `/broker/leads`
- [x] API de atualização de leads
- [x] Handlers de editar/deletar imóveis
- [x] Menu mobile funcional

**Ações Secundárias** (Remover):
- [x] Links do menu que não existem
- [x] Links do footer
- [x] Botão "Ver mais" em destaques

**Resultado**: Funcionalidades core funcionam, sem placeholders

---

## 📋 DECISÃO

**Qual abordagem você prefere?**

- [ ] **Opção A - MVP Limpo** (Rápido, sem placeholders)
- [ ] **Opção B - Implementação Completa** (Tudo funcional, demora mais)
- [ ] **Opção C - Híbrido** (Crítico funciona, resto removido)
- [ ] **Customizado** (Marque individualmente acima o que quer)

---

## 🎬 Próximos Passos

Após marcar sua escolha:
1. Salve este arquivo
2. Me avise qual opção escolheu
3. Eu implemento as mudanças
4. Testamos juntos
5. Deploy! 🚀

---

**Última atualização**: 16/10/2025
