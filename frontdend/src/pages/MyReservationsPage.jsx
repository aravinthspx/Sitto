import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { getMyReservations, cancelReservation } from '../services/reservationService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate, formatTime, formatSessionDisplay } from '../utils/time';
import { 
  Calendar, 
  QrCode, 
  Clock, 
  ArrowLeft, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { ReservationPassPage } from './ReservationPassPage';

export function ReservationsList() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL', 'ACTIVE', 'PAST'

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyReservations();
      // sort descending by start time
      setReservations(data.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
    } catch (err) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelBooking = async (resId, e) => {
    e.stopPropagation();
    if (!window.confirm('Cancel this reservation? Your seat will be made available to other students immediately.')) {
      return;
    }
    try {
      setCancellingId(resId);
      await cancelReservation(resId);
      fetchData();
    } catch (err) {
      alert(err.message || 'Cancellation failed');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredReservations = reservations.filter(r => {
    const isActive = r.status === 'RESERVED' || r.status === 'CHECKED_IN';
    if (filterTab === 'ACTIVE') return isActive;
    if (filterTab === 'PAST') return !isActive;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-44 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-[22px] bg-white border border-gray-100 p-6 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-5 w-40 bg-gray-200 rounded-md" />
                <div className="h-6 w-24 bg-gray-100 rounded-full" />
              </div>
              <div className="h-4 w-60 bg-gray-100 rounded-md" />
              <div className="h-10 w-full bg-gray-50 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-lg mx-auto text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h3 className="font-bold">Failed to load reservations</h3>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchData} variant="outline" size="sm" className="mt-2 border-red-200">
          Try Again
        </Button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#F1EDFF] text-[#6850F4] flex items-center justify-center mx-auto shadow-xs">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold font-heading text-[#0F0D26]">No Bookings Yet</h2>
        <p className="text-sm text-gray-500">
          You haven't reserved any study seats on campus yet. Explore available computer labs and library reading zones.
        </p>
        <Button
          onClick={() => navigate('/campus')}
          className="bg-[#6850F4] hover:bg-[#5840DC] text-white font-semibold rounded-xl px-6 h-11"
        >
          Find a Seat
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#6850F4]" />
            <h1 className="text-3xl font-extrabold font-heading tracking-tight text-[#0F0D26]">
              My Reservations
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Manage your campus bookings, access your QR digital entry passes, and verify attendance.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'ALL' ? 'bg-[#F1EDFF] text-[#6850F4]' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({reservations.length})
          </button>
          <button
            onClick={() => setFilterTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'ACTIVE' ? 'bg-[#F1EDFF] text-[#6850F4]' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Active ({reservations.filter(r => r.status === 'RESERVED' || r.status === 'CHECKED_IN').length})
          </button>
          <button
            onClick={() => setFilterTab('PAST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterTab === 'PAST' ? 'bg-[#F1EDFF] text-[#6850F4]' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Past ({reservations.filter(r => r.status !== 'RESERVED' && r.status !== 'CHECKED_IN').length})
          </button>
        </div>
      </div>

      {/* Grid of Reservation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReservations.map(res => {
          const isActive = res.status === 'RESERVED' || res.status === 'CHECKED_IN';
          const isCancelling = cancellingId === res.id;

          return (
            <Card
              key={res.id}
              className={`rounded-[22px] bg-white border transition-all duration-200 shadow-[0_4px_20px_rgba(15,13,38,0.03)] hover:shadow-[0_8px_30px_rgba(104,80,244,0.1)] flex flex-col justify-between overflow-hidden ${
                isActive ? 'border-[#6850F4]/30 ring-1 ring-[#6850F4]/10' : 'border-gray-200/80 opacity-90'
              }`}
            >
              <div>
                {/* Header banner */}
                <div className={`p-5 pb-4 border-b ${
                  isActive ? 'bg-gradient-to-r from-[#F1EDFF]/60 to-white border-[#6850F4]/15' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        {res.spaceId}
                      </span>
                      <h3 className="text-lg font-bold font-heading text-[#0F0D26] leading-tight">
                        {res.spaceName}
                      </h3>
                      <div className="flex items-center space-x-1.5 text-xs text-gray-500 mt-1">
                        <span>Seat:</span>
                        <span className="font-extrabold text-[#6850F4]">{res.seatId}</span>
                      </div>
                    </div>
                    <StatusBadge status={res.status} />
                  </div>
                </div>

                {/* Session Details */}
                <div className="p-5 space-y-3">
                  <div className="bg-[#F7F8FC] rounded-xl p-3.5 space-y-2.5 text-xs border border-gray-100">
                    <div className="flex justify-between items-center text-gray-600">
                      <span className="text-gray-400 font-medium">Session Schedule:</span>
                      <span className="font-bold text-[#0F0D26]">
                        {formatSessionDisplay(res.startTime, res.endTime)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-gray-600">
                      <span className="text-gray-400 font-medium">Pass Ref:</span>
                      <span className="font-mono text-xs font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-100">{res.id}</span>
                    </div>

                    {res.checkInDeadline && res.status === 'RESERVED' && (
                      <div className="flex justify-between items-center text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/70">
                        <span className="flex items-center font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" /> Check-in deadline:
                        </span>
                        <span className="font-bold">{formatTime(res.checkInDeadline)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-5 pt-0 flex gap-2">
                <Button
                  onClick={() => navigate(`/reservations/${res.id}/pass`)}
                  className={`flex-1 h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-[#6850F4] hover:bg-[#5840DC] text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>View QR Pass</span>
                </Button>

                {res.status === 'RESERVED' && (
                  <Button
                    variant="outline"
                    onClick={(e) => handleCancelBooking(res.id, e)}
                    disabled={isCancelling}
                    className="h-11 px-3 text-xs font-semibold rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    title="Cancel reservation"
                  >
                    {isCancelling ? '...' : 'Cancel'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function MyReservationsPage() {
  return (
    <Routes>
      <Route path="/" element={<ReservationsList />} />
      <Route path="/:reservationId/pass" element={<ReservationPassPage />} />
    </Routes>
  );
}
