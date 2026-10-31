import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Maximize2, Hand } from 'lucide-react';
import { Seat } from './Seat';
import { SEAT_STATUS } from '../../utils/constants';
import { cn } from '../../utils/classnames';

// Room geometry (CSS px before scaling)
const CELL_W = 74;
const CELL_D = 82;
const AISLE = 30;
const PAD = 30;
const FRONT_ZONE = 56; // space in front of the first row (whiteboard side)
const REAR_ZONE = 40;  // door side

const VIEWS = {
  '3d': { tilt: 52, spin: 0 },
  top: { tilt: 0, spin: 0 },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const HINTS = {
  [SEAT_STATUS.AVAILABLE]: 'Free — tap to pick it',
  [SEAT_STATUS.SELECTED]: 'Picked — tap again to remove',
  [SEAT_STATUS.RESERVED]: 'Reserved by someone else',
  [SEAT_STATUS.OCCUPIED]: 'Occupied right now',
  [SEAT_STATUS.UNVERIFIED]: 'Waiting for check-in — may free up soon',
};

function useElementWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// Interactive 3D room: seats are little chairs on a classroom floor. Drag (or
// use the buttons) to turn the room; switch to Top view for a flat plan.
export function SeatGrid({ seats, selectedSeats = [], onSeatSelect, onPointerInteraction }) {
  const stageRef = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const stageWidth = useElementWidth(stageRef);

  const [view, setView] = useState('3d');
  const [tilt, setTilt] = useState(VIEWS['3d'].tilt);
  const [spin, setSpin] = useState(VIEWS['3d'].spin);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [focusSeat, setFocusSeat] = useState(null);

  const seatCount = seats?.length || 0;
  // Phones get 4 seats per row so each chair stays a comfortable tap target
  const maxCols = stageWidth && stageWidth < 520 ? 4 : 6;
  const cols = Math.min(maxCols, Math.max(1, seatCount));
  const rows = Math.ceil(seatCount / cols);
  const aisleAfter = cols >= 4 ? Math.ceil(cols / 2) : cols;

  const floorW = cols * CELL_W + (cols > aisleAfter ? AISLE : 0) + PAD * 2;
  const floorD = rows * CELL_D + FRONT_ZONE + REAR_ZONE;

  const placed = useMemo(
    () =>
      (seats || []).map((seat, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          seat,
          x: PAD + col * CELL_W + (col >= aisleAfter ? AISLE : 0),
          y: FRONT_ZONE + row * CELL_D,
        };
      }),
    [seats, cols, aisleAfter],
  );

  if (!seats || seats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E6E1D6] p-12 text-center text-gray-500 shadow-xs">
        <p className="font-semibold text-gray-700">No seats found in this room.</p>
        <p className="text-xs text-gray-400 mt-1">Please select another space or contact campus administration.</p>
      </div>
    );
  }

  const maxSelected = selectedSeats.length >= 4;
  const is3d = tilt > 1;

  // Fit the room to the stage, then apply the user's zoom
  const fit = stageWidth ? Math.min(1.1, (stageWidth - 24) / (floorW * (is3d ? 1.08 : 1))) : 1;
  const scale = fit * zoom;
  const tiltRad = (tilt * Math.PI) / 180;
  const stageHeight = Math.max(300, floorD * scale * (is3d ? Math.cos(tiltRad) + 0.18 : 1) + 40);

  const applyView = (name) => {
    setView(name);
    setTilt(VIEWS[name].tilt);
    setSpin(VIEWS[name].spin);
  };

  const reset = () => {
    applyView('3d');
    setZoom(1);
  };

  // ─── Drag to rotate (horizontal = turn, vertical = tilt on mouse) ─────────
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, spin, tilt, id: e.pointerId, moved: false };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (e.buttons === 0) {
      // Missed the pointerup (e.g. released outside the window)
      drag.current = null;
      setDragging(false);
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      setDragging(true);
      // Capture only once it is really a drag, so plain taps still reach the seat
      stageRef.current?.setPointerCapture?.(e.pointerId);
    }
    setSpin(d.spin + dx * 0.35);
    if (e.pointerType === 'mouse') setTilt(clamp(d.tilt - dy * 0.3, 0, 68));
    setView('3d');
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      // Swallow the click that ends this drag, but never a later real tap
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
    }
    drag.current = null;
    setDragging(false);
  };

  const onClickCapture = (e) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const focused = focusSeat && seats.find((s) => s.id === focusSeat);
  const focusedStatus = focused
    ? selectedSeats.some((s) => s.id === focused.id) ? SEAT_STATUS.SELECTED : focused.status
    : null;

  return (
    <div className="bg-white border border-[#E6E1D6] rounded-[24px] overflow-hidden">
      {/* ─── Controls ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-[#E6E1D6]">
        <div
          className="ios-segmented w-[168px]"
          role="tablist"
          aria-label="Seat map view"
          style={{ '--segments': 2, '--index': view === 'top' ? 1 : 0 }}
        >
          <span className="ios-segmented-thumb" aria-hidden="true" />
          {[
            ['3d', '3D room'],
            ['top', 'Top view'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => applyView(key)}
              className={cn('py-1.5 text-xs font-semibold rounded-[9px]', view === key ? 'text-[#15140F]' : 'text-[#6E6A60]')}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <ToolButton label="Turn left" onClick={() => { setView('3d'); setTilt((t) => t || VIEWS['3d'].tilt); setSpin((s) => s - 45); }}>
            <RotateCcw />
          </ToolButton>
          <ToolButton label="Turn right" onClick={() => { setView('3d'); setTilt((t) => t || VIEWS['3d'].tilt); setSpin((s) => s + 45); }}>
            <RotateCw />
          </ToolButton>
          <span className="w-px h-5 bg-[#E6E1D6] mx-1" aria-hidden="true" />
          <ToolButton label="Zoom out" onClick={() => setZoom((z) => clamp(z - 0.15, 0.6, 1.6))} disabled={zoom <= 0.6}>
            <ZoomOut />
          </ToolButton>
          <ToolButton label="Zoom in" onClick={() => setZoom((z) => clamp(z + 0.15, 0.6, 1.6))} disabled={zoom >= 1.6}>
            <ZoomIn />
          </ToolButton>
          <ToolButton label="Reset view" onClick={reset}>
            <Maximize2 />
          </ToolButton>
        </div>
      </div>

      {/* ─── Stage ──────────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        className={cn('seat3d-stage relative select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        style={{ height: stageHeight }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        <div
          className={cn('seat3d-floor', dragging && 'is-dragging')}
          style={{
            width: floorW,
            height: floorD,
            transform: `translate(-50%, -50%) rotateX(${tilt}deg) rotateZ(${spin}deg) scale(${scale})`,
            '--tilt': `${tilt}deg`,
            '--spin': `${spin}deg`,
          }}
        >
          {/* Whiteboard wall at the front of the room */}
          <div className="seat3d-board" style={{ left: floorW * 0.18, width: floorW * 0.64 }}>
            <span>Whiteboard · Front</span>
          </div>
          <div className="seat3d-floor-label" style={{ top: 14 }}>
            Front of room
          </div>
          <div className="seat3d-floor-label seat3d-floor-label--rear" style={{ top: floorD - REAR_ZONE + 10 }}>
            Entrance · Rear door
          </div>
          {cols > aisleAfter && (
            <div
              className="seat3d-aisle"
              style={{ left: PAD + aisleAfter * CELL_W, width: AISLE, top: FRONT_ZONE - 10, height: rows * CELL_D }}
              aria-hidden="true"
            />
          )}

          {placed.map(({ seat, x, y }) => (
            <Seat
              key={seat.id}
              seat={seat}
              style={{ left: x, top: y, width: CELL_W, height: CELL_D }}
              isSelected={selectedSeats.some((s) => s.id === seat.id)}
              maxSelected={maxSelected}
              onClick={onSeatSelect}
              onPointerInteraction={onPointerInteraction}
              onFocusChange={(on) => setFocusSeat(on ? seat.id : null)}
            />
          ))}
        </div>

        {!dragging && is3d && (
          <div className="pointer-events-none absolute left-3 bottom-3 hidden sm:flex items-center gap-1.5 rounded-lg bg-white/85 border border-[#E6E1D6] px-2 py-1 text-[11px] font-mono text-[#6E6A60]">
            <Hand className="w-3.5 h-3.5" /> Drag to turn the room
          </div>
        )}
      </div>

      {/* ─── Info bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E6E1D6] bg-[#FAF8F3] min-h-[52px]" aria-live="polite">
        {focused ? (
          <p className="text-sm">
            <span className="font-heading font-bold text-[#15140F]">Seat {focused.id}</span>
            <span className="text-[#6E6A60]"> · {maxSelected && focusedStatus === SEAT_STATUS.AVAILABLE ? 'You already picked 4 seats' : HINTS[focusedStatus]}</span>
          </p>
        ) : (
          <p className="text-sm text-[#6E6A60]">
            Tap a <span className="font-semibold text-[#12A150]">green</span> seat to pick it — up to 4.
          </p>
        )}
        <span className="shrink-0 rounded-full bg-[#15140F] px-2.5 py-1 text-[11px] font-mono font-semibold text-[#D7FF3A]">
          {selectedSeats.length}/4 picked
        </span>
      </div>
    </div>
  );
}

function ToolButton({ label, children, className, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center text-[#43403A] hover:bg-[#F2EFE7] disabled:opacity-35 [&>svg]:w-4 [&>svg]:h-4',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default SeatGrid;
