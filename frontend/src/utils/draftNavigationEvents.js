const guards = new Set();

// Install before BrowserRouter mounts; popstate is delivered on window itself.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', event => {
    for (const guard of guards) guard(event);
  }, true);
}

export function subscribeDraftPopstate(guard) {
  guards.add(guard);
  return () => guards.delete(guard);
}
