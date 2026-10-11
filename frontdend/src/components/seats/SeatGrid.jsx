import React from 'react';
import { Seat } from './Seat';

export function SeatGrid({ seats, selectedSeats = [], onSeatSelect, onPointerInteraction }) {
  if (!seats || seats.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8EBF2] p-12 text-center text-gray-500 shadow-xs">
        <p className="font-semibold text-gray-700">No seats found in this room.</p>
        <p className="text-xs text-gray-400 mt-1">Please select another space or contact campus administration.</p>
      </div>
    );
  }

  const maxSelected = selectedSeats.length >= 4;

  return (
    <div className="bg-white border border-[#E8EBF2] shadow-[0_4px_24px_rgba(15,13,38,0.04)] rounded-[24px] p-4 sm:p-6 lg:p-8 flex flex-col items-center overflow-x-auto">
      {/* Front-of-lab Screen / Whiteboard Arc */}
      <div className="w-full max-w-[420px] mb-8 sm:mb-10 flex flex-col items-center">
        <div className="w-full h-8 bg-gradient-to-b from-[#6850F4]/15 via-[#6850F4]/5 to-transparent rounded-t-[100%] border-t-2 border-[#6850F4] flex items-center justify-center pt-1 text-[11px] font-bold tracking-widest text-[#6850F4] uppercase">
          Whiteboard &bull; Front of Room
        </div>
        <div className="w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#6850F4]/30 to-transparent mt-1" />
      </div>

      {/* Seat Matrix Grid (Responsive) */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5 sm:gap-3.5 justify-center mx-auto seat-grid-perspective py-2 px-1">
        {seats.map((seat) => (
          <Seat
            key={seat.id}
            seat={seat}
            isSelected={selectedSeats.some((s) => s.id === seat.id)}
            maxSelected={maxSelected}
            onClick={onSeatSelect}
            onPointerInteraction={onPointerInteraction}
          />
        ))}
      </div>

      <div className="text-[11px] text-gray-400 mt-6 flex items-center gap-2">
        <span>Entrance &bull; Rear Door</span>
      </div>
    </div>
  );
}

export default SeatGrid;
