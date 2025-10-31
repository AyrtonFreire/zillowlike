# Análise de Viabilidade: POIs (Pontos de Interesse) em Produção

## Status Atual
✅ **Implementado e Otimizado** (Outubro 2025)

## Resumo Executivo
A feature de POIs (escolas, mercados, farmácias, restaurantes) está **VIÁVEL em produção** com as otimizações implementadas. O sistema usa OpenStreetMap (OSM) via Overpass API de forma **gratuita**, com controles de performance e degradação graceful.

---

## 🎯 Otimizações Implementadas

### 1. **Limites por Categoria**
- **3 itens máximos** por categoria (Escolas, Mercados, Farmácias, Restaurantes)
- **12 POIs total** por imóvel (4 categorias × 3)
- Reduz payload, renderização e carga no Overpass

### 2. **Qualidade de Dados**
```typescript
// Filtros aplicados:
- Remover nomes vazios ou "Local"
- Dedupe por nome (sem repetições)
- Truncar nomes longos (> 35 chars → "Nome Longo Trunca...")
- Normalização: Capitalização e limpeza
```

### 3. **Performance de Rede**
```typescript
// Controles de timeout e fallback:
- AbortSignal.timeout(8000)  // 8s max
- Radius reduzido: 1000m (antes 1200m)
- Query timeout: 5s no Overpass
- out center 20 (antes 30 - menos dados)
```

### 4. **Tratamento de Erro Silencioso**
- Se Overpass falhar → **exibe lista vazia** + aviso discreto
- Não bloqueia exibição do imóvel
- Console.warn para debug (não alert/modal)

### 5. **UI/UX Premium**
- **Mapa**: Markers minimalistas (emoji + tooltip no hover)
- **Lista**: Cards organizados em grid 2 colunas com borda stone
- **Estado vazio**: Mensagem educativa explicando OSM
- **Sem poluição**: Apenas 3 itens por categoria

---

## 📊 Viabilidade em Produção

### ✅ **Cenário Recomendado: Uso Direto do Overpass (ATUAL)**

#### Prós
- **Custo Zero**: Overpass API é totalmente gratuito
- **Dados Atualizados**: OSM tem dados globais e comunidade ativa
- **Implementação Simples**: Sem backend adicional, direto do browser

#### Contras
- **Rate Limits**: ~10-30 req/min (varia por instância)
- **Latência**: 2-8s por request (depende de carga)
- **Instabilidade**: Pode ficar indisponível em picos

#### Mitigações Aplicadas
- Timeout de 8s → fallback gracioso
- Máximo 3 POIs/categoria → requests mais leves
- Erro silencioso → não quebra UX
- Query otimizada (5s timeout, radius 1km)

#### Estimativa de Tráfego
- **100 visualizações/dia**: ✅ Viável (< 1 req/min médio)
- **1.000 visualizações/dia**: ✅ Viável (~1 req/min, dentro do limite)
- **10.000 visualizações/dia**: ⚠️ Considerar cache (6-7 req/min)
- **100.000+ visualizações/dia**: ❌ Exige cache em servidor

---

## 🔄 Alternativas Futuras (se necessário)

### Opção A: Cache no Servidor (Next.js API Route + Redis)
```typescript
// /api/pois?lat={lat}&lng={lng}
// Exemplo: Upstash Redis (free tier: 10k requests/day)

- Cache TTL: 24-72h
- Chave: `pois:${lat}:${lng}:1000`
- Fallback: stale-while-revalidate
- Custo: $0 (free tier) → ~$10/mês (escala)
```

**Prós**: Reduz 95% das chamadas ao Overpass, mais rápido
**Contras**: Adiciona complexidade, precisa Redis

### Opção B: Pré-cálculo no Banco
```sql
-- Tabela: property_pois
-- Gerar POIs ao criar/editar imóvel (via cron ou trigger)
```

**Prós**: Zero latência, sempre disponível
**Contras**: Dados podem desatualizar, aumenta banco

### Opção C: Self-Host Overpass
```bash
# Docker + Planet OSM regional (Brasil = ~1.5GB)
docker run -p 12345:80 wiktorn/overpass-api
```

**Prós**: Controle total, sem rate limits
**Contras**: Manutenção, custo de servidor (~$20-50/mês)

### Opção D: Provedor Pago
- **Google Places API**: ~$17/1000 requests (Nearby Search)
- **Mapbox Search**: ~$5/1000 requests
- **Foursquare FSQ**: ~$0.49/1000 requests

**Prós**: Confiável, SLA, mais dados
**Contras**: Custo recorrente (escala rápido)

---

## 📈 Recomendação por Fase

### **Fase 1: MVP/Lançamento (0-1k usuários/dia)**
✅ **Usar Overpass direto** (implementação atual)
- Custo: $0
- Risco: Baixo (fallback gracioso)
- Ação: Monitorar logs de erro

### **Fase 2: Crescimento (1k-10k usuários/dia)**
⚠️ **Adicionar cache opcional** (Upstash Redis free tier)
- Custo: $0-10/mês
- Risco: Médio (picos podem exceder limite)
- Ação: Implementar cache se > 50% de erros

### **Fase 3: Escala (10k+ usuários/dia)**
🚀 **Cache obrigatório ou self-host**
- Custo: $10-50/mês
- Risco: Baixo (infra dedicada)
- Ação: Migrar para Redis + Overpass Docker

---

## 🛡️ Degradação Graceful (Já Implementada)

```typescript
// Fluxo de fallback:
1. Tentar carregar POIs do Overpass (8s timeout)
2. Se falhar → Exibir card vazio + aviso discreto
3. Continuar exibindo mapa (sem POIs)
4. Link "Ver no Google Maps" sempre funciona
```

**Resultado**: Feature nunca quebra a página, mesmo se OSM cair 100%.

---

## 🎨 Melhorias de UX Aplicadas

### Antes (Problema)
- 50+ POIs sobrepostos no mapa
- Labels sempre visíveis (poluição)
- Nomes "Local" e duplicados
- Lista em bullet points simples
- Sem tratamento de erro

### Depois (Solução)
- Máximo 12 POIs (3 por categoria)
- Markers minimalistas (emoji + tooltip)
- Dedupe + nomes normalizados
- Cards em grid com borda e espaçamento
- Estado vazio elegante

---

## 📋 Checklist de Produção

- ✅ Timeout implementado (8s)
- ✅ Limite de 3 POIs por categoria
- ✅ Dedupe e normalização de nomes
- ✅ Tratamento de erro silencioso
- ✅ UI com estados de loading/erro
- ✅ Markers otimizados (sem texto inline)
- ✅ Radius reduzido (1km)
- ✅ Query timeout no Overpass (5s)
- ⏳ Monitoramento de logs (pós-deploy)
- ⏳ Cache opcional (se necessário Fase 2+)

---

## 💡 Conclusão

**A feature está PRONTA para produção** com a implementação atual. 

- **Curto prazo**: Zero custo, degrada graciosamente
- **Médio prazo**: Adicionar cache se crescer (low cost)
- **Longo prazo**: Self-host ou provedor pago (se > 100k views/dia)

A abordagem pragmática permite **lançar agora** e **escalar depois** conforme demanda real, evitando over-engineering prematuro.

---

**Última atualização**: Outubro 2025  
**Implementado por**: Cascade AI  
**Arquivos modificados**:
- `src/components/Map.tsx`
- `src/components/PropertyDetailsModalJames.tsx`
