# Vercel environment variables

- DATABASE_URL: use Supabase pooler (pgbouncer), e.g. `...pooler.supabase.com:6543?...pgbouncer=true&connection_limit=1&sslmode=require`
- DIRECT_URL: use direct host for migrations/DDL, e.g. `db.<project>.supabase.co:5432?sslmode=require`

Notes:
- Use `prisma migrate deploy` with DIRECT_URL locally or from CI when applying DDL.
- App runtime (Serverless) should keep using DATABASE_URL (pooler).
