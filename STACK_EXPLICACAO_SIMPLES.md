# Explicação simples da tecnologia e da infraestrutura (ZillowLike)

Este documento explica, de forma **bem simples**, o que o sistema usa por trás dos panos, **por que** usa isso, e **quando** você precisa se preocupar com aumento de acessos.

---

## 1) O que é “a stack” e por que isso importa?

A **stack** é o conjunto de tecnologias que faz o site funcionar:

- o que aparece para o usuário (site)
- onde os dados ficam guardados (banco de dados)
- como o sistema envia mensagens (e-mail / WhatsApp / notificações)
- como o sistema aguenta mais gente acessando ao mesmo tempo (escala)

Você não precisa “amar tecnologia” para decidir bem. Você só precisa saber:

- o que é **essencial** (não pode cair)
- o que dá para **melhorar conforme cresce**
- em que momento vale a pena gastar dinheiro com “escala”

---

## 2) Como o sistema funciona (visão de shopping)

Pense na plataforma como um shopping:

- **O site/app** é a “porta de entrada” e as “lojas”
- **O banco de dados** é o “estoque e os registros”
- **O tempo real (chat/alertas)** é o “rádio/comunicador”
- **As automações (jobs/filas/worker)** são “funcionários do backoffice” (limpeza, tarefas repetitivas, processamento pesado)
- **Redis** é como uma “memória rápida / fila de tarefas” para acelerar coisas e organizar trabalho

---

## 3) O que vocês estão usando hoje (em português claro)

### 3.1 Site e API (Next.js)

- **O que é**: é a tecnologia que constrói o site e também os endpoints (rotas) que o site chama para buscar dados.
- **Por que usar**:
  - rápido para construir e evoluir (bom para MVP)
  - dá para escalar com mais instâncias quando precisar
- **Quando vira preocupação**:
  - quando muitos acessos ao mesmo tempo deixam o site lento (CPU/DB)

### 3.2 Banco de dados (PostgreSQL) + Prisma

- **O que é**: onde ficam imóveis, usuários, leads, chats, etc.
- **Por que usar**:
  - é confiável e “padrão ouro” para dados importantes
  - aguenta bastante crescimento antes de precisar mudanças grandes
- **Quando vira preocupação**:
  - quando o banco começa a ficar lento por excesso de consultas
  - quando faltam índices/otimização (normal conforme cresce)

### 3.3 Tempo real (Pusher)

- **O que é**: serviço pronto para “tempo real” (como chat atualizando sem dar refresh).
- **Por que usar**:
  - evita você ter que operar WebSocket por conta própria
  - acelera o desenvolvimento
- **Quando vira preocupação**:
  - quando o custo cresce com muitas conexões/mensagens simultâneas

### 3.4 E-mails (Resend)

- **O que é**: serviço de envio de e-mails.
- **Por que usar**:
  - confiabilidade maior do que mandar do próprio servidor
  - entrega melhor (menos spam)
- **Quando vira preocupação**:
  - quando o volume cresce e o custo aumenta (geralmente é previsível)

### 3.5 Observabilidade (Sentry)

- **O que é**: ferramenta para ver erros em produção e entender “onde quebrou”.
- **Por que usar**:
  - economiza tempo quando aparece bug
  - te dá visibilidade de problemas reais
- **Quando vira preocupação**:
  - quando o volume de eventos cresce (pode ajustar amostragem)

### 3.6 Segurança (login e permissões)

- **O que é**: controle de quem pode acessar o quê (admin, corretor, proprietário, etc.).
- **Por que usar**:
  - evita vazamento de dados
  - mantém cada perfil vendo o que deve
- **Quando vira preocupação**:
  - quando há times/agency, permissões mais complexas e auditoria

---

## 4) Redis, Filas e Workers — explicação sem complicar

### 4.1 O que é Redis?

Redis é um “banco de dados super rápido”, usado para:

- **guardar coisas temporárias** (cache)
- **controlar limites** (rate limit: evitar spam/abuso)
- **organizar tarefas** (fila de jobs)

### 4.2 O que são “filas” (queues)?

Fila é uma lista de tarefas para fazer:

- “expirar leads antigos”
- “recalcular posições na fila de corretores”
- “limpar dados antigos”
- “processar auto reply”

Em vez de fazer isso na hora que o usuário está usando o site (e deixar tudo lento), você joga para a fila.

### 4.3 O que é “worker”?

Worker é um processo separado, tipo um “funcionário do backoffice”, que fica:

- pegando tarefas da fila
- fazendo o trabalho pesado
- registrando resultado

Isso é uma forma bem eficiente de escalar sem complicar o site.

### 4.4 Precisa ter Redis/Worker desde o começo?

Não necessariamente.

- No começo, dá para rodar muita coisa “direto” (sem fila) e depois melhorar.
- Porém, conforme cresce, filas/workers evitam:
  - lentidão em horários de pico
  - travamentos em tarefas demoradas
  - quedas por excesso de processamento na mesma máquina do site

---

## 5) Eu preciso me preocupar com escalonamento de acessos agora?

Na prática, a resposta é:

- **Se você está no começo** (poucos corretores/leads/dia):
  - não vale gastar energia/dinheiro com arquitetura complexa
  - vale mais garantir:
    - estabilidade básica
    - monitoramento de erros
    - banco bem configurado

- **Você precisa se preocupar quando aparecerem sinais**.

### 5.1 Sinais de que “chegou a hora”

- o site fica lento em horários de pico
- “timeouts” (páginas carregando para sempre)
- banco de dados com CPU alta / muitas conexões
- erros intermitentes (funciona às vezes, às vezes não)
- filas de atendimento/lead crescendo e ficando atrasadas

### 5.2 O que fazer primeiro (ordem que normalmente dá mais resultado)

- **Otimizar consultas do banco** (índices/queries)
- **Colocar cache onde faz sentido** (Redis cache)
- **Mover tarefas pesadas para worker** (fila)
- **Escalar o app** (mais instâncias)
- **Escalar o banco** (plano melhor / replica, conforme necessário)

---

## 6) Um “mapa de custos” simples (o que costuma encarecer)

- **Banco (Postgres)**: cresce com volume de dados e consultas
- **Tempo real (Pusher)**: cresce com conexões/mensagens
- **Mídia (Cloudinary)**: cresce com imagens, downloads e transforms
- **Worker/Redis**: cresce com volume de jobs (mas costuma ser controlável)

---

## 7) Conclusão

- A stack atual é **boa para crescer** sem precisar reescrever tudo.
- No começo, o mais importante é:
  - manter o produto rápido de evoluir
  - monitorar erros e gargalos
  - ativar Redis/worker quando houver sinais reais de necessidade

Se você quiser, eu também posso escrever uma versão ainda mais curta (1 página) para mandar para sócio/investidor como “explicação de alto nível”.
