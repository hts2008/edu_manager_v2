import {createHash} from 'node:crypto';

export function validateProductionTarget(value: string | undefined) {
  let url: URL;
  try { url=new URL(value!); } catch { throw new Error('Invalid release database target'); }
  if (!['postgresql:','postgres:'].includes(url.protocol) || url.hostname!=='ep-silent-queen-aoujb3oc.c-2.ap-southeast-1.aws.neon.tech' || url.pathname!=='/neondb' || url.username!=='neondb_owner' || (url.port && url.port!=='5432')) {
    throw new Error('Release target does not match the verified production identity');
  }
  return createHash('sha256').update(url.hostname+url.pathname).digest('hex').slice(0,12);
}

export function assertAccountsUnchanged(before: Array<Record<string,unknown>>, after: Array<Record<string,unknown>>) {
  for (const account of before) {
    const current=after.find(row=>row.id===account.id);
    const changed=Object.keys(account).filter(key=>!current || current[key]!==account[key]);
    if (changed.length) throw new Error(`Existing account ${String(account.id)} changed fields: ${changed.join(', ')}`);
  }
}

export function safeReleaseError(error: unknown, secrets: string[] = []) {
  let message=error instanceof Error ? error.message : 'Release operation failed';
  message=message.replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi,'[DATABASE_URL]')
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g,'[PASSWORD_HASH]');
  for (const secret of secrets.filter(Boolean).sort((a,b)=>b.length-a.length)) message=message.split(secret).join('[REDACTED]');
  return message;
}

type LockDb = {$queryRawUnsafe<T>(sql:string,...values:unknown[]):Promise<T>};
export async function releaseExplicitLock(db:LockDb, evidence:{pid?:string;backendStart?:string;marker?:string}) {
  const {pid,backendStart,marker}=evidence;
  if (!pid || !/^[1-9][0-9]*$/.test(pid) || !Number.isSafeInteger(Number(pid)) || Number(pid)>2147483647 || !backendStart || !Number.isFinite(Date.parse(backendStart)) || !marker || !/^edu_release_cli_[a-f0-9]{32}$/.test(marker)) {
    throw new Error('Explicit PID, backend start and unique CLI marker required for manual lock release');
  }
  // Recheck all eligibility in the termination statement; idle alone is not exit evidence.
  const result=await db.$queryRawUnsafe<Array<{terminated:boolean}>>(`SELECT pg_terminate_backend(a.pid) AS terminated FROM pg_stat_activity a
    WHERE a.pid=$1::integer AND a.backend_start=$2::timestamptz AND a.application_name=$3
      AND a.datname=current_database() AND a.usename=current_user AND a.pid<>pg_backend_pid()
      AND a.state='idle' AND a.xact_start IS NULL
      AND EXISTS (SELECT 1 FROM pg_locks l WHERE l.pid=a.pid AND l.locktype='advisory'
        AND l.database=(SELECT oid FROM pg_database WHERE datname=current_database())
        AND l.classid=0 AND l.objid=72707369 AND l.objsubid=1 AND l.granted)`,Number(pid),backendStart,marker);
  if(result.length!==1 || !result[0].terminated) throw new Error('Manual lock release refused: session no longer matches supplied evidence');
}
