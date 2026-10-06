import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { installWriteFreeze, removeWriteFreeze } from "../scripts/release-write-freeze.js";

test("role freeze rejects catalog/application-name spoof and refresh protects new tables", {
  skip: process.env.RUN_RELEASE_FREEZE_JUDGE !== "1",
}, async () => {
  const container = "edu-release-recovery-20261006";
  const metadata = JSON.parse(execFileSync("docker", ["inspect", container], { encoding: "utf8" }))[0];
  const env = Object.fromEntries(metadata.Config.Env.map((item: string) => {
    const i = item.indexOf("="); return [item.slice(0, i), item.slice(i + 1)];
  }));
  assert.equal(env.POSTGRES_USER, "release");
  const database = `edu_freeze_judge_test_${randomBytes(6).toString("hex")}`;
  execFileSync("docker", ["exec", "-i", container, "psql", "-U", "release", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: `CREATE DATABASE "${database}" OWNER release;`, stdio: ["pipe", "pipe", "pipe"],
  });
  const port = metadata.NetworkSettings.Ports["5432/tcp"][0].HostPort;
  const marker = `edu_release_${randomBytes(16).toString("hex")}`;
  const base = `postgresql://release:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:${port}/${database}?connection_limit=1`;
  const owner = new PrismaClient({ datasources: { db: { url: base } } });
  const password = randomBytes(24).toString("base64url");
  await owner.$executeRawUnsafe(`CREATE ROLE "${marker}" LOGIN PASSWORD '${password}'`);
  await owner.$executeRawUnsafe(`GRANT release TO "${marker}"`);
  const operatorUrl = new URL(base);
  operatorUrl.username = marker; operatorUrl.password = password;
  const operator = new PrismaClient({ datasources: { db: { url: operatorUrl.toString() } } });
  const outsider = new PrismaClient({ datasources: { db: { url: `${base}&application_name=old_deployment` } } });
  try {
    await operator.$executeRawUnsafe('CREATE TABLE public.existing_business (id INT PRIMARY KEY)');
    await installWriteFreeze(operator, marker);
    await assert.rejects(outsider.$executeRawUnsafe('INSERT INTO public.existing_business VALUES (1)'), /EDU_RELEASE_MAINTENANCE/);
    await operator.$executeRawUnsafe('CREATE TABLE public.new_business (id INT PRIMARY KEY)');
    assert.equal(await outsider.$executeRawUnsafe('INSERT INTO public.new_business VALUES (1)'), 1);
    const definition = await outsider.$queryRawUnsafe<Array<{ definition: string }>>(
      "SELECT pg_get_functiondef('public.edu_release_refuse_write()'::regprocedure) AS definition",
    );
    const discovered = definition[0].definition.match(/edu_release_[a-f0-9]{32}/)?.[0];
    assert.equal(discovered, marker);
    await outsider.$queryRawUnsafe("SELECT set_config('application_name', $1, false)", discovered);
    await assert.rejects(outsider.$executeRawUnsafe('INSERT INTO public.existing_business VALUES (2)'), /EDU_RELEASE_MAINTENANCE/);
    assert.equal(await operator.$executeRawUnsafe('INSERT INTO public.existing_business VALUES (2)'), 1);
    await installWriteFreeze(operator, marker);
    await assert.rejects(outsider.$executeRawUnsafe('INSERT INTO public.new_business VALUES (2)'), /EDU_RELEASE_MAINTENANCE/);
    console.info(JSON.stringify({ database, ordinaryWriterDenied: true, refreshedNewTableDenied: true, catalogMarkerBypassDenied: true }));
  } finally {
    await removeWriteFreeze(operator);
    await operator.$disconnect();
    await outsider.$disconnect();
    await owner.$disconnect();
  }
});
