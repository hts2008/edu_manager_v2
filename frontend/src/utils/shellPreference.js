export function shellPreferenceKey(user) {
  return user?.tenant_id && user?.id ? `edu.shell.rail.${JSON.stringify([user.tenant_id, user.id])}` : null;
}

export function readShellPreference(storage, key) {
  if (!key) return false;
  try { return storage.getItem(key) === 'collapsed'; }
  catch { return false; } // Storage restrictions must not prevent navigation.
}

export function writeShellPreference(storage, key, collapsed) {
  if (!key) return false;
  try { storage.setItem(key, collapsed ? 'collapsed' : 'expanded'); return true; }
  catch { return false; }
}
