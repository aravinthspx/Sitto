import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from '../hooks/useNavigate';
import { useAuth } from '../hooks/useAuth';
import { getBuildings, getFloors, getSpaces } from '../services/buildingService';
import { getMyReservations } from '../services/reservationService';
import { getNotifications } from '../services/notificationService';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Building2, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle, 
  QrCode, 
  Bell, 
  ArrowRight, 
  MapPin, 
  Layers, 
  BookOpen, 
  Monitor, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  Compass, 
  Filter, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { formatTime, formatDate, formatSessionDisplay } from '../utils/time';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ─── Real Telemetry State ────────────────────────────────────────────────
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ─── Interactive Smart Seat Discovery State ──────────────────────────────
  const [selectedBuildingId, setSelectedBuildingId] = useState('ALL');
  const [selectedFloorId, setSelectedFloorId] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL'); // 'ALL', 'Lab', 'Library'
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [bookingDuration, setBookingDuration] = useState(1); // 1, 2, 3 hours

  // ─── Fetch All Real Data ──────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [bData, fData, sData, rData, nData] = await Promise.all([
        getBuildings().catch(() => []),
        getFloors().catch(() => []),
        getSpaces().catch(() => []),
        getMyReservations().catch(() => []),
        getNotifications().catch(() => []),
      ]);

      setBuildings(bData || []);
      setFloors(fData || []);
      setSpaces(sData || []);
      setMyReservations(rData || []);
      setNotifications(nData || []);
    } catch (err) {
      console.error('Failed to load student dashboard telemetry:', err);
      setError(err.message || 'Could not load campus live telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh telemetry every 30s
    const id = setInterval(() => fetchDashboardData(true), 30000);
    return () => clearInterval(id);
  }, [fetchDashboardData]);

  // Cascading reset: when building changes, reset floor if no longer valid
  const handleBuildingChange = (bId) => {
    setSelectedBuildingId(bId);
    setSelectedFloorId('ALL');
  };

  // Valid floors cascading based on selected building
  const availableFloors = useMemo(() => {
    if (selectedBuildingId === 'ALL') {
      return floors;
    }
    return floors.filter(f => f.buildingId === selectedBuildingId);
  }, [floors, selectedBuildingId]);

  // Derived floor-to-building mapping
  const floorMap = useMemo(() => {
    const map = {};
    for (const f of floors) {
      map[f.id] = f;
    }
    return map;
  }, [floors]);

  const buildingMap = useMemo(() => {
    const map = {};
    for (const b of buildings) {
      map[b.id] = b;
    }
    return map;
  }, [buildings]);

  // Active reservation: Look for an ongoing or upcoming reservation
  const activeReservation = useMemo(() => {
    if (!myReservations.length) return null;
    // Prefer CHECKED_IN or RESERVED status with latest/upcoming time
    const activeOnes = myReservations.filter(r => 
      r.status === 'CHECKED_IN' || r.status === 'RESERVED'
    );
    if (!activeOnes.length) return null;
    // Sort descending by start time
    return [...activeOnes].sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
  }, [myReservations]);

  // Real campus metric totals
  const totalConfiguredSeats = useMemo(() => {
    return spaces.reduce((sum, s) => sum + (Number(s.configuredSeats) || 0), 0);
  }, [spaces]);

  const totalAvailableSeats = useMemo(() => {
    return spaces.reduce((sum, s) => sum + (Number(s.availableSeats) || 0), 0);
  }, [spaces]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Filtered spaces according to discovery selection
  const filteredSpaces = useMemo(() => {
    return spaces.filter(space => {
      // 1. Building match
      if (selectedBuildingId !== 'ALL') {
        const floorObj = floorMap[space.floorId];
        if (!floorObj || floorObj.buildingId !== selectedBuildingId) {
          return false;
        }
      }

      // 2. Floor match
      if (selectedFloorId !== 'ALL' && space.floorId !== selectedFloorId) {
        return false;
      }

      // 3. Room type match (Lab vs Library)
      if (selectedType !== 'ALL') {
        const spaceType = (space.type || '').toLowerCase();
        if (selectedType.toLowerCase() !== spaceType) {
          return false;
        }
      }

      // 4. Available seats only
      if (onlyAvailable && (!space.availableSeats || space.availableSeats <= 0)) {
        return false;
      }

      // 5. Search query (matches room name or id)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (space.name || '').toLowerCase().includes(q);
        const matchesId = (space.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize spaces with seats configured & available first
      const aAvail = a.availableSeats || 0;
      const bAvail = b.availableSeats || 0;
      return bAvail - aAvail;
    });
  }, [spaces, selectedBuildingId, selectedFloorId, selectedType, onlyAvailable, searchQuery, floorMap]);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="space-y-8 pb-12">
      {/* ─── 1. PREMIUM WELCOME HERO ────────────────────────────────────────── */}
      <section className="liquid-dark relative overflow-hidden rounded-[24px] text-white p-6 sm:p-8 lg:p-10">
        {/* Subtle Ambient Shapes */}
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-[#6850F4]/20 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-[#8B5CF6]/15 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-[#8B6BFF]">
              <Sparkles className="w-3.5 h-3.5 text-[#8B6BFF]" />
              <span>SITTO Student Space Hub</span>
              <span>•</span>
              <span className="text-gray-300 font-medium">SRM KTR Campus</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-white leading-tight">
              Your Seat. Your Space.
            </h1>

            <p className="text-base sm:text-lg text-gray-300 font-normal leading-relaxed">
              Welcome back, <span className="font-semibold text-white">{displayName}</span>. Find your perfect study spot across SRM KTR libraries and labs with real-time seat availability.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={() => {
                  const el = document.getElementById('seat-discovery-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#6850F4] hover:bg-[#5840DC] text-white font-semibold h-11 px-6 rounded-xl shadow-[0_4px_16px_rgba(104,80,244,0.4)] transition-all hover:-translate-y-0.5"
              >
                <Search className="w-4 h-4 mr-2" />
                Find a Seat
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/reservations')}
                className="bg-white/10 hover:bg-white/15 text-white border-white/20 font-semibold h-11 px-6 rounded-xl transition-all"
              >
                <Calendar className="w-4 h-4 mr-2" />
                My Reservations
              </Button>
            </div>
          </div>

          {/* Mini Live Telemetry Badge */}
          <div className="hidden lg:flex flex-col items-end text-right space-y-2 border-l border-white/10 pl-8">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Campus Telemetry</div>
            <div className="text-2xl font-bold font-heading text-white flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] mr-2.5 animate-pulse" />
              {totalAvailableSeats} Available
            </div>
            <div className="text-xs text-gray-400">
              across {spaces.length} labs & reading halls
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="text-xs text-gray-400 hover:text-white hover:bg-white/10 h-8 px-2.5 rounded-lg mt-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Feed'}
            </Button>
          </div>
        </div>
      </section>

      {/* ─── 2. QUICK STATUS CARDS ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Available Seats */}
        <Card className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(15,13,38,0.04)] hover:border-[#6850F4]/30 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Available Seats</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F0D26] mt-1.5">
                {totalAvailableSeats}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                of <span className="font-semibold text-gray-700">{totalConfiguredSeats}</span> campus total
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#10b981] flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Occupancy rate</span>
            <span className="font-bold text-[#0F0D26]">
              {totalConfiguredSeats > 0 
                ? `${Math.round(((totalConfiguredSeats - totalAvailableSeats) / totalConfiguredSeats) * 100)}%` 
                : '0%'}
            </span>
          </div>
        </Card>

        {/* Card 2: My Active Reservation */}
        <Card className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(15,13,38,0.04)] hover:border-[#6850F4]/30 transition-all">
          <div className="flex items-start justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Reservation</p>
              {activeReservation ? (
                <>
                  <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-[#6850F4] mt-1.5 truncate">
                    Seat {activeReservation.seatId}
                  </h3>
                  <p className="text-xs text-gray-600 font-medium truncate mt-0.5">
                    {activeReservation.spaceName}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold font-heading text-gray-400 mt-2">
                    No active booking
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Ready to book a seat</p>
                </>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#F1EDFF] text-[#6850F4] flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            {activeReservation ? (
              <>
                <StatusBadge status={activeReservation.status} />
                <button 
                  onClick={() => navigate(`/reservations/${activeReservation.id}/pass`)}
                  className="font-semibold text-[#6850F4] hover:underline"
                >
                  View Details →
                </button>
              </>
            ) : (
              <span className="text-gray-400">Campus spaces open</span>
            )}
          </div>
        </Card>

        {/* Card 3: My QR Pass */}
        <Card className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(15,13,38,0.04)] hover:border-[#6850F4]/30 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">My QR Pass</p>
              {activeReservation ? (
                <>
                  <h3 className="text-lg font-extrabold font-heading text-[#0F0D26] mt-1.5">
                    Ready to Scan
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    {activeReservation.id}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold font-heading text-gray-400 mt-2">
                    No Pass Active
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Check-in at entrance</p>
                </>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-[#6850F4] flex items-center justify-center shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            {activeReservation ? (
              <button 
                onClick={() => navigate(`/reservations/${activeReservation.id}/pass`)}
                className="w-full flex items-center justify-between font-bold text-[#6850F4] hover:underline"
              >
                <span>Open Digital Pass</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-gray-400">Generate pass via booking</span>
            )}
          </div>
        </Card>

        {/* Card 4: Unread Notifications */}
        <Card className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(15,13,38,0.04)] hover:border-[#6850F4]/30 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notifications</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#0F0D26] mt-1.5">
                {unreadNotifCount}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {unreadNotifCount === 1 ? 'Unread prompt' : 'Unread updates'}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">SeatSure™ & reminders</span>
            <button
              onClick={() => navigate('/notifications')}
              className="font-semibold text-[#6850F4] hover:underline"
            >
              Open Inbox →
            </button>
          </div>
        </Card>
      </section>

      {/* ─── 3. SMART SEAT DISCOVERY & CASCADING FILTERS ─────────────────────── */}
      <section id="seat-discovery-section" className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-[#6850F4]" />
              <h2 className="text-2xl font-extrabold font-heading text-[#0F0D26]">Smart Seat Discovery</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Select building, floor, space type, and duration to find live configured seats.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-[#10b981]" />
            <span>Showing {filteredSpaces.length} matching spaces</span>
          </div>
        </div>

        {/* Discovery Filter Controls Panel */}
        <div className="bg-white rounded-[22px] border border-[#E8EBF2] p-5 sm:p-6 shadow-[0_4px_24px_rgba(15,13,38,0.03)] space-y-5">
          {/* Row 1: Search & Cascading Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Search Space or Code
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Lab 4, Reading Zone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-sm bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6850F4]/30 focus:border-[#6850F4] transition-all"
                />
              </div>
            </div>

            {/* Cascading Building Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Building Block
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedBuildingId}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 text-sm bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6850F4]/30 focus:border-[#6850F4] appearance-none cursor-pointer transition-all font-medium text-gray-800"
                >
                  <option value="ALL">All Campus Buildings</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>

            {/* Cascading Floor Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Floor Level
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedFloorId}
                  onChange={(e) => setSelectedFloorId(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 text-sm bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6850F4]/30 focus:border-[#6850F4] appearance-none cursor-pointer transition-all font-medium text-gray-800"
                >
                  <option value="ALL">All Available Floors</option>
                  {availableFloors.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
            </div>

            {/* Space Type Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Room Type
              </label>
              <div className="flex h-10 bg-gray-100/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedType('ALL')}
                  className={`flex-1 text-xs font-bold rounded-lg transition-all ${
                    selectedType === 'ALL'
                      ? 'bg-white text-[#6850F4] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('Lab')}
                  className={`flex-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    selectedType === 'Lab'
                      ? 'bg-white text-[#6850F4] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Lab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('Library')}
                  className={`flex-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    selectedType === 'Library'
                      ? 'bg-white text-[#6850F4] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Library</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Duration Selector & Fast Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
            {/* Preferred Duration 1, 2, or 3 Hours */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                Booking Duration:
              </span>
              {[1, 2, 3].map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setBookingDuration(h)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    bookingDuration === h
                      ? 'bg-[#F1EDFF] border-[#6850F4] text-[#6850F4] shadow-xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {h} {h === 1 ? 'Hour' : 'Hours'}
                </button>
              ))}
            </div>

            {/* Available Only Filter & Clear Filters */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-[#6850F4] focus:ring-[#6850F4] border-gray-300 cursor-pointer"
                />
                <span>Only rooms with free seats</span>
              </label>

              {(selectedBuildingId !== 'ALL' || selectedFloorId !== 'ALL' || selectedType !== 'ALL' || searchQuery || onlyAvailable) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBuildingId('ALL');
                    setSelectedFloorId('ALL');
                    setSelectedType('ALL');
                    setSearchQuery('');
                    setOnlyAvailable(false);
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── 4. ROOM DISCOVERY CARDS ───────────────────────────────────────── */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 rounded-[22px] bg-white border border-gray-100 p-6 animate-pulse" />
              ))}
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="bg-white rounded-[22px] border border-dashed border-gray-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-heading text-[#0F0D26]">No campus spaces match this criteria</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Try selecting "All Campus Buildings", removing the availability filter, or adjusting your search term.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBuildingId('ALL');
                  setSelectedFloorId('ALL');
                  setSelectedType('ALL');
                  setSearchQuery('');
                  setOnlyAvailable(false);
                }}
                className="mt-2 text-xs font-semibold text-[#6850F4] border-[#6850F4]"
              >
                Reset Search Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredSpaces.map(space => {
                const floorObj = floorMap[space.floorId];
                const buildingObj = floorObj ? buildingMap[floorObj.buildingId] : null;
                const totalSeats = space.configuredSeats || space.capacity || 0;
                const availableSeats = space.availableSeats !== undefined ? space.availableSeats : totalSeats;
                const percentAvailable = totalSeats > 0 ? Math.round((availableSeats / totalSeats) * 100) : 0;
                const isLab = (space.type || '').toLowerCase() === 'lab';

                return (
                  <Card
                    key={space.id}
                    className="group rounded-[22px] border border-[#E8EBF2] bg-white overflow-hidden shadow-[0_4px_20px_rgba(15,13,38,0.03)] hover:shadow-[0_12px_32px_rgba(104,80,244,0.12)] hover:border-[#6850F4]/40 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Card Banner */}
                      <div className="p-5 pb-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/60 to-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isLab ? 'bg-[#F1EDFF] text-[#6850F4]' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {isLab ? <Monitor className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                            </div>
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                {space.type || 'Room'}
                              </span>
                              <h3 className="text-lg font-bold font-heading text-[#0F0D26] group-hover:text-[#6850F4] transition-colors leading-tight">
                                {space.name}
                              </h3>
                            </div>
                          </div>

                          {/* Free seats pill */}
                          <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            availableSeats > 0 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {availableSeats > 0 ? `${availableSeats} Free` : 'Full'}
                          </div>
                        </div>

                        {/* Building & Floor Breadcrumbs */}
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-3">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{buildingObj?.name || 'SRM KTR'}</span>
                          <span>•</span>
                          <span className="truncate">{floorObj?.name || `Floor ${space.floorId}`}</span>
                        </div>
                      </div>

                      {/* Seat Availability Bar */}
                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-gray-500">Live Availability</span>
                          <span className="font-bold text-[#0F0D26]">
                            {availableSeats} / {totalSeats} seats
                          </span>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentAvailable > 50 
                                ? 'bg-[#10b981]' 
                                : percentAvailable > 20 
                                  ? 'bg-[#f59e0b]' 
                                  : 'bg-[#ef4444]'
                            }`}
                            style={{ width: `${Math.max(4, percentAvailable)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                          <span>Code: {space.id}</span>
                          <span className="font-medium text-emerald-600">{percentAvailable}% available</span>
                        </div>
                      </div>
                    </div>

                    {/* View Seats CTA */}
                    <div className="p-5 pt-0">
                      <Button
                        onClick={() => navigate(`/space/${space.id}`)}
                        className={`w-full h-11 rounded-xl text-sm font-semibold transition-all ${
                          availableSeats > 0
                            ? 'bg-[#6850F4] hover:bg-[#5840DC] text-white shadow-[0_4px_14px_rgba(104,80,244,0.25)]'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        }`}
                      >
                        <span>View Seats & Reserve</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ─── 5. RECENT MY RESERVATIONS STRIP ─────────────────────────────────── */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold font-heading text-[#0F0D26]">My Bookings</h2>
            <p className="text-sm text-gray-500 mt-0.5">Quick access to your active and past reservations</p>
          </div>
          <Link
            to="/reservations"
            className="text-sm font-bold text-[#6850F4] hover:underline flex items-center"
          >
            <span>View All ({myReservations.length})</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {myReservations.length === 0 ? (
          <div className="bg-white rounded-[22px] border border-gray-100 p-8 text-center text-sm text-gray-500 shadow-xs">
            No bookings made yet. Choose an available space above to reserve your study seat!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myReservations.slice(0, 3).map(res => (
              <Card
                key={res.id}
                className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-[0_4px_20px_rgba(15,13,38,0.03)] hover:border-[#6850F4]/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-base text-[#0F0D26]">{res.spaceName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Seat <span className="font-bold text-[#6850F4]">{res.seatId}</span></p>
                    </div>
                    <StatusBadge status={res.status} />
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 bg-gray-50/70 rounded-xl p-3 my-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Session</span>
                      <span className="font-semibold text-gray-800">{formatSessionDisplay(res.startTime, res.endTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pass Reference</span>
                      <span className="font-mono text-[11px] text-gray-700">{res.id}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/reservations/${res.id}/pass`)}
                  className="w-full mt-2 h-9 text-xs font-semibold border-gray-200 text-gray-700 hover:text-[#6850F4] hover:border-[#6850F4]/50 rounded-xl"
                >
                  <QrCode className="w-3.5 h-3.5 mr-2 text-[#6850F4]" />
                  Open QR Pass
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ─── 6. STUDENT NOTIFICATIONS & SEATSURE PREVIEW ───────────────────── */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold font-heading text-[#0F0D26]">Live Notifications & Reminders</h2>
            <p className="text-sm text-gray-500 mt-0.5">SeatSure™ verification prompts and reservation confirmations</p>
          </div>
          <Link
            to="/notifications"
            className="text-sm font-bold text-[#6850F4] hover:underline flex items-center"
          >
            <span>Notification Center</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-[22px] border border-gray-100 p-8 text-center text-sm text-gray-500 shadow-xs">
            You're all caught up! No pending notifications.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notifications.slice(0, 3).map(notif => (
              <Card
                key={notif.id}
                className={`rounded-[20px] border p-4 transition-all shadow-[0_2px_12px_rgba(15,13,38,0.03)] ${
                  !notif.isRead 
                    ? 'border-[#6850F4]/25 bg-white ring-1 ring-[#6850F4]/10' 
                    : 'border-gray-100 bg-white/80 opacity-90'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-[#F1EDFF] text-[#6850F4] shrink-0 mt-0.5">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#0F0D26] truncate">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#6850F4] shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2.5 pt-2 border-t border-gray-100">
                      <span>{formatTime(notif.createdAt)}</span>
                      <button 
                        onClick={() => navigate('/notifications')}
                        className="text-[#6850F4] hover:underline font-semibold"
                      >
                        Respond →
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
