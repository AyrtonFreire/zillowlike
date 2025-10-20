# 🔄 Configuração da Fila de Corretores

## ❓ PROBLEMA COMUM

**Sintoma:** Você tem corretores no sistema, mas a fila está vazia.

**Causa:** Os corretores existem na tabela `User` com role `REALTOR`, mas não foram adicionados à tabela `RealtorQueue`.

---

## ✅ SOLUÇÃO RÁPIDA

Execute o script de inicialização da fila:

```bash
npm run init-queue
```

Este script irá:
1. ✅ Buscar todos os usuários com role `REALTOR`
2. ✅ Verificar quais já estão na fila
3. ✅ Adicionar os que faltam
4. ✅ Atribuir posições automaticamente
5. ✅ Ativar todos por padrão

---

## 📋 EXEMPLO DE SAÍDA

```
🔄 Inicializando fila de corretores...

📊 Encontrados 2 corretores

✅ João Silva (corretor1@zillowlike.com) - Adicionado na posição 1
✅ Maria Santos (corretor2@zillowlike.com) - Adicionado na posição 2

📊 Resumo:
   ✅ Adicionados: 2
   ⏭️  Já existiam: 0
   📋 Total na fila: 2

📋 Fila atual:
   🟢 #1 - João Silva (corretor1@zillowlike.com)
   🟢 #2 - Maria Santos (corretor2@zillowlike.com)
```

---

## 🔧 FLUXO COMPLETO PARA ADICIONAR CORRETOR

### 1. Criar Usuário como REALTOR

```bash
# Opção A: Promover usuário existente
npm run set-role usuario@email.com REALTOR

# Opção B: Criar novo usuário (fazer login primeiro via OAuth)
# Depois executar:
npm run set-role usuario@email.com REALTOR
```

### 2. Adicionar à Fila

```bash
npm run init-queue
```

### 3. Verificar

Acesse: `https://zillowlike.vercel.app/admin/queue`

Você deve ver o corretor na lista!

---

## 📊 ESTRUTURA DA FILA

Cada entrada na `RealtorQueue` contém:

```typescript
{
  id: string;              // ID único da entrada
  realtorId: string;       // ID do usuário corretor
  position: number;        // Posição na fila (1, 2, 3...)
  score: number;           // Pontuação (padrão: 0)
  status: string;          // ACTIVE ou INACTIVE
  activeLeads: number;     // Leads ativos no momento
  bonusLeads: number;      // Leads bônus simultâneos
  totalAccepted: number;   // Total de leads aceitos
  totalRejected: number;   // Total de leads recusados
  totalExpired: number;    // Total de leads expirados
  avgResponseTime: number; // Tempo médio de resposta (min)
}
```

---

## 🎯 QUANDO EXECUTAR

Execute `npm run init-queue` quando:

- ✅ Adicionar novos corretores ao sistema
- ✅ A fila estiver vazia mas houver corretores
- ✅ Após importar dados de outro sistema
- ✅ Após resetar o banco de dados

---

## 🔍 VERIFICAR CORRETORES NO SISTEMA

Para ver todos os corretores:

```bash
npm run verify-admin
```

Isso mostrará todos os usuários e seus roles.

---

## ⚠️ IMPORTANTE

### O script é SEGURO:
- ✅ Não duplica entradas (verifica antes de adicionar)
- ✅ Não remove corretores existentes
- ✅ Não altera posições existentes
- ✅ Apenas adiciona os que faltam

### Posições:
- As posições são atribuídas sequencialmente (1, 2, 3...)
- Corretores existentes mantêm suas posições
- Novos corretores são adicionados no final da fila

---

## 🚀 GERENCIAMENTO DA FILA

Após adicionar corretores à fila, você pode:

1. **Reordenar:** Use `/admin/queue` para mover posições
2. **Ativar/Desativar:** Toggle de status na interface
3. **Monitorar:** Veja métricas e performance

---

## 📝 SCRIPTS RELACIONADOS

```bash
# Verificar todos os usuários e roles
npm run verify-admin

# Promover usuário para REALTOR
npm run set-role <email> REALTOR

# Inicializar fila de corretores
npm run init-queue

# Verificar seu próprio role
npm run check-my-role
```

---

## 🔄 AUTOMAÇÃO FUTURA

**TODO:** Adicionar trigger automático que:
- Quando um usuário é promovido para REALTOR
- Automaticamente cria entrada na RealtorQueue
- Com posição no final da fila
- Status ACTIVE por padrão

---

## ✅ CHECKLIST

Antes de colocar o sistema em produção:

- [ ] Todos os corretores têm role REALTOR
- [ ] Todos os corretores estão na RealtorQueue
- [ ] Posições estão corretas
- [ ] Status estão corretos (ACTIVE/INACTIVE)
- [ ] Testado o fluxo de leads

---

**Data:** 2025-10-20  
**Versão:** 1.0
