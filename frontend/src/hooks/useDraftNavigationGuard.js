import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { createRosterNavigationGuard } from '../utils/progressRosterModel.js';
import { subscribeDraftPopstate } from '../utils/draftNavigationEvents.js';

export default function useDraftNavigationGuard({ dirty, saving, pending }) {
  const navigator = useContext(UNSAFE_NavigationContext)?.navigator;
  const state = useRef({ dirty, saving, pending });
  state.current = { dirty, saving, pending };
  useEffect(() => {
    const getState = () => ({ dirty: state.current.dirty, saving: state.current.saving || !!state.current.pending?.() });
    const allow = () => !getState().saving && (!getState().dirty || window.confirm('Bỏ các thay đổi chưa lưu?'));
    const unload = event => { if (getState().dirty || getState().saving) { event.preventDefault(); event.returnValue = ''; } };
    let anchorApproved = false;
    const anchorGuard = createRosterNavigationGuard({ getState, confirmDeparture: () => {
      anchorApproved = allow();
      setTimeout(() => { anchorApproved = false; }, 0);
      return anchorApproved;
    } });
    const originals = navigator ? { push: navigator.push, replace: navigator.replace, go: navigator.go } : null;
    let index = window.history.state?.idx ?? 0;
    let restoring = false;
    let approvedPop = null;
    if (navigator) {
      navigator.push = (...args) => {
        if (anchorApproved || allow()) {
          const result = originals.push.apply(navigator, args);
          index = window.history.state?.idx ?? index;
          return result;
        }
      };
      navigator.replace = (...args) => { if (anchorApproved || allow()) return originals.replace.apply(navigator, args); };
      navigator.go = (...args) => { if (allow()) { approvedPop = index + Number(args[0]); return originals.go.apply(navigator, args); } };
    }
    const pop = event => {
      const next = event.state?.idx;
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      const approved = approvedPop !== null && approvedPop === next;
      approvedPop = null;
      if (approved) { index = next; return; }
      if (next == null || next === index || !navigator) return;
      if (allow()) { index = next; return; }
      event.stopImmediatePropagation();
      restoring = true;
      window.history.go(index - next);
    };
    document.addEventListener('click', anchorGuard, true);
    const unsubscribe = subscribeDraftPopstate(pop);
    window.addEventListener('beforeunload', unload);
    return () => {
      if (navigator) Object.assign(navigator, originals);
      document.removeEventListener('click', anchorGuard, true);
      unsubscribe();
      window.removeEventListener('beforeunload', unload);
    };
  }, [navigator]);
}
