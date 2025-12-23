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

// 1) Prisma client
run("npx", ["prisma", "generate"]);

// 2) Best-effort migrations (can fail due to historic checksum drift)
run("npx", ["prisma", "migrate", "deploy"], { allowFailure: true });

// 3) Ensure the critical table exists even if migrations didn't run
run("npx", ["tsx", "scripts/ensure-lead-chat-read-receipts.ts"], { allowFailure: true });

// 4) Next build
run("npx", ["next", "build"]);
