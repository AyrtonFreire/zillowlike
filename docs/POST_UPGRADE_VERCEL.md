# Pós-upgrade Vercel (Cron Jobs)

## Contexto
No plano atual a Vercel limita o projeto a 2 Cron Jobs. Para destravar o deploy, removemos a cron dedicada de `recalc-conversion-benchmarks` do `vercel.json` e passamos a executar esse recálculo dentro de uma cron existente.

## O que reverter/ativar quando fizer upgrade do plano
- Re-adicionar no `vercel.json` uma entrada de cron para:
  - `path: /api/cron/recalc-conversion-benchmarks`
  - `schedule: 0 2 * * *` (ou o horário desejado)
- (Opcional) Remover a execução do recálculo de benchmarks de dentro de `/api/cron/expire-leads`.

## Observações
- O endpoint `/api/cron/recalc-conversion-benchmarks` continua existindo e pode ser chamado manualmente (com `CRON_SECRET`).
- A execução do recálculo no cron existente está isolada com `try/catch` para não quebrar o job principal.
