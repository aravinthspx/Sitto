// Smooth page switching with the browser View Transitions API.
//
// React Router's own `viewTransition` option doesn't work in this app's setup
// (descendant <Routes> drop the flag, and router updates are deferred with
// React.startTransition so the "new" snapshot is taken too early). Instead we
// start the transition ourselves and only let it proceed once React has
// committed the new route (signalled from a layout effect, see Root in App.jsx).

const COMMIT_EVENT = 'sitto:route-commit';
const MAX_WAIT_MS = 450;
const START_TIMEOUT_MS = 300;

export function signalRouteCommit() {
  window.dispatchEvent(new Event(COMMIT_EVENT));
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function withViewTransition(update) {
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }

  let started = false;
  const transition = document.startViewTransition(() => {
    if (started) return undefined; // fallback below already navigated
    started = true;
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, MAX_WAIT_MS); // e.g. navigating to the current page
      window.addEventListener(
        COMMIT_EVENT,
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      update();
    });
  });
  // Skipped transitions reject these promises; that's expected, not an error.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});

  // The browser only runs the update once it can paint. If that doesn't happen
  // promptly (throttled background tab, busy main thread), navigate anyway —
  // navigation must never wait on an animation.
  setTimeout(() => {
    if (started) return;
    started = true;
    transition.skipTransition();
    update();
  }, START_TIMEOUT_MS);
}

// Is this click on an in-app link that we should animate ourselves?
export function internalLinkTarget(event) {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = event.target.closest?.('a[href]');
  if (!anchor || anchor.hasAttribute('download') || anchor.dataset.noTransition !== undefined) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url.pathname + url.search + url.hash;
}
