import { spawnSync } from "child_process";

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { stdio: "pipe", shell: true });
  if (typeof res.status === "number" && res.status !== 0) {
    const out = Buffer.concat([res.stdout ?? Buffer.alloc(0), res.stderr ?? Buffer.alloc(0)]).toString("utf8");
    throw new Error(out || `${cmd} ${args.join(" ")} failed`);
  }
  return String(res.stdout || "");
}

function main() {
  const raw = run("git", ["diff", "--name-status", "--", "prisma/migrations"]) 
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  type Row = { status: string; path: string };
  const rows: Row[] = raw
    .map((line) => {
      const parts = line.split(/\s+/);
      const status = parts[0] || "";
      const path = parts.slice(1).join(" ");
      return { status, path: path.replace(/\\/g, "/") };
    })
    .filter((r) => r.path.startsWith("prisma/migrations/"));

  // Block modifications/deletions/renames of existing migration files.
  // Allow new files (status A) so adding a new migration folder doesn't fail.
  const blocked = rows.filter((r) => r.status !== "A");
  const blockedFiles = blocked
    .map((r) => r.path)
    .filter((p) => p.endsWith("migration.sql") || p.endsWith("migration_lock.toml"));

  if (blockedFiles.length === 0) return;

  const list = blockedFiles.join("\n");
  console.error(
    [
      "Detected modifications under prisma/migrations.",
      "Do NOT edit applied migrations. Create a new migration instead.",
      "Files:",
      list,
    ].join("\n")
  );
  process.exit(1);
}

main();
