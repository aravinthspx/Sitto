import React from 'react';
import { cn } from '../../utils/classnames';
import { SEAT_STATUS } from '../../utils/constants';
import { Check, Lock, User, Clock } from 'lucide-react';

export function Seat({ seat, isSelected, maxSelected, onClick, onPointerInteraction }) {
  const status = isSelected ? SEAT_STATUS.SELECTED : seat.status;
  
  const isAvailable = seat.status === SEAT_STATUS.AVAILABLE;
  const isInteractive = isAvailable || isSelected;

  const getStatusStyles = () => {
    switch (status) {
      case SEAT_STATUS.AVAILABLE:
        return 'bg-emerald-50/90 border-emerald-400 text-emerald-800 shadow-[0_3px_0_0_#10b981] hover:bg-emerald-100 hover:border-emerald-500 hover:shadow-[0_4px_0_0_#059669] cursor-pointer active:translate-y-[1px]';
      case SEAT_STATUS.SELECTED:
        return 'bg-[#6850F4] border-[#4E35DB] text-white shadow-[0_3px_0_0_#3B22C4] ring-2 ring-[#6850F4]/30 scale-[1.04] cursor-pointer z-10';
      case SEAT_STATUS.RESERVED:
        return 'bg-amber-50/70 border-amber-300 text-amber-800 shadow-[0_2px_0_0_#f59e0b] opacity-80 cursor-not-allowed';
      case SEAT_STATUS.OCCUPIED:
        return 'bg-rose-50/70 border-rose-300 text-rose-800 shadow-[0_2px_0_0_#f43f5e] opacity-75 cursor-not-allowed';
      case SEAT_STATUS.UNVERIFIED:
        return 'bg-amber-100/80 border-amber-400 text-amber-900 shadow-[0_2px_0_0_#d97706] opacity-85 cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.15)_4px,rgba(245,158,11,0.15)_8px)]';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-400 shadow-[0_2px_0_0_#9ca3af] cursor-not-allowed';
    }
  };

  const dimClass = (!isSelected && maxSelected) ? 'opacity-40 saturate-50' : '';

  return (
    <button
      type="button"
      className="seat-wrapper relative w-[52px] h-[48px] sm:w-[60px] sm:h-[54px] md:w-[64px] md:h-[58px] rounded-t-[14px] sm:rounded-t-[16px] rounded-b-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6850F4] focus-visible:ring-offset-2 transition-all p-0"
      onClick={() => {
        if (onPointerInteraction) onPointerInteraction();
        if (isInteractive) onClick(seat);
      }}
      onMouseEnter={() => onPointerInteraction && onPointerInteraction()}
      disabled={!isInteractive}
      aria-label={`Seat ${seat.id}, ${isSelected ? 'selected' : status}`}
      aria-pressed={isSelected}
      data-disabled={!isInteractive}
      title={`Seat ${seat.id}: ${isSelected ? 'Selected' : status}`}
    >
      <div
        className={cn(
          "seat-inner absolute inset-0 flex flex-col items-center justify-center rounded-t-[14px] sm:rounded-t-[16px] rounded-b-[4px] border-2 font-heading transition-all duration-150 select-none",
          getStatusStyles(),
          dimClass
        )}
        data-status={status}
      >
        <span className="text-xs sm:text-sm font-bold tracking-tight">
          {seat.id}
        </span>
        {isSelected && (
          <span className="text-[9px] font-semibold text-purple-100 uppercase tracking-wider leading-none mt-0.5">
            Picked
          </span>
        )}
      </div>
    </button>
  );
}

export default Seat;
