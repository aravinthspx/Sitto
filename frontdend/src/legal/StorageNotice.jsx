import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const NOTICE_KEY = 'sitto_storage_notice';

function hasSeenNotice() {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

// SITTO uses no cookies and only strictly necessary storage, so no consent is
// needed. This is an information notice, not a consent banner.
export function StorageNotice() {
  const [visible, setVisible] = useState(() => !hasSeenNotice());

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(NOTICE_KEY, '1');
    } catch {
      // storage blocked — the notice simply shows again next visit
    }
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Storage notice"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4 pointer-events-none"
    >
      <div className="glass-panel pointer-events-auto mx-auto max-w-3xl rounded-2xl px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <Cookie className="hidden sm:block w-5 h-5 shrink-0 text-[#6B3DF5]" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-[#2A2550] flex-1">
          SITTO uses <strong>no cookies or trackers</strong>. We only store what's needed to keep you
          signed in. Read our <Link to="/cookies" className="font-semibold text-[#6B3DF5] underline">Cookie Policy</Link>{' '}
          and <Link to="/privacy" className="font-semibold text-[#6B3DF5] underline">Privacy Policy</Link>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 h-9 px-4 rounded-xl text-sm font-semibold text-white bg-[#6B3DF5] hover:bg-[#5a32d6] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
