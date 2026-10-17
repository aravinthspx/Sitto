import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNavigate } from '../hooks/useNavigate';
import { getFloors, getBuildings } from '../services/buildingService';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { Layers, ArrowLeft, ArrowRight, Building2, MapPin } from 'lucide-react';
import { BookingStepProgress } from '../components/common/BookingStepProgress';

export function BuildingPage() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const [floors, setFloors] = useState([]);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [buildingsData, floorsData] = await Promise.all([
        getBuildings(),
        getFloors(buildingId)
      ]);
      setBuilding(buildingsData.find(b => b.id === buildingId));
      setFloors(floorsData);
    } catch (err) {
      setError(err.message || 'Failed to load floors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [buildingId]);

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
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-44 rounded-[22px] bg-white border border-gray-100 p-6 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                <div className="w-16 h-6 rounded-full bg-gray-100" />
              </div>
              <div className="h-5 w-2/3 bg-gray-200 rounded-lg" />
              <div className="h-4 w-1/3 bg-gray-100 rounded-md" />
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
      <BookingStepProgress currentStep={1} onStepClick={() => navigate('/campus')} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/campus')} 
          className="bg-white hover:bg-gray-100 rounded-xl shadow-xs shrink-0 h-10 w-10 border border-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-[#0F0D26]" />
        </Button>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6850F4] bg-[#F1EDFF] px-2 py-0.5 rounded-full">
              {buildingId}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">Floor Selection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-[#0F0D26] mt-0.5">
            {building?.name || buildingId}
          </h1>
        </div>
      </div>

      {floors.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[22px] border border-gray-100 text-gray-500 shadow-xs">
          <p className="text-base font-semibold text-gray-800 mb-1">No active floors registered in this block.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {floors.map(f => (
            <Link key={f.id} to={`/campus/${buildingId}/floor/${f.id}`} className="block group">
              <Card className="rounded-[22px] border border-[#E8EBF2] bg-white p-6 shadow-[0_4px_20px_rgba(15,13,38,0.03)] hover:shadow-[0_12px_32px_rgba(104,80,244,0.12)] hover:border-[#6850F4]/40 transition-all duration-200 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1EDFF] text-[#6850F4] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Layers className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                      {f.id}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-heading text-[#0F0D26] group-hover:text-[#6850F4] transition-colors leading-tight">
                    {f.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2">
                    {building?.name || buildingId}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#6850F4]">
                  <span>Explore Rooms on {f.name}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
