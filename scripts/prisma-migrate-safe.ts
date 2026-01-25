import { spawnSync } from "child_process";

function isLocalDb(url: string) {
  try {
    const u = new URL(url);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (typeof res.status === "number") process.exit(res.status);
  process.exit(1);
}

const dbUrl = String(process.env.DATABASE_URL || "").trim();
if (!dbUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

if (isLocalDb(dbUrl)) {
  run("npx", ["prisma", "migrate", "dev"]);
}

console.log(
  [
    "Refusing to run `prisma migrate dev` against a non-local DATABASE_URL.",
    "Use `npm run db:deploy` (prisma migrate deploy) to apply migrations to Supabase/production-like DB.",
  ].join("\n")
);

process.exit(1);
