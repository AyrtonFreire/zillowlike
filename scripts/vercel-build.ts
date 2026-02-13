import { spawnSync } from "child_process";

function run(cmd: string, args: string[], opts?: { allowFailure?: boolean }) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    if (opts?.allowFailure) {
      console.warn(`[vercel-build] Command failed but continuing: ${cmd} ${args.join(" ")}`);
      return;
    }
    process.exit(res.status ?? 1);
  }
}

const isVercel = process.env.VERCEL === "1";
const isProd = (process.env.VERCEL_ENV || "").toLowerCase() === "production";

const shouldRunMigrationsOnBuild =
  isVercel &&
  process.env.RUN_PRISMA_MIGRATIONS_ON_BUILD === "1" &&
  Boolean(process.env.DATABASE_URL);

// 0) Apply migrations on Vercel (prod must succeed; preview can skip)
if (shouldRunMigrationsOnBuild) {
  run("npx", ["prisma", "migrate", "deploy"], { allowFailure: !isProd });
}

// 1) Prisma client
run("npx", ["prisma", "generate"]);

// 4) Next build
run("npx", ["next", "build"]);
