import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  QrCode,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  Building,
  Activity,
  DoorOpen,
  PieChart as PieChartIcon,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  ExternalLink,
  Filter,
  Check,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/apiClient';

// Unified Percentage Formatter: 2 decimal places when 0 < val < 1%
const formatPercentage = (value, total) => {
  if (!total || total === 0 || !value || value === 0) return '0%';
  const pct = (value / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(1)}%`;
};

// Safe Percentage Number for styles
const getPercentageNum = (value, total) => {
  if (!total || total === 0 || !value || value === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
};

// Premium Custom Dropdown Component
function FilterDropdown({ label, value, options, onChange, allLabel = 'All', icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentOption = options.find(o => o.value === value);
  const displayLabel = currentOption ? currentOption.label : allLabel;
  const isSelected = value !== 'ALL';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`h-9 px-3 text-xs rounded-xl font-medium border flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs whitespace-nowrap min-w-[130px] sm:min-w-[145px] ${
          isSelected
            ? 'bg-[#6850F4]/10 border-[#6850F4] text-[#6850F4] font-semibold ring-1 ring-[#6850F4]/30'
            : 'bg-white hover:bg-[#F6F7FB] border-[#E5E7EB] text-gray-700 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#6850F4]' : 'text-gray-400'}`} />}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#6850F4]' : 'text-gray-400'}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white border border-[#E5E7EB] shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            {label}
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange('ALL');
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#F6F7FB] transition cursor-pointer ${
                value === 'ALL' ? 'text-[#6850F4] font-bold bg-[#6850F4]/5' : 'text-gray-700'
              }`}
            >
              <span>{allLabel}</span>
              {value === 'ALL' && <Check className="w-3.5 h-3.5 text-[#6850F4]" />}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#F6F7FB] transition cursor-pointer ${
                  value === opt.value ? 'text-[#6850F4] font-bold bg-[#6850F4]/5' : 'text-gray-700'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-[#6850F4]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsible sidebar & panel states
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Core Data States
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({
    summary: {
      total: 0,
      occupied: 0,
      reserved: 0,
      available: 0,
      unverified: 0
    },
    rooms: []
  });
  const [notifications, setNotifications] = useState([]);

  // Filtering States
  const [selectedBuilding, setSelectedBuilding] = useState('ALL');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedRoomType, setSelectedRoomType] = useState('ALL');
  const [selectedOccupancy, setSelectedOccupancy] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Table Sorting State
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Selected Room Inspection Modal
  const [selectedRoomModal, setSelectedRoomModal] = useState(null);
  const [roomModalLoading, setRoomModalLoading] = useState(false);
  const [roomModalDetails, setRoomModalDetails] = useState(null);

  // Live Feed Expanded Messages State
  const [expandedNotifications, setExpandedNotifications] = useState({});

  // Fetch Live Feed
  const loadNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      if (res && res.notifications) {
        setNotifications(res.notifications);
      } else if (Array.isArray(res)) {
        setNotifications(res);
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err);
    }
  };

  // Fetch Dashboard Stats
  const loadDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await apiClient.get('/admin/dashboard');
      if (res) {
        setData({
          summary: res.summary || {},
          rooms: res.rooms || []
        });
      }
      await loadNotifications();
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard(false);
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  // Inspect Room Details Modal
  const openRoomModal = async (roomId) => {
    setSelectedRoomModal(roomId);
    setRoomModalLoading(true);
    try {
      const details = await apiClient.get(`/admin/rooms/${roomId}`);
      setRoomModalDetails(details);
    } catch (err) {
      console.error('Error fetching room detail:', err);
    } finally {
      setRoomModalLoading(false);
    }
  };

  const closeRoomModal = () => {
    setSelectedRoomModal(null);
    setRoomModalDetails(null);
  };

  const toggleExpandNotification = (id) => {
    setExpandedNotifications(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Derived building options
  const buildingOptions = useMemo(() => {
    const bSet = new Set();
    data.rooms.forEach(r => {
      if (r.building) bSet.add(r.building);
    });
    return Array.from(bSet).map(b => ({ value: b, label: b }));
  }, [data.rooms]);

  // Derived floor options (supports contextual filtering if a building is selected)
  const floorOptions = useMemo(() => {
    const fSet = new Set();
    data.rooms.forEach(r => {
      if (selectedBuilding === 'ALL' || r.building === selectedBuilding) {
        if (r.floor) fSet.add(r.floor);
      }
    });
    return Array.from(fSet).map(f => ({ value: f, label: f }));
  }, [data.rooms, selectedBuilding]);

  // Reset floor filter if selected building no longer contains it
  useEffect(() => {
    if (selectedFloor !== 'ALL') {
      const exists = floorOptions.some(f => f.value === selectedFloor);
      if (!exists) setSelectedFloor('ALL');
    }
  }, [selectedBuilding, floorOptions, selectedFloor]);

  // Derived room type options (using space 'type')
  const roomTypeOptions = useMemo(() => {
    const tSet = new Set();
    data.rooms.forEach(r => {
      const t = r.type || r.room_type;
      if (t) tSet.add(t);
    });
    return Array.from(tSet).map(t => ({ value: t, label: t }));
  }, [data.rooms]);

  // Occupancy options with clear, consistent semantics
  const occupancyOptions = [
    { value: 'HAS_OCCUPIED', label: 'Has Occupied Seats' },
    { value: 'ZERO_OCCUPIED', label: 'Zero Occupied' },
    { value: 'HAS_RESERVED', label: 'Has Reserved Seats' }
  ];

  // Active filters list for removable chips
  const activeFilters = useMemo(() => {
    const filters = [];
    if (selectedBuilding !== 'ALL') {
      filters.push({ key: 'building', label: `Building: ${selectedBuilding}` });
    }
    if (selectedFloor !== 'ALL') {
      filters.push({ key: 'floor', label: `Floor: ${selectedFloor}` });
    }
    if (selectedRoomType !== 'ALL') {
      filters.push({ key: 'room_type', label: `Room Type: ${selectedRoomType}` });
    }
    if (selectedOccupancy !== 'ALL') {
      const match = occupancyOptions.find(o => o.value === selectedOccupancy);
      filters.push({ key: 'occupancy', label: `Occupancy: ${match ? match.label : selectedOccupancy}` });
    }
    if (searchQuery.trim()) {
      filters.push({ key: 'search', label: `Search: "${searchQuery}"` });
    }
    return filters;
  }, [selectedBuilding, selectedFloor, selectedRoomType, selectedOccupancy, searchQuery]);

  const clearAllFilters = () => {
    setSelectedBuilding('ALL');
    setSelectedFloor('ALL');
    setSelectedRoomType('ALL');
    setSelectedOccupancy('ALL');
    setSearchQuery('');
  };

  const removeFilter = (key) => {
    if (key === 'building') setSelectedBuilding('ALL');
    if (key === 'floor') setSelectedFloor('ALL');
    if (key === 'room_type') setSelectedRoomType('ALL');
    if (key === 'occupancy') setSelectedOccupancy('ALL');
    if (key === 'search') setSearchQuery('');
  };

  const isFiltered = activeFilters.length > 0;

  // Real Multi-Criteria Room Filtering (combining all filters)
  const filteredRooms = useMemo(() => {
    return data.rooms.filter(room => {
      // 1. Building Filter
      if (selectedBuilding !== 'ALL' && room.building !== selectedBuilding) return false;

      // 2. Floor Filter
      if (selectedFloor !== 'ALL' && room.floor !== selectedFloor) return false;

      // 3. Room Type Filter (checking both 'type' and 'room_type')
      const roomType = room.type || room.room_type;
      if (selectedRoomType !== 'ALL' && roomType !== selectedRoomType) return false;

      // 4. Occupancy Filter (real seat counts)
      if (selectedOccupancy === 'HAS_OCCUPIED' && (room.occupied || 0) <= 0) return false;
      if (selectedOccupancy === 'ZERO_OCCUPIED' && (room.occupied || 0) > 0) return false;
      if (selectedOccupancy === 'HAS_RESERVED' && (room.reserved || 0) <= 0) return false;

      // 5. Search Filter (by room name or room code / space id)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (room.name || '').toLowerCase().includes(q);
        const matchesCode = (room.code || room.id || '').toLowerCase().includes(q);
        const matchesBuilding = (room.building || '').toLowerCase().includes(q);
        const matchesFloor = (room.floor || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesBuilding && !matchesFloor) return false;
      }

      return true;
    });
  }, [data.rooms, selectedBuilding, selectedFloor, selectedRoomType, selectedOccupancy, searchQuery]);

  // Dynamic Metrics: Campus-wide vs Filtered View
  const activeMetrics = useMemo(() => {
    const campusTotal = data.summary.total ?? data.summary.total_seats ?? 235;
    const campusOccupied = data.summary.occupied ?? data.summary.occupied_seats ?? 0;
    const campusReserved = data.summary.reserved ?? data.summary.reserved_seats ?? 0;
    const campusUnverified = data.summary.unverified ?? data.summary.unverified_seats ?? 0;
    const campusAvailable = data.summary.available ?? data.summary.available_seats ?? (campusTotal - campusOccupied - campusReserved - campusUnverified);

    if (!isFiltered) {
      return {
        isFiltered: false,
        total_seats: campusTotal,
        occupied_seats: campusOccupied,
        reserved_seats: campusReserved,
        available_seats: campusAvailable,
        unverified_seats: campusUnverified,
        rooms_count: data.rooms.length
      };
    }

    const tot = filteredRooms.reduce((acc, r) => acc + (r.total_seats ?? r.total_capacity ?? 0), 0);
    const occ = filteredRooms.reduce((acc, r) => acc + (r.occupied ?? 0), 0);
    const res = filteredRooms.reduce((acc, r) => acc + (r.reserved ?? 0), 0);
    const unv = filteredRooms.reduce((acc, r) => acc + (r.unverified ?? 0), 0);
    const avail = Math.max(0, tot - occ - res - unv);

    return {
      isFiltered: true,
      total_seats: tot,
      occupied_seats: occ,
      reserved_seats: res,
      available_seats: avail,
      unverified_seats: unv,
      rooms_count: filteredRooms.length
    };
  }, [isFiltered, data.summary, data.rooms, filteredRooms]);

  // Sorted room table
  const sortedRooms = useMemo(() => {
    const list = [...filteredRooms];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      const aCapacity = a.total_seats ?? a.total_capacity ?? 0;
      const bCapacity = b.total_seats ?? b.total_capacity ?? 0;

      if (sortField === 'total_capacity' || sortField === 'total_seats') {
        aVal = aCapacity;
        bVal = bCapacity;
      }

      if (sortField === 'occupancy_rate') {
        aVal = aCapacity ? (a.occupied / aCapacity) : 0;
        bVal = bCapacity ? (b.occupied / bCapacity) : 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal || '')
          : (bVal || '').localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
    });
    return list;
  }, [filteredRooms, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Building-wise Aggregation from Real Data (reflects active filters)
  const buildingBreakdown = useMemo(() => {
    const map = {};
    const sourceRooms = isFiltered ? filteredRooms : data.rooms;
    sourceRooms.forEach(r => {
      const b = r.building || 'General Campus';
      const cap = r.total_seats ?? r.total_capacity ?? 0;
      if (!map[b]) {
        map[b] = {
          name: b,
          rooms: 0,
          total: 0,
          occupied: 0,
          reserved: 0,
          available: 0
        };
      }
      map[b].rooms += 1;
      map[b].total += cap;
      map[b].occupied += (r.occupied || 0);
      map[b].reserved += (r.reserved || 0);
      map[b].available += (r.available || 0);
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [data.rooms, filteredRooms, isFiltered]);

  // Pure SVG Donut Chart Calculation
  const donutSegments = useMemo(() => {
    const tot = activeMetrics.total_seats || 1;
    const items = [
      { key: 'occupied', label: 'Occupied', value: activeMetrics.occupied_seats, color: '#6850F4' },
      { key: 'reserved', label: 'Reserved', value: activeMetrics.reserved_seats, color: '#F59E0B' },
      { key: 'unverified', label: 'Unverified', value: activeMetrics.unverified_seats, color: '#EF4444' },
      { key: 'available', label: 'Available', value: activeMetrics.available_seats, color: '#E0E7FF' }
    ];

    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~339.292
    let accumulatedAngle = 0;

    return items.map(item => {
      const fraction = item.value / tot;
      const strokeLength = fraction * circumference;
      const dashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += fraction;

      return {
        ...item,
        fraction,
        dasharray: `${strokeLength} ${circumference - strokeLength}`,
        dashoffset
      };
    });
  }, [activeMetrics]);

  // Navigation Links
  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin', active: location.pathname === '/admin' },
    { label: 'QR Scanner', icon: QrCode, path: '/admin/scanner', active: location.pathname.startsWith('/admin/scanner') },
    { label: 'Notifications', icon: Bell, path: '/notifications', active: location.pathname.startsWith('/notifications') },
    { label: 'SeatSure Verification', icon: ShieldCheck, path: '/notifications?filter=seatsure', active: false }
  ];

  return (
    <div className="min-h-screen text-[#252638] flex flex-col font-sans antialiased selection:bg-[#6850F4]/15">
      {/* 1. TOP PURPLE ENTERPRISE BAR */}
      <header className="bg-gradient-to-r from-[#5B42E8]/85 via-[#6850F4]/80 to-[#7B66FF]/75 backdrop-blur-xl border-b border-white/20 text-white px-3 sm:px-5 py-2.5 shadow-md flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/90 hover:text-white"
            title="Toggle Sidebar"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform duration-200 ${isLeftCollapsed ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/admin')}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform duration-200">
              <img
                src="/sitto-emblem.png"
                alt="SITTO Admin Console"
                className="w-full h-full object-contain select-none drop-shadow-xs"
              />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg text-white">SITTO</span>
              <span className="text-[11px] font-semibold text-purple-200 uppercase tracking-wider ml-2 px-1.5 py-0.5 rounded bg-white/10 border border-white/15">
                Admin Console
              </span>
            </div>
          </div>
        </div>

        {/* Center Campus Selector / Quick Status */}
        <div className="hidden md:flex items-center gap-2 bg-black/15 px-3 py-1 rounded-full border border-white/10 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-white/90">SRM KTR Campus</span>
          <span className="text-white/40">•</span>
          <span className="text-purple-200 font-mono">
            {data.summary.total ?? 235} Configured Seats
          </span>
        </div>

        {/* Right Header Utilities */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-xs font-medium text-white border border-white/15 cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            onClick={() => navigate('/admin/scanner')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 transition text-xs font-semibold text-white shadow-sm cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QR Scanner</span>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition relative text-white cursor-pointer"
            title="Admin Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-[#252638] text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white lg:flex hidden cursor-pointer"
            title="Toggle Live Feed"
          >
            <Activity className="w-4 h-4" />
          </button>

          <div className="h-6 w-[1px] bg-white/20 mx-1 hidden sm:block" />

          {/* User Badge */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-white text-[#6850F4] font-bold text-xs flex items-center justify-center shadow">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/80 hover:text-white cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Top indeterminate loading bar */}
      {isLoading && (
        <div className="w-full h-0.5 bg-[#6850F4]/20 overflow-hidden z-40">
          <div className="w-1/3 h-full bg-[#6850F4] animate-pulse" />
        </div>
      )}

      {/* MAIN 3-PANE LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* PANE 1: LEFT SIDEBAR NAVIGATION */}
        <aside
          className={`bg-white border-r border-[#E5E7EB] transition-all duration-200 flex flex-col z-20 shrink-0 ${
            isLeftCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="p-3 border-b border-[#F0F2F5] flex items-center justify-between">
            {!isLeftCollapsed ? (
              <div className="flex items-center gap-2">
                <img src="/sitto-emblem.png" alt="SITTO" className="w-4 h-4 object-contain" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Administration
                </span>
              </div>
            ) : (
              <div className="w-full flex justify-center py-0.5">
                <img src="/sitto-emblem.png" alt="SITTO" className="w-5 h-5 object-contain" />
              </div>
            )}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer ml-auto"
              title={isLeftCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isLeftCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          <nav className="p-2 space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    item.active
                      ? 'bg-[#6850F4] text-white shadow-sm shadow-[#6850F4]/30'
                      : 'text-gray-600 hover:text-[#6850F4] hover:bg-[#F3F4F9]'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-white' : 'text-gray-500'}`} />
                  {!isLeftCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Quick Admin Summary card in bottom of sidebar */}
          {!isLeftCollapsed && (
            <div className="p-3 m-2 rounded-xl bg-gradient-to-br from-[#6850F4]/10 via-[#8B5CF6]/5 to-transparent border border-[#6850F4]/15">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-[#6850F4]" />
                <span className="text-xs font-bold text-[#252638]">SeatSure Guard</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">
                15-min QR window verified across all labs.
              </p>
              <div className="mt-2 pt-2 border-t border-[#6850F4]/10 flex justify-between items-center text-[10px] text-gray-600 font-medium">
                <span>Compliance</span>
                <span className="font-bold text-emerald-600">
                  {formatPercentage(data.summary.occupied || 0, (data.summary.occupied || 0) + (data.summary.unverified || 0) || 1)}
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* PANE 2: CENTER MAIN CONTENT (SCROLLABLE) */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-3.5">
          {/* WELCOME BANNER (Reduced vertical padding by ~20%) */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#252638]">
                  Welcome back, {user?.name || user?.email?.split('@')[0] || 'Admin'}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  LIVE SYSTEM
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                SRM KTR Campus seat reservations, SeatSure compliance & room utilization telemetry.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="px-3 py-1.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EB] text-xs flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#6850F4]" />
                <span className="font-semibold text-gray-700">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="px-3 py-1.5 rounded-xl bg-[#6850F4] hover:bg-[#5B42E8] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Verify Attendance</span>
              </button>
            </div>
          </div>

          {/* 2. REDESIGNED, CLEAN & RESPONSIVE FILTER SECTION */}
          <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative z-30">
            {/* Top Row: Primary Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Controls Group */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Field */}
                <div className="relative w-full sm:w-56 md:w-64">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search room name or code..."
                    className="w-full h-9 pl-8 pr-7 text-xs rounded-xl bg-[#F6F7FB] border border-[#E5E7EB] focus:outline-none focus:ring-1 focus:ring-[#6850F4] text-gray-800 placeholder-gray-400 font-medium transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Building Dropdown */}
                <FilterDropdown
                  label="Building Filter"
                  value={selectedBuilding}
                  options={buildingOptions}
                  onChange={setSelectedBuilding}
                  allLabel="All Buildings"
                  icon={Building}
                />

                {/* Floor Dropdown (Supported from real floors data) */}
                <FilterDropdown
                  label="Floor Filter"
                  value={selectedFloor}
                  options={floorOptions}
                  onChange={setSelectedFloor}
                  allLabel="All Floors"
                  icon={Layers}
                />

                {/* Room Type Dropdown */}
                <FilterDropdown
                  label="Room Type"
                  value={selectedRoomType}
                  options={roomTypeOptions}
                  onChange={setSelectedRoomType}
                  allLabel="All Room Types"
                  icon={DoorOpen}
                />

                {/* Occupancy / Status Dropdown */}
                <FilterDropdown
                  label="Occupancy Status"
                  value={selectedOccupancy}
                  options={occupancyOptions}
                  onChange={setSelectedOccupancy}
                  allLabel="All Statuses"
                  icon={Filter}
                />
              </div>

              {/* Status Indicator & Global Clear Action */}
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 pt-1 lg:pt-0">
                <div className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition ${
                  isFiltered
                    ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs'
                    : 'bg-purple-50 text-[#6850F4] border-purple-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isFiltered ? 'bg-amber-500 animate-pulse' : 'bg-[#6850F4]'}`} />
                  <span>{isFiltered ? `Filtered View (${filteredRooms.length} Spaces)` : 'Campus-Wide Metrics'}</span>
                </div>

                {isFiltered && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Row: Removable Active Filter Chips in Separate Clean Row */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#6850F4]" />
                  <span>Active Filters:</span>
                </span>
                {activeFilters.map(chip => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-[#6850F4]/10 text-[#6850F4] text-xs font-semibold border border-[#6850F4]/20 shadow-2xs animate-in fade-in duration-150"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={() => removeFilter(chip.key)}
                      className="p-0.5 rounded-md hover:bg-[#6850F4]/20 text-[#6850F4] hover:text-rose-600 transition cursor-pointer"
                      title={`Remove ${chip.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] text-gray-400 hover:text-rose-600 font-medium ml-1.5 underline decoration-gray-300 hover:decoration-rose-400 transition cursor-pointer"
                >
                  Reset all
                </button>
              </div>
            )}
          </div>

          {/* KPI CARDS (Reduced padding by ~15-20%: p-3 sm:p-3.5) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Total Seats */}
            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative overflow-hidden group hover:border-[#6850F4]/40 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold">
                <span>Total Seats</span>
                <Layers className="w-3.5 h-3.5 text-[#6850F4]" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-[#252638] tracking-tight">
                  {activeMetrics.total_seats}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">100%</span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 truncate">
                {activeMetrics.rooms_count} rooms {isFiltered && '(filtered)'}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6850F4]" />
            </div>

            {/* 2. Occupied Seats */}
            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative overflow-hidden group hover:border-[#6850F4]/40 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold">
                <span>Occupied</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6850F4]" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-[#6850F4] tracking-tight">
                  {activeMetrics.occupied_seats}
                </span>
                <span className="text-[11px] font-bold text-[#6850F4]">
                  {formatPercentage(activeMetrics.occupied_seats, activeMetrics.total_seats)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 truncate">
                Live checked-in
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6850F4]" />
            </div>

            {/* 3. Reserved Seats */}
            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative overflow-hidden group hover:border-amber-400/40 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold">
                <span>Reserved</span>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
                  {activeMetrics.reserved_seats}
                </span>
                <span className="text-[11px] font-bold text-amber-600">
                  {formatPercentage(activeMetrics.reserved_seats, activeMetrics.total_seats)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 truncate">
                Pending check-in
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            </div>

            {/* 4. Available Seats */}
            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative overflow-hidden group hover:border-emerald-400/40 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold">
                <span>Available</span>
                <DoorOpen className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                  {activeMetrics.available_seats}
                </span>
                <span className="text-[11px] font-bold text-emerald-600">
                  {formatPercentage(activeMetrics.available_seats, activeMetrics.total_seats)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 truncate">
                Bookable now
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            </div>

            {/* 5. Unverified */}
            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative overflow-hidden group hover:border-rose-400/40 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold">
                <span>Unverified</span>
                <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
                  {activeMetrics.unverified_seats}
                </span>
                <span className="text-[11px] font-bold text-rose-600">
                  {formatPercentage(activeMetrics.unverified_seats, activeMetrics.total_seats)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 truncate">
                Awaiting SeatSure
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
            </div>

            {/* 6. Active Rooms */}
            <div className="bg-white rounded-2xl p-3 border border-[#E5E7EB] shadow-xs relative overflow-hidden group hover:border-indigo-400/40 transition">
              <div className="flex items-center justify-between text-gray-500 text-[11px] font-semibold">
                <span>Rooms Active</span>
                <Building className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-[#252638] tracking-tight">
                  {activeMetrics.rooms_count}
                </span>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">
                  {buildingBreakdown.length} Bldgs
                </span>
              </div>
              <div className="mt-1 text-[10px] text-gray-400 truncate">
                SRM KTR configured
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
            </div>
          </div>

          {/* 3. MIDDLE ROW: DAILY REVIEW + BUILDING-WISE BREAKDOWN */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
            {/* LEFT (7 cols): DAILY REVIEW ANALYTICS CARD */}
            <div className="xl:col-span-7 bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#6850F4]/10 flex items-center justify-center text-[#6850F4]">
                    <PieChartIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#252638]">Daily Review</h2>
                    <p className="text-[11px] text-gray-400">
                      Real-time campus utilization ratio & verified allocations {isFiltered && '(filtered)'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-[#6850F4]">
                    {formatPercentage(activeMetrics.occupied_seats, activeMetrics.total_seats)}
                  </div>
                  <div className="text-[10px] text-gray-400">Occupancy Ratio</div>
                </div>
              </div>

              {/* Occupancy Summary Strip */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#F6F7FB] border border-[#E5E7EB] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6850F4]" />
                    <span className="text-gray-600">Occupied:</span>
                    <span className="font-bold text-[#252638]">{activeMetrics.occupied_seats}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-gray-600">Reserved:</span>
                    <span className="font-bold text-[#252638]">{activeMetrics.reserved_seats}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-gray-600">Available:</span>
                    <span className="font-bold text-[#252638]">{activeMetrics.available_seats}</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-500">
                  Total {activeMetrics.total_seats} Seats
                </span>
              </div>

              {/* Chart & Vertical Progress Bars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-3 items-center">
                {/* Pure SVG Donut Chart (8 cols) */}
                <div className="sm:col-span-8 flex items-center justify-center relative min-h-[160px]">
                  <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 140 140">
                    {/* Background ring */}
                    <circle
                      cx="70"
                      cy="70"
                      r="54"
                      className="text-gray-100"
                      strokeWidth="14"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Colored Donut Segments */}
                    {donutSegments.map((seg) => {
                      if (seg.value === 0) return null;
                      return (
                        <circle
                          key={seg.key}
                          cx="70"
                          cy="70"
                          r="54"
                          stroke={seg.color}
                          strokeWidth="14"
                          strokeDasharray={seg.dasharray}
                          strokeDashoffset={seg.dashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-700"
                        />
                      );
                    })}
                  </svg>

                  {/* Donut Center Label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-black text-[#252638]">
                      {formatPercentage(activeMetrics.occupied_seats, activeMetrics.total_seats)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      Occupied
                    </span>
                  </div>
                </div>

                {/* Two Slim Vertical Progress Bars (4 cols) */}
                <div className="sm:col-span-4 flex items-center justify-around bg-[#F6F7FB] rounded-xl p-3 border border-[#E5E7EB]">
                  {/* Vertical Bar 1: Available % */}
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-28 bg-gray-200 rounded-full overflow-hidden flex flex-col justify-end p-0.5">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ height: `${Math.min(100, getPercentageNum(activeMetrics.available_seats, activeMetrics.total_seats))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 mt-1.5">
                      {formatPercentage(activeMetrics.available_seats, activeMetrics.total_seats)}
                    </span>
                    <span className="text-[9px] text-gray-400">Available</span>
                  </div>

                  {/* Vertical Bar 2: Booked % */}
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-28 bg-gray-200 rounded-full overflow-hidden flex flex-col justify-end p-0.5">
                      <div
                        className="w-full bg-gradient-to-t from-[#6850F4] to-[#8B5CF6] rounded-full transition-all duration-500"
                        style={{ height: `${Math.min(100, Math.max(4, getPercentageNum(activeMetrics.occupied_seats + activeMetrics.reserved_seats, activeMetrics.total_seats)))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 mt-1.5">
                      {formatPercentage(activeMetrics.occupied_seats + activeMetrics.reserved_seats, activeMetrics.total_seats)}
                    </span>
                    <span className="text-[9px] text-gray-400">Booked</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT (5 cols): BUILDING-WISE OCCUPANCY BREAKDOWN */}
            <div className="xl:col-span-5 bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#252638]">Building Occupancy</h2>
                      <p className="text-[11px] text-gray-400">Campus blocks in current view</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500">
                    {buildingBreakdown.length} Blocks
                  </span>
                </div>

                {/* Building list items */}
                <div className="mt-3 space-y-2.5">
                  {buildingBreakdown.map((b) => {
                    const occPct = formatPercentage(b.occupied, b.total);
                    const isSelected = selectedBuilding === b.name;

                    return (
                      <div
                        key={b.name}
                        onClick={() => setSelectedBuilding(isSelected ? 'ALL' : b.name)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#6850F4]/10 border-[#6850F4]'
                            : 'bg-[#F6F7FB] border-[#E5E7EB] hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#252638]">{b.name}</span>
                            <span className="text-[10px] text-gray-400">({b.rooms} rooms)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-gray-500">
                              {b.occupied} / {b.total} occ
                            </span>
                            <span className="text-[11px] font-bold text-[#6850F4]">
                              {occPct}
                            </span>
                          </div>
                        </div>

                        {/* Segmented bar */}
                        <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden flex">
                          <div
                            className="bg-[#6850F4] h-full"
                            style={{ width: `${getPercentageNum(b.occupied, b.total)}%` }}
                            title={`Occupied: ${b.occupied}`}
                          />
                          <div
                            className="bg-amber-400 h-full"
                            style={{ width: `${getPercentageNum(b.reserved, b.total)}%` }}
                            title={`Reserved: ${b.reserved}`}
                          />
                          <div
                            className="bg-emerald-400 h-full"
                            style={{ width: `${getPercentageNum(b.available, b.total)}%` }}
                            title={`Available: ${b.available}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Click building to filter dashboard</span>
                <span className="text-[#6850F4] font-medium hover:underline cursor-pointer" onClick={() => setSelectedBuilding('ALL')}>
                  {selectedBuilding !== 'ALL' ? 'Reset Building Filter' : 'All Active'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. ROOM-WISE OCCUPANCY TABLE DIRECTLY BELOW CHARTS */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="p-3 sm:p-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#6850F4]/10 flex items-center justify-center text-[#6850F4]">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#252638]">Room-Wise Live Analytics</h2>
                  <p className="text-[11px] text-gray-400">
                    Sortable breakdown of {sortedRooms.length} spaces matching current filters
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                Click any room to view seat map & live statuses
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-[#F6F7FB] text-gray-700 font-bold border-b border-[#E5E7EB]">
                  <tr>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">
                        <span>Room Name / Space</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('building')}>
                      <div className="flex items-center gap-1">
                        <span>Building</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('floor')}>
                      <div className="flex items-center gap-1">
                        <span>Floor</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('total_seats')}>
                      <div className="flex items-center gap-1">
                        <span>Capacity</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('occupied')}>
                      <div className="flex items-center gap-1">
                        <span>Occupied</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('reserved')}>
                      <div className="flex items-center gap-1">
                        <span>Reserved</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('available')}>
                      <div className="flex items-center gap-1">
                        <span>Available</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 cursor-pointer hover:text-[#6850F4]" onClick={() => handleSort('occupancy_rate')}>
                      <div className="flex items-center gap-1">
                        <span>Occupancy %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Status Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {sortedRooms.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-10 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Filter className="w-6 h-6 text-gray-300" />
                          <span>No rooms match the selected filters.</span>
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-xs text-[#6850F4] font-semibold hover:underline mt-1 cursor-pointer"
                          >
                            Reset all filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedRooms.map((room) => {
                      const capacity = room.total_seats ?? room.total_capacity ?? 0;
                      const occPctFormatted = formatPercentage(room.occupied, capacity);
                      const isHigh = room.occupied > 0;

                      return (
                        <tr
                          key={room.id}
                          onClick={() => openRoomModal(room.id)}
                          className="hover:bg-purple-50/40 cursor-pointer transition"
                        >
                          <td className="py-2.5 px-3 font-bold text-[#252638] flex items-center gap-2">
                            <span>{room.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">[{room.code || room.id}]</span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">{room.building}</td>
                          <td className="py-2.5 px-3 text-gray-500">{room.floor || 'Floor 1'}</td>
                          <td className="py-2.5 px-3 font-mono">{capacity}</td>
                          <td className="py-2.5 px-3 font-bold text-[#6850F4]">{room.occupied}</td>
                          <td className="py-2.5 px-3 font-semibold text-amber-600">{room.reserved}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-600">{room.available}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#252638]">
                            {occPctFormatted}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHigh
                                ? 'bg-purple-100 text-[#6850F4] border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-[#6850F4]' : 'bg-emerald-500'}`} />
                              <span>{isHigh ? 'Occupied' : 'Open / Empty'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* PANE 3: RIGHT ACTIVITY PANEL / LIVE FEED (COLLAPSIBLE & COMPACT) */}
        <aside
          className={`bg-white border-l border-[#E5E7EB] transition-all duration-200 flex flex-col z-20 shrink-0 ${
            isRightCollapsed ? 'w-0 overflow-hidden border-none' : 'w-72 lg:w-80'
          }`}
        >
          {/* Header */}
          <div className="p-3 border-b border-[#F0F2F5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#6850F4]" />
              <h2 className="text-xs font-bold text-[#252638]">Live Activity Feed</h2>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-gray-400">
                {notifications.length} Events
              </span>
              <button
                onClick={() => setIsRightCollapsed(true)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                title="Collapse Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter or Info Strip */}
          <div className="px-3 py-2 bg-[#F6F7FB] border-b border-[#E5E7EB] flex items-center justify-between text-[11px] text-gray-500">
            <span>Real-time events from Supabase</span>
            <button
              onClick={() => navigate('/notifications')}
              className="text-[#6850F4] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Scrollable Compact Feed Cards */}
          <div className="p-2.5 flex-1 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No recent activity recorded.
              </div>
            ) : (
              notifications.map((notif) => {
                const isExpanded = !!expandedNotifications[notif.id];
                const msg = notif.message || notif.title || '';
                const isLong = msg.length > 70;
                const displayText = (!isExpanded && isLong) ? `${msg.slice(0, 70)}...` : msg;

                // Event type badge color
                const type = notif.type?.toUpperCase() || 'INFO';
                const isCheckin = type.includes('CHECKIN') || msg.toLowerCase().includes('checked in');
                const isSeatsure = type.includes('SEATSURE') || msg.toLowerCase().includes('seatsure');
                const isBooking = type.includes('BOOK') || msg.toLowerCase().includes('reservation');
                const isWarning = type.includes('WARN') || msg.toLowerCase().includes('absent');

                let badgeColor = 'bg-gray-100 text-gray-700';
                if (isCheckin) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                else if (isSeatsure) badgeColor = 'bg-purple-50 text-[#6850F4] border-purple-200';
                else if (isBooking) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                else if (isWarning) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <div
                    key={notif.id}
                    className="p-2.5 rounded-xl border border-[#E5E7EB] bg-[#F6F7FB]/60 hover:bg-white hover:border-[#6850F4]/30 transition text-xs shadow-2xs"
                  >
                    {/* Header Row: Badge & Time */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                        {type}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>

                    {/* Metadata details: Seat & Room info */}
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#252638] mb-1">
                      {notif.seat_id && (
                        <span className="px-1.5 py-0.2 bg-white rounded border border-gray-200 font-mono text-gray-700">
                          Seat: {notif.seat_id}
                        </span>
                      )}
                      {notif.room_name && (
                        <span className="text-gray-500 truncate">
                          {notif.room_name}
                        </span>
                      )}
                    </div>

                    {/* Notification message */}
                    <p className="text-gray-600 text-[11px] leading-relaxed break-words">
                      {displayText}
                    </p>

                    {/* Expand / Collapse toggle */}
                    {isLong && (
                      <button
                        onClick={() => toggleExpandNotification(notif.id)}
                        className="mt-1 text-[10px] font-semibold text-[#6850F4] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Show less</span>
                            <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Show more</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* ROOM INSPECTION MODAL */}
      {selectedRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 border border-[#E5E7EB] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-[#252638]">
                  {roomModalDetails?.room?.name || 'Room Inspection'}
                </h3>
                <p className="text-xs text-gray-400">
                  {roomModalDetails?.room?.building} • Code: {roomModalDetails?.room?.code || selectedRoomModal}
                </p>
              </div>
              <button
                onClick={closeRoomModal}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {roomModalLoading ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6850F4]" />
                Loading room seats...
              </div>
            ) : (
              <div className="py-3 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="text-sm font-black text-[#6850F4]">
                      {roomModalDetails?.room?.occupied || 0}
                    </div>
                    <div className="text-[10px] text-gray-500">Occupied</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="text-sm font-black text-amber-600">
                      {roomModalDetails?.room?.reserved || 0}
                    </div>
                    <div className="text-[10px] text-gray-500">Reserved</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-sm font-black text-emerald-600">
                      {roomModalDetails?.room?.available || 0}
                    </div>
                    <div className="text-[10px] text-gray-500">Available</div>
                  </div>
                </div>

                <div className="text-xs font-bold text-gray-700">Configured Seats</div>
                <div className="max-h-48 overflow-y-auto grid grid-cols-6 gap-1.5 p-2 bg-[#F6F7FB] rounded-xl border border-[#E5E7EB]">
                  {roomModalDetails?.seats?.map((seat) => {
                    const st = seat.status?.toLowerCase();
                    let bg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    if (st === 'occupied') bg = 'bg-[#6850F4] text-white border-[#6850F4]';
                    else if (st === 'reserved') bg = 'bg-amber-100 text-amber-800 border-amber-200';
                    else if (st === 'unverified') bg = 'bg-rose-100 text-rose-800 border-rose-200';

                    return (
                      <div
                        key={seat.id}
                        className={`p-1 text-center rounded text-[10px] font-mono font-bold border ${bg}`}
                        title={`Seat ${seat.seat_number}: ${seat.status}`}
                      >
                        {seat.seat_number}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={closeRoomModal}
                className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboardPage;
