import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notificationService';
import { respondToSeatSurePrompt } from '../services/seatSureService';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import SITTOLogo from '../components/common/SITTOLogo';
import {
  Bell, Clock, CheckCircle, Info, XCircle,
  AlertTriangle, ShieldCheck, CheckSquare, UserCheck, UserX,
  Sparkles, CheckCircle2, ArrowRight
} from 'lucide-react';
import { formatTime, formatDate } from '../utils/time';

// ─── Countdown component ───────────────────────────────────────────────────
function Countdown({ expiresAt }) {
  const calcRemaining = () => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
    return diff;
  };
  const [seconds, setSeconds] = useState(calcRemaining);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds(calcRemaining()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (seconds <= 0) {
    return (
      <span className="text-xs text-red-600 font-bold flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        Verification window closed
      </span>
    );
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold">
      <Clock className={`w-3.5 h-3.5 ${seconds < 30 ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
      <span>
        {mins}:{secs.toString().padStart(2, '0')} deadline remaining
      </span>
    </div>
  );
}

// ─── Icon mapping ──────────────────────────────────────────────────────────
function NotifIcon({ type }) {
  const map = {
    BOOKING_CONFIRMED:  <CheckCircle className="w-5 h-5 text-emerald-500" />,
    CHECKIN_SUCCESS:    <CheckSquare className="w-5 h-5 text-emerald-600" />,
    CHECKOUT_SUCCESS:   <CheckCircle className="w-5 h-5 text-blue-500" />,
    BOOKING_CANCELLED:  <XCircle className="w-5 h-5 text-gray-500" />,
    RESERVATION_EXPIRED:<XCircle className="w-5 h-5 text-red-500" />,
    RESERVATION_RELEASED:<XCircle className="w-5 h-5 text-orange-500" />,
    SEATSURE_CHECK:     <AlertTriangle className="w-5 h-5 text-amber-500" />,
    SEATSURE_CONFIRMED: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    SEATSURE_ESCALATED: <AlertTriangle className="w-5 h-5 text-red-500" />,
    CONFIRMATION:       <AlertTriangle className="w-5 h-5 text-amber-500" />,
    SUCCESS:            <CheckCircle className="w-5 h-5 text-emerald-500" />,
    INFO:               <Info className="w-5 h-5 text-blue-500" />,
  };
  return map[type] ?? <Bell className="w-5 h-5 text-[#6850F4]" />;
}

// ─── Main page ─────────────────────────────────────────────────────────────
export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [responding, setResponding] = useState({});
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [notifs, tasksData] = await Promise.all([
        getNotifications(),
        user?.role === 'admin' ? apiClient.get('/admin/tasks') : Promise.resolve([])
      ]);
      setNotifications(notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setAdminTasks(tasksData || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  const handleMarkRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Mark read failed', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark all read failed', err);
    }
  };

  const handleSeatSureResponse = async (notif, response) => {
    const taskId = notif.seatsureTaskId;
    setResponding(prev => ({ ...prev, [notif.id]: response }));
    setActionMessage(null);
    setActionError(null);
    try {
      const result = await respondToSeatSurePrompt(taskId, response);
      setActionMessage(result.message || 'Verification submitted successfully');
      await markNotificationRead(notif.id);
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to submit response');
    } finally {
      setResponding(prev => { const n = { ...prev }; delete n[notif.id]; return n; });
    }
  };

  const handleResolveAdminTask = async (taskId, resolution) => {
    setResponding(prev => ({ ...prev, [taskId]: resolution }));
    setActionMessage(null);
    setActionError(null);
    try {
      await apiClient.post(`/admin/tasks/${taskId}/resolve`, { resolution });
      setActionMessage(`Marked student as ${resolution.toLowerCase()}`);
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Failed to resolve task');
    } finally {
      setResponding(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length + adminTasks.length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-40 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-28 bg-gray-100 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="h-8 w-28 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 animate-pulse space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                  <div className="h-4 w-36 bg-gray-200 rounded-md" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded-md" />
              </div>
              <div className="h-3.5 w-3/4 bg-gray-100 rounded-md mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 p-5 rounded-2xl text-red-800 text-sm shadow-xs space-y-2">
          <p className="font-bold">Failed to load notifications</p>
          <p className="text-xs">{error}</p>
          <Button variant="outline" size="sm" className="mt-2 border-red-200" onClick={fetchData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F1EDFF] text-[#6850F4] flex items-center justify-center shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F0D26]">
              Notifications
            </h1>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="border-gray-200 hover:border-[#6850F4] text-[#6850F4] hover:bg-[#F1EDFF] text-xs font-semibold rounded-xl"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold flex justify-between items-center shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {/* Admin Tasks Section (SeatSure Decisions for Admin) */}
      {adminTasks.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#6850F4]" />
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Staff Presence Verifications ({adminTasks.length})
            </h2>
          </div>
          {adminTasks.map(task => {
            const isResponding = responding[task.id];
            return (
              <Card key={task.id} className="bg-white rounded-2xl border border-red-200/80 shadow-[0_4px_20px_rgba(239,68,68,0.08)] overflow-hidden">
                <CardHeader className="py-3 px-4 sm:px-5 bg-red-50/50 border-b border-red-100">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-red-950 font-heading">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>SeatSure™ &bull; Verify Student Presence</span>
                      <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 animate-pulse" />
                    </CardTitle>
                    <span className="text-[10px] font-mono text-gray-500">
                      Task #{task.id?.substring(0, 8)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="text-xs text-gray-700 space-y-1.5 mb-4">
                    <p className="font-medium text-gray-900">
                      Telemetry reported potential unattended seat. Please verify whether the student is currently present in their assigned seat.
                    </p>
                    <div className="flex items-center gap-2 text-gray-500 pt-1">
                      <span>Occupancy Session:</span>
                      <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        {task.occupancy_session_id?.substring(0, 12)}...
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-1 border-t border-gray-100">
                    {task.deadline && <Countdown expiresAt={task.deadline} />}
                    <div className="flex gap-2.5">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold h-10 rounded-xl"
                        disabled={!!isResponding}
                        onClick={() => handleResolveAdminTask(task.id, 'ABSENT')}
                      >
                        {isResponding === 'ABSENT' ? 'Saving...' : <><UserX className="w-4 h-4 mr-1.5 inline" /> Mark Absent (Release)</>}
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 rounded-xl shadow-xs"
                        disabled={!!isResponding}
                        onClick={() => handleResolveAdminTask(task.id, 'PRESENT')}
                      >
                        {isResponding === 'PRESENT' ? 'Saving...' : <><UserCheck className="w-4 h-4 mr-1.5 inline" /> Confirm Present</>}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Student Notification Feed */}
      {notifications.length === 0 && adminTasks.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          message="You're all caught up! Booking confirmations and SeatSure verifications will appear here."
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const isSeatSure = notif.type === 'SEATSURE_CHECK' || notif.type === 'CONFIRMATION';
            const isActive = isSeatSure && notif.expiresAt && new Date(notif.expiresAt) > new Date();
            const isResponding = responding[notif.id];

            return (
              <Card
                key={notif.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  !notif.isRead
                    ? 'border-[#6850F4]/30 shadow-[0_4px_20px_rgba(104,80,244,0.08)] ring-1 ring-[#6850F4]/10'
                    : 'border-[#E8EBF2] shadow-xs opacity-90'
                }`}
              >
                <CardHeader className="py-3 px-4 sm:px-5 border-b border-gray-50 bg-[#F7F8FC]/50">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 text-[#0F0D26] font-heading">
                      <NotifIcon type={notif.type} />
                      <span>{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-[#6850F4] rounded-full shrink-0" />
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {formatTime(notif.createdAt)} &bull; {formatDate(notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-[11px] text-[#6850F4] hover:underline font-bold"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-normal">
                    {notif.message}
                  </p>

                  {/* SeatSure student presence verification prompt */}
                  {isSeatSure && (
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6850F4]">
                          SeatSure™ Active Presence Check
                        </span>
                        {notif.expiresAt && <Countdown expiresAt={notif.expiresAt} />}
                      </div>

                      {isActive ? (
                        <div className="flex gap-2.5 pt-1">
                          <Button
                            className="flex-1 bg-[#6850F4] hover:bg-[#5840DC] text-white text-xs font-bold h-10 rounded-xl shadow-xs"
                            disabled={!!isResponding}
                            onClick={() => handleSeatSureResponse(notif, 'YES')}
                          >
                            {isResponding === 'YES' ? 'Submitting...' : "✓ I'm Still Here"}
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold h-10 rounded-xl"
                            disabled={!!isResponding}
                            onClick={() => handleSeatSureResponse(notif, 'NO')}
                          >
                            {isResponding === 'NO' ? 'Submitting...' : 'Release Seat Early'}
                          </Button>
                        </div>
                      ) : notif.expiresAt ? (
                        <p className="text-xs text-gray-400 italic">
                          Verification window has closed. Presence status has been logged.
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Deep link to reservation digital pass */}
                  {notif.actionUrl && (
                    <div className="mt-3 pt-2">
                      <button
                        onClick={() => navigate(notif.actionUrl)}
                        className="text-xs font-bold text-[#6850F4] hover:text-[#5840DC] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Reservation Pass</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
