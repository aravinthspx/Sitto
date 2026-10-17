import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from '../hooks/useNavigate';
import { getSeatMap } from '../services/seatService';
import { createReservation } from '../services/reservationService';
import { getBuildings, getFloors, getSpaces } from '../services/buildingService';
import { POLL_INTERVAL_MS } from '../services/config';
import { usePolling } from '../hooks/usePolling';
import { SeatGrid } from '../components/seats/SeatGrid';
import { SeatLegend } from '../components/seats/SeatLegend';
import { SeatDetailPanel } from '../components/seats/SeatDetailPanel';
import { BookingStepProgress } from '../components/common/BookingStepProgress';
import { ConfirmedPassCard } from '../components/reservations/ConfirmedPassCard';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { 
  ArrowLeft, 
  RefreshCw, 
  Building2, 
  Layers, 
  Sparkles, 
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatTime, generateBookingDates, generateSessionsForDate } from '../utils/time';
import { OPERATING_HOURS, SESSION_DURATION_MINS, BOOKING_DAYS_AHEAD } from '../utils/constants';

export function SpacePage() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  
  // Date and Session State
  const dates = useMemo(() => generateBookingDates(BOOKING_DAYS_AHEAD), []);
  const [selectedDateStr, setSelectedDateStr] = useState(dates[0].dateStr);
  
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const sessions = useMemo(() => generateSessionsForDate(selectedDateStr, OPERATING_HOURS, SESSION_DURATION_MINS), [selectedDateStr, tick]);
  
  // Default to first non-past session, or the first one if all are past
  const [selectedSessionId, setSelectedSessionId] = useState(() => {
    const firstAvailable = sessions.find(s => !s.isPast && !s.isFull);
    return firstAvailable ? firstAvailable.id : sessions[0].id;
  });
  
  const selectedSession = useMemo(() => sessions.find(s => s.id === selectedSessionId) || sessions[0], [sessions, selectedSessionId]);
  
  // Duration state: 1, 2, or 3 Hours
  const [duration, setDuration] = useState(1);

  // Auto-deselect expired selected slot
  useEffect(() => {
    if (selectedSession && selectedSession.isPast) {
      const firstAvailable = sessions.find(s => !s.isPast && !s.isFull);
      if (firstAvailable) {
        setSelectedSessionId(firstAvailable.id);
        setDuration(1);
      }
    }
  }, [selectedSession, sessions]);

  // Compute the actual end ISO based on selected duration
  const actualEndIso = useMemo(() => {
    if (!selectedSession) return null;
    const startDt = new Date(selectedSession.startIso);
    const endDt = new Date(startDt.getTime() + duration * 60 * 60 * 1000);
    return endDt.toISOString();
  }, [selectedSession, duration]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Selected seats state
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState(null);
  const [maxSeatsError, setMaxSeatsError] = useState(false);

  // Success state for Step 4
  const [confirmedReservation, setConfirmedReservation] = useState(null);

  // Building & Floor metadata
  const [metaLoading, setMetaLoading] = useState(false);
  const [buildingMeta, setBuildingMeta] = useState(null);
  const [floorMeta, setFloorMeta] = useState(null);

  // Interaction pause state
  const [isInteracting, setIsInteracting] = useState(false);
  const interactTimeoutRef = useRef(null);

  const dataRef = useRef(null);
  const isSubmitting = useRef(false);

  // Reset states when spaceId changes
  useEffect(() => {
    setSelectedSeats([]);
    setReservationError(null);
    setMaxSeatsError(false);
    setConfirmedReservation(null);
    dataRef.current = null;
    setData(null);
  }, [spaceId]);

  // Load building & floor metadata for breadcrumbs & Step 1 display
  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        setMetaLoading(true);
        const [allBuildings, allSpaces] = await Promise.all([
          getBuildings().catch(() => []),
          getSpaces().catch(() => [])
        ]);
        if (!isMounted) return;

        const currentSpace = allSpaces.find(s => s.id === spaceId);
        if (currentSpace) {
          const floors = await getFloors().catch(() => []);
          const currentFloor = floors.find(f => f.id === currentSpace.floorId);
          const currentBld = allBuildings.find(b => b.id === currentFloor?.buildingId);
          if (isMounted) {
            setBuildingMeta(currentBld || null);
            setFloorMeta(currentFloor || null);
          }
        }
      } catch (e) {
        console.warn('Metadata resolution non-critical error:', e);
      } finally {
        if (isMounted) setMetaLoading(false);
      }
    }
    loadMetadata();
    return () => { isMounted = false; };
  }, [spaceId]);

  // When date changes, reset to the best session
  const handleDateChange = (dateStr) => {
    setSelectedDateStr(dateStr);
    const newSessions = generateSessionsForDate(dateStr, OPERATING_HOURS, SESSION_DURATION_MINS);
    const firstAvailable = newSessions.find(s => !s.isPast && !s.isFull);
    setSelectedSessionId(firstAvailable ? firstAvailable.id : newSessions[0].id);
    setDuration(1);
  };

  const triggerInteraction = useCallback(() => {
    setIsInteracting(true);
    if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
    interactTimeoutRef.current = setTimeout(() => setIsInteracting(false), 3000);
  }, []);

  const fetchSeatMap = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const res = await getSeatMap(spaceId, selectedSession.startIso, actualEndIso);
      
      const seatsChanged = !dataRef.current || JSON.stringify(dataRef.current.seats) !== JSON.stringify(res.seats);

      if (seatsChanged) {
        dataRef.current = res;
        setData(res);
      }
      setLastUpdated(new Date().toISOString());
      
      // Check if selected seats are still available
      setSelectedSeats(prev => {
        if (prev.length === 0) return prev;
        const dropped = [];
        const kept = [];
        for (const s of prev) {
          const updatedSeat = res.seats.find(us => us.id === s.id);
          if (updatedSeat && updatedSeat.status === 'AVAILABLE') {
            kept.push(updatedSeat);
          } else {
            dropped.push(s.id);
          }
        }
        if (dropped.length > 0) {
          setTimeout(() => {
            setReservationError(`Seat(s) ${dropped.join(', ')} were reserved by another student and removed from selection.`);
          }, 0);
        }
        if (dropped.length > 0 || kept.some((k, i) => k.id !== prev[i].id)) {
          return kept;
        }
        return prev;
      });
    } catch (err) {
      setError(err.message || 'Failed to load seat map');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [spaceId, selectedSession.startIso, actualEndIso]);

  useEffect(() => {
    dataRef.current = null;
    fetchSeatMap(true);
  }, [fetchSeatMap]);

  usePolling(fetchSeatMap, POLL_INTERVAL_MS, isInteracting || isReserving || !!confirmedReservation);

  const handleSeatSelect = (seat) => {
    triggerInteraction();
    setError(null);
    setReservationError(null);
    
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      setMaxSeatsError(false);
    } else {
      if (selectedSeats.length >= 4) {
        setMaxSeatsError(true);
        setTimeout(() => setMaxSeatsError(false), 500);
        return;
      }
      setSelectedSeats(prev => [...prev, seat]);
    }
  };

  const handleRemoveSeat = (seatId) => {
    triggerInteraction();
    setSelectedSeats(prev => prev.filter(s => s.id !== seatId));
    setMaxSeatsError(false);
  };

  const handleReserve = async () => {
    if (isSubmitting.current || selectedSeats.length === 0) return;
    
    isSubmitting.current = true;
    setIsReserving(true);
    setReservationError(null);

    const results = [];
    const failed = [];
    
    for (const seat of selectedSeats) {
      try {
        const res = await createReservation({
          spaceId,
          seatId: seat.id,
          start: selectedSession.startIso,
          end: actualEndIso,
        });
        results.push(res);
      } catch (err) {
        failed.push({ id: seat.id, error: err.message });
      }
    }
    
    if (failed.length === 0) {
      // Successful reservation
      if (results.length === 1) {
        // Direct in-page transition to Step 4
        setConfirmedReservation(results[0]);
      } else {
        navigate('/reservations');
      }
    } else {
      // Partial or total failure
      if (results.length > 0) {
        setReservationError(`Reserved ${results.length} seat(s). Failed to reserve: ${failed.map(f => f.id).join(', ')}.`);
        setSelectedSeats(selectedSeats.filter(s => failed.some(f => f.id === s.id)));
      } else {
        setReservationError(failed[0].error || 'Reservation failed. The seat may have just been booked by another user.');
      }
      fetchSeatMap();
    }
    
    setIsReserving(false);
    isSubmitting.current = false;
  };

  // Availability statistics
  const availabilityStats = useMemo(() => {
    if (!data?.seats) return null;
    const total = data.seats.length;
    const available = data.seats.filter(s => s.status === 'AVAILABLE').length;
    const reserved = data.seats.filter(s => s.status === 'RESERVED').length;
    const occupied = data.seats.filter(s => s.status === 'OCCUPIED').length;
    const unverified = data.seats.filter(s => s.status === 'UNVERIFIED').length;
    return {
      total,
      available,
      reserved,
      occupied,
      unverified,
      selected: selectedSeats.length
    };
  }, [data, selectedSeats]);

  // Current active step calculation
  const currentStep = useMemo(() => {
    if (confirmedReservation) return 4;
    if (selectedSeats.length > 0) return 3;
    return 2;
  }, [confirmedReservation, selectedSeats]);

  const handleStepClick = (stepNumber) => {
    if (stepNumber === 1) {
      navigate('/campus');
    } else if (stepNumber === 2 && currentStep === 3) {
      setSelectedSeats([]);
    } else if (stepNumber === 2 && currentStep === 4) {
      setConfirmedReservation(null);
      setSelectedSeats([]);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Spinner className="w-10 h-10 text-[#6850F4]" />
        <p className="text-sm font-semibold text-gray-500">Loading SITTO Seat Map...</p>
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => fetchSeatMap(true)} />;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ─── Four-Step Progress Indicator ─────────────────────────────────── */}
      <BookingStepProgress 
        currentStep={currentStep} 
        onStepClick={handleStepClick}
      />

      {/* ─── Step 4 View: Confirmed Reservation QR Pass ─────────────────── */}
      {confirmedReservation ? (
        <ConfirmedPassCard 
          reservation={confirmedReservation}
          buildingName={buildingMeta?.name}
          floorName={floorMeta?.name || `Floor ${data?.floor || '1'}`}
          onBookAnother={() => {
            setConfirmedReservation(null);
            setSelectedSeats([]);
            fetchSeatMap(true);
          }}
          onViewAll={() => navigate('/reservations')}
        />
      ) : (
        /* ─── Steps 1, 2, 3: Location Bar, Seat Grid & Sticky Summary ────── */
        <>
          {/* Step 1 Location & Live Room Header */}
          <div className="bg-white rounded-2xl border border-[#E8EBF2] p-4 sm:p-5 shadow-[0_2px_12px_rgba(15,13,38,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/campus')} 
                className="shrink-0 h-10 w-10 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200"
                title="Change building or room"
              >
                <ArrowLeft className="w-5 h-5 text-[#0F0D26]" />
              </Button>
              
              <div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-bold text-[#6850F4] bg-[#F1EDFF] px-2 py-0.5 rounded-full">
                    Step 1 Selected
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-600 font-medium">
                    {buildingMeta?.name || 'SRM KTR Campus'} &rsaquo; Floor {data?.floor || floorMeta?.name || '1'}
                  </span>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-black font-heading text-[#0F0D26] tracking-tight mt-0.5">
                  {data?.spaceName || 'Seat Map'}
                </h1>
              </div>
            </div>
            
            {/* Real Room Availability Pill */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {availabilityStats && (
                <div className="flex items-center gap-2 bg-[#F7F8FC] px-3.5 py-1.5 rounded-xl border border-[#E8EBF2] text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-emerald-700">
                    {availabilityStats.available} Available
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-500">
                    {availabilityStats.total} Total Seats
                  </span>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchSeatMap(true)} 
                disabled={loading}
                className="rounded-xl h-9 text-xs border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </Button>
            </div>
          </div>

          {/* Main 2-Column Booking Interface */}
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Left 2 Cols: Step 2 Seat Grid & Legend */}
            <div className="lg:col-span-2 space-y-4">
              <SeatLegend availabilityStats={availabilityStats} />

              <div className="relative">
                {loading && data && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-[24px]">
                    <Spinner className="w-8 h-8 text-[#6850F4]" />
                  </div>
                )}
                
                <SeatGrid 
                  seats={data?.seats} 
                  selectedSeats={selectedSeats}
                  onSeatSelect={handleSeatSelect}
                  onPointerInteraction={triggerInteraction}
                />
              </div>
            </div>
            
            {/* Right Column: Step 3 Sticky Desktop Booking Summary */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-20 space-y-4">
                <SeatDetailPanel 
                  spaceName={data?.spaceName}
                  buildingName={buildingMeta?.name}
                  floorName={`Floor ${data?.floor || '1'}`}
                  selectedSeats={selectedSeats}
                  onReserve={handleReserve}
                  onCancel={() => {
                    setSelectedSeats([]);
                    setReservationError(null);
                  }}
                  onRemoveSeat={handleRemoveSeat}
                  isReserving={isReserving}
                  maxSeatsError={maxSeatsError}
                  
                  dates={dates}
                  selectedDateStr={selectedDateStr}
                  onDateChange={handleDateChange}
                  sessions={sessions}
                  selectedSession={selectedSession}
                  onSessionChange={(id) => { setSelectedSessionId(id); setDuration(1); }}
                  duration={duration}
                  onDurationChange={setDuration}
                  actualEndIso={actualEndIso}
                  reservationError={reservationError}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SpacePage;
