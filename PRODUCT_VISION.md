# Visão do Produto – ZillowLike

## 1. Visão Geral

Marketplace imobiliário premium inspirado em Zillow/JamesEdition, focado em:

- **Experiência visual forte**: fotos grandes, galerias avançadas, UI limpa.
- **Busca inteligente**: filtros úteis, mapa, destaque para localização real.
- **Fluxos simples** para proprietário, corretor/imobiliária e comprador/inquilino.

Objetivo: tornar fácil e confiável **anunciar** e **encontrar** imóveis de qualidade no Brasil, sem transformar a plataforma em um "chefe" dos corretores.

---

## 2. Públicos Principais

### Proprietário Pessoa Física (OWNER)
- Quer postar o imóvel uma vez e ter **boa exposição**.
- Não quer entender funil, CRM complexo ou regras de jogo.
- Precisa de formulário guiado, dicas e confiança de que o anúncio ficou bom.

### Corretor / Imobiliária (REALTOR / AGENCY)
- Quer acesso a **bons imóveis e leads qualificados**.
- Não quer ser ranqueado, punido ou exposto publicamente.
- Vê a plataforma como um **canal de oportunidades**, não como um gestor.

### Comprador / Inquilino (USER)
- Quer **busca rápida e visual** (mapa + cards + fotos fortes).
- Quer sentir que os imóveis são reais: fotos boas, endereço coerente, tags honestas.

---

## 3. Promessa de Valor

### Para Proprietários
> "Poste seu imóvel com qualidade profissional em poucos passos, e deixe que o mercado venha até você."

### Para Corretores/Imobiliárias
> "Tenha um fluxo constante de oportunidades, sem pressão e sem gamificação tóxica."

### Para Compradores/Inquilinos
> "Encontre imóveis reais, bem apresentados, com mapa, fotos fortes e filtros inteligentes."

---

## 4. Pilares do Produto

### 4.1 Zero Pressão nos Leads

Baseado em **LEAD_SYSTEM_V2_ZERO_PRESSURE**:

- Nada de contagem regressiva agressiva, metas artificiais ou punição automática.
- Sem ranking público, medalhas ou gamificação que gere ansiedade.
- Leads são **convites para conexão**, não provas de desempenho.

### 4.2 Experiência Premium de Imagens

- Galeria avançada no modal de detalhes (swipe, zoom, thumbnails, grid, prefetch).
- Cards sempre priorizando foto de fachada/interior de qualidade.
- Evitar ao máximo cards sem foto ou imagens quebradas.

### 4.3 Dados Confiáveis e Realistas

- Endereços coerentes (bairro + cidade/estado + CEP válido).
- **conditionTags** claras: "Novo", "Reformado", "Pronto para morar", etc.
- Sem "lixo de teste" em ambiente real/produtivo.

### 4.4 Simplicidade para o Proprietário

- Wizard de criação em etapas: 
  1. Informações básicas
  2. Localização
  3. Detalhes
  4. Fotos
  5. Revisão e publicação
- Dicas de preenchimento, validações amigáveis, sugestões de capa, feedback sobre fotos.

### 4.5 Respeito ao Tempo do Corretor

- Painéis simples para leads, imóveis e agenda.
- Ferramentas de organização (mural, filtros, etiquetas) como **opções**, não obrigações.

---

## 5. Princípios de UX

- **Clareza visual primeiro**
  - Layout limpo, tipografia consistente, foco em fotos e dados chave.
  - Menos texto de marketing, mais informação objetiva.

- **Mobile-first**
  - Header estilo Zillow, busca forte, carrosséis fluidos, mapa utilizável no celular.
  - Nada de "versão reduzida": mobile é canal principal.

- **Sem surpresas agressivas**
  - Sem pop-ups forçados, paywalls estranhos ou travas de navegação.
  - Feedbacks claros em erros, carregamento e ações sensíveis.

- **Contexto completo no modal de detalhes**
  - Fotos, mapa, características, contato, imóveis similares e região.
  - Usuário não precisa ficar voltando para a lista para entender o imóvel.

---

## 6. Coisas que NUNCA Devemos Fazer

- Gamificar corretores com ranking, medalhas ou punições públicas.
- Expor notas/avaliações de forma que gere medo de retaliação.
- Criar "urgência falsa" (ex.: ameaças de perda de lead para pressionar comportamento).
- Mostrar imóveis obviamente falsos: endereço incoerente, foto nada a ver, tags absurdas.

---

## 7. Direções Futuras

- **Seed de dados ultra realista**
  - Pequeno conjunto de imóveis hero (8–12) com fotos excelentes e endereços bem escolhidos.

- **Mural de Leads Zero Pressão**
  - Experiência onde corretores podem ver, filtrar e aceitar leads sem rankings, sem cobranças.

- **Jornadas mapeadas**
  - Jornada do proprietário: criar anúncio → receber leads → marcar visitas.
  - Jornada do corretor: entrar → filtrar oportunidades → aceitar → acompanhar.
  - Jornada do comprador: buscar → favoritar → pedir contato/visita.

Este documento serve como referência de produto para orientar decisões de UX, regras de negócio e priorização de features no ZillowLike.
