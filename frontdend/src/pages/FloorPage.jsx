import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from '../hooks/useNavigate';
import { getSpaces } from '../services/buildingService';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ArrowLeft, Monitor, BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { BookingStepProgress } from '../components/common/BookingStepProgress';

export function FloorPage() {
  const { buildingId, floorId } = useParams();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSpaces(floorId);
      setSpaces(data);
    } catch (err) {
      setError(err.message || 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [floorId]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <BookingStepProgress currentStep={1} />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-56 rounded-[22px] bg-white border border-gray-100 p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                <div className="w-20 h-6 rounded-full bg-gray-100" />
              </div>
              <div className="h-6 w-3/4 bg-gray-200 rounded-lg" />
              <div className="h-4 w-1/2 bg-gray-100 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6 pb-12">
      {/* Four-Step Booking Flow Indicator: Step 1 */}
      <BookingStepProgress 
        currentStep={1} 
        onStepClick={() => navigate('/campus')} 
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/campus/${buildingId}`)} 
          className="bg-white hover:bg-gray-100 rounded-xl shadow-xs shrink-0 h-10 w-10 border border-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-[#0F0D26]" />
        </Button>
        <div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{buildingId}</span>
            <span>•</span>
            <span className="font-bold text-[#6850F4]">{floorId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F0D26]">
            Spaces on Floor {floorId}
          </h1>
        </div>
      </div>
      
      {spaces.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[22px] border border-gray-100 text-gray-500 shadow-xs">
          <p className="text-base font-semibold text-gray-800 mb-1">No spaces registered on this floor yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map(s => {
            const totalSeats = s.configuredSeats || s.capacity || 0;
            const availableSeats = s.availableSeats !== undefined ? s.availableSeats : totalSeats;
            const percentAvailable = totalSeats > 0 ? Math.round((availableSeats / totalSeats) * 100) : 0;
            const isLab = (s.type || '').toLowerCase() === 'lab';

            return (
              <Card
                key={s.id}
                className="group rounded-[22px] border border-[#E8EBF2] bg-white overflow-hidden shadow-[0_4px_20px_rgba(15,13,38,0.03)] hover:shadow-[0_12px_32px_rgba(104,80,244,0.12)] hover:border-[#6850F4]/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
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
                            {s.type || 'Room'}
                          </span>
                          <h3 className="text-lg font-bold font-heading text-[#0F0D26] group-hover:text-[#6850F4] transition-colors leading-tight">
                            {s.name}
                          </h3>
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        availableSeats > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {availableSeats > 0 ? `${availableSeats} Free` : 'Full'}
                      </div>
                    </div>
                  </div>

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
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Button
                    onClick={() => navigate(`/space/${s.id}`)}
                    className="w-full h-11 rounded-xl text-sm font-semibold bg-[#6850F4] hover:bg-[#5840DC] text-white shadow-xs"
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
  );
}
