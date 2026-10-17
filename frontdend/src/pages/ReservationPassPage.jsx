import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from '../hooks/useNavigate';
import { QRCodeSVG } from 'qrcode.react';
import { getReservation, cancelReservation } from '../services/reservationService';
import { getBuildings, getFloors, getSpaces } from '../services/buildingService';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { BookingStepProgress } from '../components/common/BookingStepProgress';
import SITTOLogo from '../components/common/SITTOLogo';
import { formatTime, formatDate, formatSessionDisplay } from '../utils/time';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Building2,
  Share2,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

export function ReservationPassPage() {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  // Additional resolved metadata for building and floor
  const [buildingName, setBuildingName] = useState(null);
  const [floorName, setFloorName] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReservation(reservationId);
        if (!isMounted) return;
        setReservation(data);

        // Fetch location metadata (building, floor)
        try {
          const [allBuildings, allSpaces] = await Promise.all([
            getBuildings().catch(() => []),
            getSpaces().catch(() => [])
          ]);
          const currentSpace = allSpaces.find(s => s.id === data.spaceId);
          if (currentSpace) {
            const allFloors = await getFloors().catch(() => []);
            const currentFloor = allFloors.find(f => f.id === currentSpace.floorId);
            const currentBuilding = allBuildings.find(b => b.id === currentFloor?.buildingId);
            if (isMounted) {
              if (currentBuilding) setBuildingName(currentBuilding.name);
              if (currentFloor) setFloorName(currentFloor.name);
            }
          }
        } catch (metaErr) {
          console.warn('Metadata resolution non-critical error:', metaErr);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load reservation pass');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRes();
    return () => { isMounted = false; };
  }, [reservationId]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this reservation? The seat will be released immediately.')) return;
    try {
      setCancelling(true);
      await cancelReservation(reservationId);
      navigate('/reservations');
    } catch (err) {
      alert(err.message || 'Failed to cancel');
      setCancelling(false);
    }
  };

  const handleCopyId = () => {
    if (reservation?.id) {
      navigator.clipboard.writeText(reservation.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Calculate booking duration in hours
  const calculateDurationHours = () => {
    if (!reservation?.startTime || !reservation?.endTime) return null;
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const diffHours = Math.round((end - start) / (1000 * 60 * 60));
    return diffHours > 0 ? diffHours : 1;
  };

  const durationHours = calculateDurationHours();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Spinner className="w-10 h-10 text-[#6850F4]" />
        <p className="text-sm font-semibold text-gray-500">Retrieving SITTO Digital Seat Pass...</p>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <ErrorState message={error || 'Reservation not found'} onRetry={() => navigate('/reservations')} />
      </div>
    );
  }

  const isConfirmed = reservation.status === 'RESERVED';
  const isCheckedIn = reservation.status === 'CHECKED_IN';
  const isCancelled = reservation.status === 'CANCELLED';
  const isExpired = reservation.status === 'EXPIRED';
  const isCompleted = reservation.status === 'COMPLETED';

  return (
    <div className="max-w-md mx-auto space-y-6 pb-16">
      {/* ─── Compact Step Progress Indicator (Step 4 Complete) ─────────────── */}
      <BookingStepProgress 
        currentStep={4} 
        onStepClick={(step) => {
          if (step === 1) navigate('/campus');
          else if (step === 2 || step === 3) navigate(`/space/${reservation.spaceId}`);
        }}
      />

      {/* ─── Top Bar Navigation ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/reservations')} 
            className="bg-white hover:bg-gray-100 rounded-xl shadow-xs shrink-0 h-10 w-10 border border-gray-200"
            title="Back to all reservations"
          >
            <ArrowLeft className="w-5 h-5 text-[#0F0D26]" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-heading text-[#0F0D26]">
              Digital Seat Pass
            </h1>
            <p className="text-xs text-gray-500">SRM KTR Campus Seating</p>
          </div>
        </div>

        <StatusBadge status={reservation.status} />
      </div>

      {/* ─── Main Digital Boarding Pass ──────────────────────────────────────── */}
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

          {/* Space / Lab Name */}
          <h2 className="text-2xl font-black font-heading text-white tracking-tight">
            {reservation.spaceName}
          </h2>
          
          {/* Building, Floor & Code Breadcrumbs */}
          <div className="flex items-center justify-center space-x-2 text-xs text-purple-200/80 mt-1.5 flex-wrap">
            <MapPin className="w-3.5 h-3.5 text-[#8B6BFF] shrink-0" />
            <span>{buildingName || 'SRM KTR Campus'}</span>
            <span>&bull;</span>
            <span>{floorName || 'Floor Level'}</span>
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
          {/* High-Contrast QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-5 bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(15,13,38,0.06)] flex flex-col items-center">
              {reservation.qrToken && !isCancelled && !isExpired ? (
                <QRCodeSVG 
                  value={reservation.qrToken} 
                  size={200}
                  level="H"
                  includeMargin={false}
                  fgColor="#0F0D26"
                  bgColor="#FFFFFF"
                />
              ) : isCancelled || isExpired ? (
                <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl text-center p-4">
                  <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs font-bold text-gray-600">
                    Pass Inactive ({reservation.status})
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">
                    Seat released to public campus pool
                  </span>
                </div>
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl text-xs font-medium">
                  QR Token Pending...
                </div>
              )}

              <span className="text-[10px] font-mono text-gray-400 mt-3 select-none">
                SeatSure™ Entrance Verification QR
              </span>
            </div>

            {/* Reference & Copy ID */}
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
              Present this code to the door sensor or admin scanner upon entering the room.
            </p>
          </div>

          {/* Session Timing & Status Details */}
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

            {/* 15-Minute Check-in Window Notice */}
            {reservation.checkInDeadline && isConfirmed && (
              <div className="flex justify-between items-center text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                <span className="flex items-center font-medium">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                  Check-in Deadline
                </span>
                <span className="font-bold">{formatTime(reservation.checkInDeadline)}</span>
              </div>
            )}

            {/* SeatSure Telemetry Status */}
            <div className="flex justify-between items-center text-gray-500 pt-1.5 border-t border-gray-200/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                SeatSure™ Protection
              </span>
              <span className="text-emerald-700 font-bold">
                {isCheckedIn ? 'Presence Verified ✓' : isConfirmed ? '15-Min Guard Active' : 'Session Inactive'}
              </span>
            </div>
          </div>

          {/* Cancellation Option */}
          {isConfirmed && (
            <div className="pt-1">
              <Button 
                variant="destructive" 
                className="w-full rounded-xl h-11 text-xs sm:text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 shadow-2xs cursor-pointer" 
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling Reservation...' : 'Cancel Reservation & Release Seat'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReservationPassPage;
