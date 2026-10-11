import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBuildings } from '../services/buildingService';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { Building2, Search, ArrowRight, MapPin, Sparkles, Layers } from 'lucide-react';
import { Button } from '../components/common/Button';
import { BookingStepProgress } from '../components/common/BookingStepProgress';

export function CampusPage() {
  const [buildings, setBuildings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBuildings();
      setBuildings(data);
    } catch (err) {
      setError(err.message || 'Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <BookingStepProgress currentStep={1} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-4 w-72 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="h-11 w-full sm:w-80 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-[22px] bg-white border border-gray-100 p-6 animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                <div className="w-16 h-6 rounded-full bg-gray-100" />
              </div>
              <div className="h-5 w-3/4 bg-gray-200 rounded-lg" />
              <div className="h-4 w-1/2 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchBuildings} />;
  }

  const filteredBuildings = buildings.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Four-Step Booking Flow Indicator: Step 1 */}
      <BookingStepProgress currentStep={1} />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-[#6850F4]" />
            <h1 className="text-3xl font-extrabold tracking-tight font-heading text-[#0F0D26]">
              Campus Buildings
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Explore blocks across SRM KTR campus to locate departments, labs, and reading halls.
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search blocks (CSE, Library...)" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6850F4]/30 focus:border-[#6850F4] text-sm text-[#0F0D26] shadow-xs"
          />
        </div>
      </div>
      
      {buildings.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[22px] border border-gray-100 text-gray-500 shadow-xs">
          <p className="text-base font-semibold text-gray-800 mb-1">No blocks currently available</p>
          <p className="text-xs">Check back during regular campus lab hours.</p>
        </div>
      ) : filteredBuildings.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[22px] border border-gray-100 text-gray-500 shadow-xs">
          <p className="text-base font-semibold text-gray-800 mb-1">No matching blocks found</p>
          <p className="text-xs">Try searching for "CSE", "Library", or "Block".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuildings.map(b => (
            <Link key={b.id} to={`/campus/${b.id}`} className="block group">
              <Card className="rounded-[22px] border border-[#E8EBF2] bg-white p-6 shadow-[0_4px_20px_rgba(15,13,38,0.03)] hover:shadow-[0_12px_32px_rgba(104,80,244,0.12)] hover:border-[#6850F4]/40 transition-all duration-200 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F1EDFF] text-[#6850F4] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                      {b.id}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-heading text-[#0F0D26] group-hover:text-[#6850F4] transition-colors leading-tight">
                    {b.name}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-xs text-gray-500 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>SRM KTR Campus</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#6850F4]">
                  <span>Explore Floors & Labs</span>
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
