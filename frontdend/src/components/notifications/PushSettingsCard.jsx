import { useEffect, useState } from 'react';
import { BellRing, Smartphone, Loader2, CheckCircle2, AlertTriangle, Share } from 'lucide-react';
import {
  disablePush,
  enablePush,
  getPushStatus,
  needsHomeScreenInstall,
  sendTestPush,
  syncPushSubscription,
} from '../../services/pushService';

export function PushSettingsCard({ compact = false }) {
  const [status, setStatus] = useState({ supported: true, permission: 'default', subscribed: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const iosInstall = needsHomeScreenInstall();

  useEffect(() => {
    let alive = true;
    getPushStatus().then((s) => {
      if (!alive) return;
      setStatus(s);
      if (s.subscribed) syncPushSubscription();
    });
    return () => {
      alive = false;
    };
  }, []);

  const run = async (fn, okMessage) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      setStatus(await getPushStatus());
      if (okMessage) setMessage(okMessage);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
      setStatus(await getPushStatus());
    } finally {
      setBusy(false);
    }
  };

  const on = status.subscribed && status.permission === 'granted';

  if (compact && (on || !status.supported)) return null;

  return (
    <section className="bg-white rounded-2xl p-4 sm:p-5" aria-labelledby="push-card-title">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${on ? 'bg-emerald-100 text-emerald-600' : 'bg-[#F1EDFF] text-[#6850F4]'}`}>
          {on ? <BellRing className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="push-card-title" className="text-[15px] font-bold text-[#0F0D26]">Phone notifications</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {on ? 'On' : status.permission === 'denied' ? 'Blocked' : 'Off'}
            </span>
          </div>
          <p className="text-[13px] text-gray-600 mt-1 leading-relaxed">
            Get SeatSure presence checks, booking confirmations, check-in reminders and seat-release alerts
            on this device, even when SITTO isn't open. Free, no phone number needed.
          </p>

          {!status.supported && (
            <p className="mt-3 text-[13px] text-amber-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              This browser can't receive notifications. Try Chrome, Edge, Firefox or Safari.
            </p>
          )}

          {status.supported && iosInstall && !on && (
            <p className="mt-3 text-[13px] text-[#3B3568] flex gap-2">
              <Share className="w-4 h-4 shrink-0 mt-0.5 text-[#6850F4]" />
              <span>
                On iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, open SITTO from your
                Home Screen, then turn notifications on here.
              </span>
            </p>
          )}

          {status.permission === 'denied' && (
            <p className="mt-3 text-[13px] text-amber-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Notifications are blocked for this site. Allow them in your browser's site settings, then try again.
            </p>
          )}

          {message && (
            <p className="mt-3 text-[13px] text-emerald-700 flex gap-2" role="status">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {message}
            </p>
          )}
          {error && (
            <p className="mt-3 text-[13px] text-red-700 flex gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          {status.supported && (
            <div className="mt-4 flex flex-wrap gap-2">
              {on ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(sendTestPush, 'Test notification sent. It should appear in a few seconds.')}
                    className="h-9 px-4 rounded-xl text-[13px] font-semibold text-white bg-[#6B3DF5] disabled:opacity-60"
                  >
                    Send test notification
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(disablePush, 'Phone notifications turned off for this device.')}
                    className="h-9 px-4 rounded-xl text-[13px] font-semibold text-[#3B3568] bg-white/60 border border-white/80 disabled:opacity-60"
                  >
                    Turn off
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy || status.permission === 'denied'}
                  onClick={() => run(enablePush, "You're all set. We'll notify this device.")}
                  className="h-10 px-5 rounded-xl text-[13px] font-semibold text-white bg-[#6B3DF5] disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                  Turn on notifications
                </button>
              )}
              {busy && on && <Loader2 className="w-4 h-4 animate-spin text-[#6B3DF5] self-center" />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
