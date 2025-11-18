# Análise de Refatoração do Projeto ZillowLike

## Status: Em Análise
Data: 18/11/2025

## Objetivo
Identificar e remover código não utilizado para melhorar manutenibilidade e performance do projeto.

## Componentes Identificados (análise inicial)

### 🔴 CANDIDATOS FORTES PARA REMOÇÃO (Duplicados/Backup)

1. **HeroSearch_backup.tsx** (27KB)
   - Arquivo de backup explícito
   - **AÇÃO**: REMOVER (após confirmar HeroSearchModern está funcionando)

2. **PropertyDetailsModal.tsx** vs **PropertyDetailsModalJames.tsx**
   - Dois modais similares (49KB vs 41KB)
   - Atualmente usando: PropertyDetailsModalJames
   - **AÇÃO**: REMOVER PropertyDetailsModal.tsx (não usado)

3. **Header.tsx** vs **ModernNavbar**
   - Header.tsx (2.3KB) parece antigo
   - ModernNavbar é o atual
   - **AÇÃO**: Verificar se Header.tsx é usado em algum lugar

4. **HeroSearch.tsx** vs **HeroSearchModern.tsx**
   - HeroSearch.tsx (23KB) vs HeroSearchModern (14KB)
   - **AÇÃO**: Verificar qual está sendo usado

### 🟡 PRECISA INVESTIGAÇÃO

5. **MapClient.tsx** (256 bytes)
   - Arquivo muito pequeno, pode ser apenas re-export
   - **AÇÃO**: Verificar se é necessário

6. **LinkToOverlayInterceptor.tsx** (1KB)
   - **AÇÃO**: Verificar onde é usado

7. **PropertyOverlay.tsx** (27KB)
   - Grande componente, verificar se ainda é usado
   - **AÇÃO**: Procurar imports

8. **MobileNavigation.tsx** (10KB)
   - Pode ter sido substituído por MobileHeaderZillow
   - **AÇÃO**: Verificar uso

9. **MobilePropertyCard.tsx** (7KB)
   - Verificar se PropertyCardPremium substituiu
   - **AÇÃO**: Procurar imports

10. **MobileSearchBar.tsx** (6KB)
    - **AÇÃO**: Verificar se ainda é usado

### 🟢 COMPONENTES PRINCIPAIS (Mantér)

- **PropertyCardPremium** (modern/)
- **ModernNavbar** (modern/)
- **PropertyDetailsModalJames**
- **Map.tsx** / **MapWithPriceBubbles.tsx**
- **SearchFiltersBar.tsx**
- **PropertyContactCard.tsx**
- **SimilarCarousel.tsx**

## Próximos Passos

1. ✅ Mapear imports de cada arquivo candidato
2. ⏳ Verificar uso em página/componentes ativos
3. ⏳ Criar lista definitiva de remoção
4. ⏳ Remover em etapas com commits individuais
5. ⏳ Testar após cada remoção

## Comandos para Análise

```bash
# Procurar imports de um componente
grep -r "import.*HeroSearch_backup" src/

# Procurar uso de um componente
grep -r "<PropertyDetailsModal" src/

# Listar arquivos grandes
find src/components -type f -exec du -h {} + | sort -rh | head -20
```

## Observações

- Manter documentação de cada remoção
- Fazer backup antes de remover
- Testar build após remoções
- Verificar se componentes são usados dinamicamente
