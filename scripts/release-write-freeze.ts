import type {PrismaClient} from '@prisma/client';

export async function installWriteFreeze(db: PrismaClient, operatorName: string) {
  if (!/^edu_release_[a-f0-9]{32}$/.test(operatorName)) throw new Error('Invalid operator marker');
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.edu_release_refuse_write() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN
      IF current_user <> '${operatorName}' THEN
        RAISE EXCEPTION 'EDU_RELEASE_MAINTENANCE' USING ERRCODE='55000';
      END IF; RETURN NULL; END $$`);
    const tables = await tx.$queryRawUnsafe<Array<{table_name:string}>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    for (const {table_name:name} of tables) {
      if (!/^[a-z_]+$/.test(name)) throw new Error('Invalid table name');
      await tx.$executeRawUnsafe(`DROP TRIGGER IF EXISTS edu_release_write_freeze ON public."${name}"`);
      await tx.$executeRawUnsafe(`CREATE TRIGGER edu_release_write_freeze BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE
        ON public."${name}" FOR EACH STATEMENT EXECUTE FUNCTION public.edu_release_refuse_write()`);
    }
    return {tables:tables.length};
  }, {maxWait:10_000,timeout:120_000});
}

export async function removeWriteFreeze(db: PrismaClient) {
  await db.$transaction(async tx => {
    const tables = await tx.$queryRawUnsafe<Array<{table_name:string}>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    for (const {table_name:name} of tables) {
      if (!/^[a-z_]+$/.test(name)) throw new Error('Invalid table name');
      await tx.$executeRawUnsafe(`DROP TRIGGER IF EXISTS edu_release_write_freeze ON public."${name}"`);
    }
    await tx.$executeRawUnsafe('DROP FUNCTION IF EXISTS public.edu_release_refuse_write()');
  }, {maxWait:10_000,timeout:120_000});
}
