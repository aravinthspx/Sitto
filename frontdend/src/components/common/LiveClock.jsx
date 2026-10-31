import { useEffect, useState } from 'react';
import { OPERATING_HOURS } from '../../utils/constants';
import { cn } from '../../utils/classnames';

// Bookings follow campus time, whatever the device's own timezone is
const TIME_ZONE = 'Asia/Kolkata';

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function campusClock(now) {
  const parts = Object.fromEntries(timeFormat.formatToParts(now).map((p) => [p.type, p.value]));
  const h = Number(parts.hour) % 24;
  const m = Number(parts.minute);
  return { h, m, s: Number(parts.second), text: `${String(h).padStart(2, '0')}:${parts.minute}:${parts.second}` };
}

function formatGap(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Is the booking window (08:00–17:00 IST) open, and how long until it changes?
export function bookingWindow(now = new Date()) {
  const { h, m } = campusClock(now);
  const mins = h * 60 + m;
  const open = OPERATING_HOURS.START * 60;
  const close = OPERATING_HOURS.END * 60;
  if (mins >= open && mins < close) {
    return { isOpen: true, label: `Open · closes in ${formatGap(close - mins)}` };
  }
  const untilOpen = mins < open ? open - mins : 24 * 60 - mins + open;
  return { isOpen: false, label: `Closed · opens in ${formatGap(untilOpen)}` };
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Live campus clock.
 * @param {'pill' | 'hero'} variant - compact header pill, or the large hero block
 */
export function LiveClock({ variant = 'pill', className = '' }) {
  const now = useNow();
  const { text } = campusClock(now);
  const win = bookingWindow(now);

  if (variant === 'hero') {
    return (
      <div className={cn('flex flex-col', className)}>
        <time
          dateTime={now.toISOString()}
          className="font-mono font-semibold text-white text-3xl sm:text-4xl tabular-nums tracking-tight"
          aria-label={`Campus time ${text}`}
        >
          {text}
        </time>
        <span className="mt-1 text-[11px] font-mono text-white/50">
          {dateFormat.format(now)} · IST
        </span>
        <span
          className={cn(
            'mt-3 inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-mono font-semibold',
            win.isOpen ? 'bg-[#D7FF3A] text-[#15140F]' : 'bg-white/10 text-white/70',
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', win.isOpen ? 'bg-[#15140F]' : 'bg-white/50')} />
          Booking {win.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-[#E6E1D6] bg-white px-2.5 py-1.5 font-mono text-xs',
        className,
      )}
      title={`Booking ${win.label}`}
    >
      <span className={cn('live-dot live-dot--green', !win.isOpen && 'opacity-40 grayscale')} aria-hidden="true" />
      <time dateTime={now.toISOString()} className="font-semibold text-[#15140F] tabular-nums">
        {text}
      </time>
      <span className="text-[#6E6A60]">IST</span>
    </div>
  );
}

export default LiveClock;
