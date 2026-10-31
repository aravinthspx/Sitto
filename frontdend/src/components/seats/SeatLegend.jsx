import React from 'react';

export function SeatLegend({ availabilityStats }) {
  const items = [
    { 
      label: 'Available', 
      swatch: 'bg-[#3CCB74] shadow-[0_2px_0_0_#1F9D55]',
      count: availabilityStats?.available,
    },
    { 
      label: 'Selected', 
      swatch: 'bg-[#2E4BFF] shadow-[0_2px_0_0_#172AA8]',
      count: availabilityStats?.selected,
    },
    { 
      label: 'Reserved', 
      swatch: 'bg-[#F4C445] shadow-[0_2px_0_0_#D09A10]',
      count: availabilityStats?.reserved,
    },
    { 
      label: 'Occupied', 
      swatch: 'bg-[#EE6A6E] shadow-[0_2px_0_0_#C2454A]',
      count: availabilityStats?.occupied,
    },
    { 
      label: 'Check-In Window', 
      swatch: 'bg-[repeating-linear-gradient(45deg,#F7A733_0_3px,#F9BC5E_3px_6px)] shadow-[0_2px_0_0_#CF7F0C]',
      count: availabilityStats?.unverified,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold py-3 px-4 bg-white rounded-2xl border border-[#E6E1D6] shadow-xs mb-6">
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
