import React from 'react';

export function SeatLegend({ availabilityStats }) {
  const items = [
    { 
      label: 'Available', 
      swatch: 'bg-emerald-50 border-2 border-emerald-500 shadow-[0_2px_0_0_#10b981]',
      count: availabilityStats?.available,
    },
    { 
      label: 'Selected', 
      swatch: 'bg-[#6850F4] border-2 border-[#4E35DB] shadow-[0_2px_0_0_#3B22C4]',
      count: availabilityStats?.selected,
    },
    { 
      label: 'Reserved', 
      swatch: 'bg-amber-50 border-2 border-amber-400 shadow-[0_2px_0_0_#f59e0b]',
      count: availabilityStats?.reserved,
    },
    { 
      label: 'Occupied', 
      swatch: 'bg-rose-50 border-2 border-rose-400 shadow-[0_2px_0_0_#f43f5e]',
      count: availabilityStats?.occupied,
    },
    { 
      label: 'Check-In Window', 
      swatch: 'bg-amber-100 border-2 border-amber-500 shadow-[0_2px_0_0_#d97706] bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(245,158,11,0.2)_3px,rgba(245,158,11,0.2)_6px)]',
      count: availabilityStats?.unverified,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold py-3 px-4 bg-white rounded-2xl border border-[#E8EBF2] shadow-xs mb-6">
      {items.map(item => (
        <div key={item.label} className="flex items-center space-x-2 px-1.5 py-0.5">
          <div className={`w-4 h-4 rounded-[5px] shrink-0 ${item.swatch}`} />
          <span className="text-gray-700 font-medium">
            {item.label}
            {item.count !== undefined && item.count !== null && (
              <span className="ml-1 text-[11px] font-bold text-gray-500">
                ({item.count})
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SeatLegend;
