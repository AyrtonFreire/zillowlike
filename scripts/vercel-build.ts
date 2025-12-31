import { spawnSync } from "child_process";

function run(cmd: string, args: string[], opts?: { allowFailure?: boolean }) {
  const dnsOpt = "--dns-result-order=ipv4first";
  const existing = process.env.NODE_OPTIONS ?? "";
  const nextNodeOptions = existing.includes(dnsOpt) ? existing : `${existing} ${dnsOpt}`.trim();
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: nextNodeOptions,
    },
  });
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

// 3.1) Ensure reviews schema exists (critical for runtime)
run("npx", ["tsx", "scripts/ensure-reviews-schema.ts"], { allowFailure: true });

// 4) Next build
run("npx", ["next", "build"]);
