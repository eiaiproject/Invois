import { useEffect } from 'react';

/**
 * Warns before losing unsaved changes. Handles tab close/reload
 * (`beforeunload`) and in-app link navigation, which React Router does not
 * guard on its own. Browser Back/Forward cannot be blocked without a data
 * router, so that path still leaves without a prompt.
 */
export function useUnsavedChanges(when: boolean, message = 'You have unsaved changes. Leave this page?') {
  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = (event.target as Element | null)?.closest?.('a[href]');
      if (!(element instanceof HTMLAnchorElement)) return;
      const anchor = element;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
    };
  }, [when, message]);
}
