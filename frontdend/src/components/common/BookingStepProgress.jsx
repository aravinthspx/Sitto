import React from 'react';
import { Check, MapPin, Grid3X3, Clock, QrCode } from 'lucide-react';

/**
 * Compact, premium 4-step booking progress indicator for SITTO.
 *
 * Steps:
 * 1. Choose Building, Floor and Lab/Library
 * 2. Select an Available Seat
 * 3. Choose 1, 2 or 3 Hours and Confirm
 * 4. View Reservation QR Pass
 */
export function BookingStepProgress({ currentStep = 1, onStepClick, className = '' }) {
  const steps = [
    {
      number: 1,
      title: 'Space & Lab',
      subtitle: 'Building & Floor',
      icon: MapPin,
    },
    {
      number: 2,
      title: 'Select Seat',
      subtitle: 'Live Seat Map',
      icon: Grid3X3,
    },
    {
      number: 3,
      title: 'Duration & Time',
      subtitle: '1, 2 or 3 Hours',
      icon: Clock,
    },
    {
      number: 4,
      title: 'Reservation Pass',
      subtitle: 'Verified QR Code',
      icon: QrCode,
    },
  ];

  return (
    <div className={`w-full bg-white rounded-2xl border border-[#E8EBF2] p-3 sm:p-4 shadow-[0_2px_12px_rgba(15,13,38,0.03)] ${className}`}>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isUpcoming = currentStep < step.number;
          const isClickable = onStepClick && (isDone || isCurrent);

          return (
            <button
              key={step.number}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step.number)}
              className={`flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 p-2 rounded-xl text-left transition-all ${
                isCurrent
                  ? 'bg-[#F1EDFF] border border-[#6850F4]/30 shadow-xs'
                  : isDone
                  ? 'bg-emerald-50/60 border border-emerald-200/60 hover:bg-emerald-50 cursor-pointer'
                  : 'bg-gray-50/50 border border-transparent opacity-60'
              }`}
            >
              {/* Step Badge / Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-[#6850F4] text-white shadow-xs ring-2 ring-[#6850F4]/20'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Text Info (responsive: hides subtitle on very small mobile) */}
              <div className="min-w-0 flex flex-col text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCurrent
                        ? 'text-[#6850F4]'
                        : isDone
                        ? 'text-emerald-700'
                        : 'text-gray-400'
                    }`}
                  >
                    Step {step.number}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold truncate ${
                    isCurrent
                      ? 'text-[#0F0D26]'
                      : isDone
                      ? 'text-emerald-900'
                      : 'text-gray-500'
                  }`}
                >
                  {step.title}
                </span>
                <span className="hidden md:inline-block text-[11px] text-gray-400 truncate">
                  {step.subtitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default BookingStepProgress;
