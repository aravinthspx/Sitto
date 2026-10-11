import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatTime, formatSessionDisplay } from '../../utils/time';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import SITTOLogo from '../common/SITTOLogo';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck,
  Calendar,
  Copy,
  Check,
  QrCode
} from 'lucide-react';

export function ConfirmedPassCard({ 
  reservation, 
  buildingName,
  floorName,
  onBookAnother, 
  onViewAll 
}) {
  const [copied, setCopied] = useState(false);

  if (!reservation) return null;

  const handleCopyId = () => {
    if (reservation?.id) {
      navigator.clipboard.writeText(reservation.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const calculateDurationHours = () => {
    if (!reservation?.startTime || !reservation?.endTime) return null;
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const diffHours = Math.round((end - start) / (1000 * 60 * 60));
    return diffHours > 0 ? diffHours : 1;
  };

  const durationHours = calculateDurationHours();

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Success Notification Banner */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-emerald-950 font-heading">
            Reservation Successfully Confirmed!
          </h3>
          <p className="text-xs text-emerald-800 mt-0.5">
            Your seat is reserved. Scan this digital QR pass upon arrival at the room entrance.
          </p>
        </div>
      </div>

      {/* Main Digital Boarding Pass */}
      <div className="bg-white rounded-[26px] border border-[#E8EBF2] shadow-[0_16px_50px_rgba(15,13,38,0.08)] overflow-hidden">
        {/* Pass Top Banner with Royal Dark Identity */}
        <div className="bg-gradient-to-r from-[#17143A] via-[#211B54] to-[#120F30] text-white p-6 sm:p-7 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#6850F4]/20 rounded-full blur-2xl pointer-events-none" />

          {/* SITTO Header & Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SITTOLogo variant="emblem" size="sm" showSubtitle={false} />
              <span className="text-xs font-bold font-heading text-white tracking-tight">SITTO</span>
            </div>
            
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-[#8B6BFF] uppercase tracking-wider border border-white/10">
              <Sparkles className="w-3 h-3 text-[#8B6BFF]" />
              <span>Verified Pass</span>
            </div>
          </div>

          <h2 className="text-2xl font-black font-heading text-white tracking-tight">
            {reservation.spaceName}
          </h2>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-purple-200/80 mt-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-[#8B6BFF] shrink-0" />
            <span>{buildingName || 'SRM KTR Campus'}</span>
            {floorName && (
              <>
                <span>&bull;</span>
                <span>{floorName}</span>
              </>
            )}
            <span>&bull;</span>
            <span className="font-mono text-purple-300">Room {reservation.spaceId}</span>
          </div>

          {/* Large Assigned Seat Badge */}
          <div className="mt-5 inline-flex flex-col items-center justify-center bg-white/15 backdrop-blur-md rounded-2xl px-8 py-3.5 border border-white/20 shadow-inner">
            <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">
              Assigned Seat
            </span>
            <span className="text-4xl font-black font-heading text-white mt-0.5 tracking-tight">
              {reservation.seatId}
            </span>
          </div>
        </div>

        {/* Ticket Perforation / Notch Divider */}
        <div className="relative h-6 bg-white flex items-center justify-center">
          <div className="absolute -left-3 w-6 h-6 rounded-full bg-[#F7F8FC] border-r border-[#E8EBF2]" />
          <div className="w-full border-t-2 border-dashed border-gray-200 mx-4" />
          <div className="absolute -right-3 w-6 h-6 rounded-full bg-[#F7F8FC] border-l border-[#E8EBF2]" />
        </div>

        {/* Pass QR Code Body */}
        <div className="p-6 sm:p-7 pt-2 space-y-6">
          <div className="flex flex-col items-center justify-center">
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(15,13,38,0.06)] flex flex-col items-center">
              {reservation.qrToken ? (
                <QRCodeSVG 
                  value={reservation.qrToken} 
                  size={200}
                  level="H"
                  includeMargin={false}
                  fgColor="#0F0D26"
                  bgColor="#FFFFFF"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl text-xs font-medium">
                  QR Token Pending...
                </div>
              )}
              <span className="text-[10px] font-mono text-gray-400 mt-3 select-none">
                SeatSure™ Entrance Verification QR
              </span>
            </div>

            {/* Reference ID Pill */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-mono font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                Ref: {reservation.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 rounded-md text-gray-400 hover:text-[#6850F4] hover:bg-purple-50 transition-colors"
                title="Copy Reservation Reference ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[11px] text-center text-gray-400 mt-1.5 max-w-xs">
              Present this pass to the door sensor or admin scanner upon entering the room.
            </p>
          </div>

          {/* Session Timing Details */}
          <div className="bg-[#F7F8FC] rounded-2xl p-4 sm:p-5 space-y-3 text-xs border border-[#E8EBF2]">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#6850F4]" />
                Scheduled Window
              </span>
              <span className="font-bold text-[#0F0D26]">
                {formatSessionDisplay(reservation.startTime, reservation.endTime)}
              </span>
            </div>

            {durationHours && (
              <div className="flex justify-between items-center text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6850F4]" />
                  Total Duration
                </span>
                <span className="font-semibold text-gray-800">
                  {durationHours} Hour{durationHours > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {reservation.checkInDeadline && (
              <div className="flex justify-between items-center text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                <span className="flex items-center font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                  Check-in Deadline
                </span>
                <span className="font-bold">{formatTime(reservation.checkInDeadline)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-gray-500 pt-1.5 border-t border-gray-200/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                SeatSure™ Protection
              </span>
              <span className="text-emerald-700 font-bold">
                15-Min Guard Active
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Button
              className="bg-[#6850F4] hover:bg-[#5840DC] text-white font-bold text-xs sm:text-sm h-11 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
              onClick={onViewAll}
            >
              <span>View All Bookings</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs sm:text-sm h-11 rounded-xl flex items-center justify-center gap-1.5"
              onClick={onBookAnother}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Book Another Seat</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmedPassCard;
