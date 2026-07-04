import { useEffect } from 'react';

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave without saving?';

export function useUnsavedChanges(when: boolean, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [message, when]);

  useEffect(() => {
    if (!when) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;

      const next = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (next.origin !== current.origin) return;
      if (next.pathname === current.pathname && next.search === current.search && next.hash === current.hash) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [message, when]);
}

export function confirmDiscard(when: boolean, message = DEFAULT_MESSAGE) {
  return !when || window.confirm(message);
}
