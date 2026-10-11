import React from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { 
  X, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles, 
  MapPin, 
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info
} from 'lucide-react';
import { OPERATING_HOURS } from '../../utils/constants';

export function SeatDetailPanel({ 
  spaceName, 
  buildingName,
  floorName,
  selectedSeats = [], 
  onReserve, 
  onCancel, 
  onRemoveSeat, 
  isReserving, 
  maxSeatsError,
  dates = [],
  selectedDateStr,
  onDateChange,
  sessions = [],
  selectedSession,
  onSessionChange,
  duration = 1,
  onDurationChange,
  actualEndIso,
  reservationError
}) {

  // Calculate maximum allowed duration (up to 3 hours, but not past END hours)
  const getAvailableDurations = () => {
    if (!selectedSession) return [1, 2, 3];
    
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric", 
        hour12: false
      }).formatToParts(new Date(selectedSession.startIso));
      
      const startHour = parseInt(parts.find(p => p.type === 'hour').value, 10);
      const maxAllowed = Math.min(3, Math.max(1, OPERATING_HOURS.END - startHour));
      const options = [];
      for (let i = 1; i <= maxAllowed; i++) options.push(i);
      return options.length > 0 ? options : [1, 2, 3];
    } catch {
      return [1, 2, 3];
    }
  };
  
  const durations = getAvailableDurations();

  const formattedStart = selectedSession ? new Date(selectedSession.startIso).toLocaleTimeString([], { 
    timeZone: 'Asia/Kolkata', 
    hour: 'numeric', 
    minute: '2-digit' 
  }) : '';

  const formattedEnd = actualEndIso ? new Date(actualEndIso).toLocaleTimeString([], { 
    timeZone: 'Asia/Kolkata', 
    hour: 'numeric', 
    minute: '2-digit' 
  }) : '';

  const hasSelectedSeats = selectedSeats.length > 0;

  return (
    <Card className={`border border-[#E8EBF2] bg-white shadow-[0_8px_30px_rgba(15,13,38,0.06)] rounded-[24px] overflow-hidden transition-all duration-300 ${maxSeatsError ? 'animate-shake' : ''}`}>
      {/* Header with SITTO Royal Purple Identity */}
      <CardHeader className="bg-gradient-to-r from-[#17143A] via-[#211B54] to-[#120F30] text-white p-5 sm:p-6 pb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#8B6BFF]" />
            <span className="text-xs font-bold text-[#8B6BFF] uppercase tracking-wider">
              Step 3 &bull; Booking Summary
            </span>
          </div>
          {hasSelectedSeats && (
            <div className="text-xs font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-white border border-white/10">
              {selectedSeats.length} / 4 Seats
            </div>
          )}
        </div>

        <div className="text-lg font-bold font-heading text-white truncate">
          {spaceName || 'Selected Space'}
        </div>
        {(buildingName || floorName) && (
          <div className="text-xs text-purple-200/80 font-medium flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3 text-[#8B6BFF]" />
            <span>{[buildingName, floorName].filter(Boolean).join(' • ')}</span>
          </div>
        )}
        
        {/* Selected Seats Chips */}
        <div className="pt-3">
          {hasSelectedSeats ? (
            <div>
              <div className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider mb-1.5">
                Selected Seat{selectedSeats.length > 1 ? 's' : ''}:
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedSeats.map(seat => (
                  <div 
                    key={seat.id} 
                    className="flex items-center bg-[#6850F4] rounded-xl pl-3 pr-1.5 py-1 text-white shadow-xs border border-white/20 animate-in fade-in zoom-in duration-150"
                  >
                    <span className="text-sm font-bold font-heading">{seat.id}</span>
                    <button 
                      type="button"
                      className="ml-2 p-1 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
                      onClick={() => onRemoveSeat(seat.id)}
                      aria-label={`Remove seat ${seat.id}`}
                      disabled={isReserving}
                      title="Deselect this seat"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-purple-200/90 py-1.5 px-3 bg-white/10 rounded-xl flex items-center gap-2 border border-white/10">
              <Info className="w-4 h-4 text-[#8B6BFF] shrink-0" />
              <span>Select an available green seat on the map</span>
            </div>
          )}
        </div>
        
        {maxSeatsError && (
          <div className="mt-2 text-amber-200 text-xs font-bold flex items-center bg-amber-500/25 px-2.5 py-1.5 rounded-xl border border-amber-400/30">
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-300" />
            Maximum 4 seats can be reserved in one booking
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Reservation Error Banner */}
        {reservationError && (
          <div className="p-3.5 text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{reservationError}</div>
          </div>
        )}

        {/* 1. Date Picker */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#6850F4]" />
              Booking Date
            </span>
            <span className="text-gray-400 font-normal">Next 3 days</span>
          </label>
          <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
            {dates.map(d => (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => onDateChange(d.dateStr)}
                disabled={isReserving}
                className={`flex-1 min-w-[76px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedDateStr === d.dateStr 
                    ? 'border-[#6850F4] bg-[#F1EDFF] text-[#6850F4] shadow-xs' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Start Session Picker */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#6850F4]" />
              Start Time
            </span>
            {selectedSession && (
              <span className="text-[#6850F4] font-semibold">{formattedStart}</span>
            )}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sessions.map(s => {
              const isSelected = selectedSession?.id === s.id;
              const isUnavailable = s.isPast || s.isFull;
              
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSessionChange(s.id)}
                  disabled={isReserving || isUnavailable}
                  aria-pressed={isSelected}
                  aria-disabled={isUnavailable}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center ${
                    isSelected 
                      ? 'border-[#6850F4] bg-[#6850F4] text-white shadow-xs' 
                      : isUnavailable
                        ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'border-gray-200 text-gray-700 hover:border-[#6850F4]/40 hover:text-[#6850F4] bg-white cursor-pointer'
                  }`}
                >
                  <span>{s.label.split(' – ')[0]}</span>
                  <span className={`text-[10px] font-normal mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                    {s.isPast ? 'Past' : s.isFull ? 'Full' : 'Open'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Duration Selector (1, 2, or 3 Hours) */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Duration Option</span>
            <span className="text-[#6850F4] font-semibold">{duration} Hour{duration > 1 ? 's' : ''}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {durations.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => onDurationChange(d)}
                disabled={isReserving}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center ${
                  duration === d 
                    ? 'border-[#6850F4] bg-[#F1EDFF] text-[#6850F4] shadow-xs' 
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-sm">{d} {d === 1 ? 'hr' : 'hrs'}</span>
                <span className="text-[10px] font-normal text-gray-400">
                  {d === 1 ? 'Quick session' : d === 2 ? 'Standard study' : 'Deep focus'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Complete Booking Summary Strip */}
        <div className="bg-[#F7F8FC] rounded-2xl p-4 border border-[#E8EBF2] space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-gray-500">
            <span>Schedule Window:</span>
            <span className="font-bold text-[#0F0D26]">
              {formattedStart} &ndash; {formattedEnd} ({duration} hr{duration > 1 ? 's' : ''})
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-500">
            <span>Check-in Rule:</span>
            <span className="text-gray-700 font-semibold">15-min auto-release window</span>
          </div>
          <div className="flex justify-between items-center text-gray-500 pt-1 border-t border-gray-200/60">
            <span>SeatSure™ Guard:</span>
            <span className="text-emerald-700 font-bold flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Verified Telemetry
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-5 sm:p-6 pt-0 flex flex-col space-y-2.5">
        <Button 
          className="w-full bg-[#6850F4] hover:bg-[#5840DC] text-white font-bold text-sm h-12 rounded-xl border-none shadow-[0_4px_16px_rgba(104,80,244,0.35)] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          onClick={onReserve} 
          disabled={isReserving || !hasSelectedSeats}
        >
          {isReserving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Securing Your Seat...</span>
            </>
          ) : hasSelectedSeats ? (
            <>
              <span>Confirm Reservation ({selectedSeats.length} Seat{selectedSeats.length !== 1 ? 's' : ''})</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <span>Select an Available Seat to Continue</span>
          )}
        </Button>

        {hasSelectedSeats && (
          <button 
            type="button"
            className="w-full py-1 text-xs text-gray-500 hover:text-red-600 transition-colors font-semibold cursor-pointer"
            onClick={onCancel} 
            disabled={isReserving}
          >
            Clear Selected Seats
          </button>
        )}
      </CardFooter>
    </Card>
  );
}

export default SeatDetailPanel;
