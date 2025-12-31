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

// 4) Next build
run("npx", ["next", "build"]);
