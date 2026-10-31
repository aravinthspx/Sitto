import { Check } from 'lucide-react';
import { cn } from '../../utils/classnames';
import { SEAT_STATUS } from '../../utils/constants';

const STATUS_LABEL = {
  [SEAT_STATUS.AVAILABLE]: 'available',
  [SEAT_STATUS.SELECTED]: 'selected',
  [SEAT_STATUS.RESERVED]: 'reserved',
  [SEAT_STATUS.OCCUPIED]: 'occupied',
  [SEAT_STATUS.UNVERIFIED]: 'awaiting check-in',
};

// A CSS cuboid: top face plus four walls, coloured through CSS variables.
// `front` renders on the wall that faces the back of the room (the viewer).
function Box({ className, w, d, h, style, children, front }) {
  return (
    <div className={cn('box3d', className)} style={{ width: w, height: d, '--h': `${h}px`, ...style }}>
      <div className="box3d__face box3d__north" />
      <div className="box3d__face box3d__south">{front}</div>
      <div className="box3d__face box3d__west" />
      <div className="box3d__face box3d__east" />
      <div className="box3d__face box3d__top">{children}</div>
    </div>
  );
}

// One desk + chair in the 3D room. Still a real <button>, so it works with
// the keyboard and screen readers exactly like the old flat grid.
export function Seat({ seat, isSelected, maxSelected, onClick, onPointerInteraction, onFocusChange, style }) {
  const status = isSelected ? SEAT_STATUS.SELECTED : seat.status;
  const isAvailable = seat.status === SEAT_STATUS.AVAILABLE;
  // A 5th pick still reaches the page so it can explain the 4-seat limit
  const isInteractive = isSelected || isAvailable;
  const dimmed = !isSelected && maxSelected && isAvailable;

  return (
    <button
      type="button"
      className={cn('seat3d', dimmed && 'is-dimmed')}
      style={style}
      data-status={status}
      onClick={() => {
        if (onPointerInteraction) onPointerInteraction();
        if (isInteractive) onClick(seat);
      }}
      onMouseEnter={() => {
        if (onPointerInteraction) onPointerInteraction();
        onFocusChange?.(true);
      }}
      onMouseLeave={() => onFocusChange?.(false)}
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
      aria-disabled={!isInteractive}
      aria-label={`Seat ${seat.id}, ${STATUS_LABEL[status] || status}`}
      aria-pressed={isSelected}
    >
      <span className="seat3d__shadow" aria-hidden="true" />
      <span className="seat3d__lift" aria-hidden="true">
        {/* Desk (towards the whiteboard) */}
        <Box className="seat3d__desk" w={58} d={18} h={26} style={{ left: 8, top: 6 }} />
        {/* Chair seat with the label on top */}
        <Box className="seat3d__chair" w={46} d={38} h={14} style={{ left: 14, top: 30 }}>
          <span className="seat3d__label">
            {isSelected ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : seat.id}
          </span>
        </Box>
        {/* Backrest */}
        <Box
          className="seat3d__chair seat3d__back"
          w={46}
          d={7}
          h={30}
          style={{ left: 14, top: 66 }}
          front={<span className="seat3d__label seat3d__label--back">{seat.id}</span>}
        />
      </span>
      {isSelected && (
        <span className="seat3d__pin" aria-hidden="true">
          {seat.id}
        </span>
      )}
    </button>
  );
}

export default Seat;
