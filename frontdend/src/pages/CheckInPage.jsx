import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useNavigate } from '../hooks/useNavigate';
import { checkIn, checkOut, adminVerify } from '../services/reservationService';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import SITTOLogo from '../components/common/SITTOLogo';
import { formatSessionDisplay, formatTime } from '../utils/time';
import { 
  QrCode, 
  Camera, 
  StopCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle,
  UserCheck,
  UserX,
  RotateCcw,
  Search,
  ArrowLeft
} from 'lucide-react';

function VideoScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const streamRef = useRef(null);
  const mounted = useRef(true);

  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const startedRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    mounted.current = true;
    let localStream = null;

    const startCamera = async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
        } catch (e) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        if (!mounted.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        localStream = stream;
        streamRef.current = stream;
        
        const video = videoRef.current;
        if (video) {
          if (video.srcObject !== stream) {
            video.srcObject = stream;
          }
          video.setAttribute('playsinline', true);
          try {
            await video.play();
          } catch (playErr) {
            if (playErr.name !== 'AbortError') {
              throw playErr;
            }
          }
          requestRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        let msg = `Camera error: ${err.message}`;
        if (err.name === 'NotAllowedError') {
          msg = "Camera permission was denied. Please allow camera access in your browser settings to scan QR passes.";
        } else if (err.name === 'NotFoundError') {
          msg = "No video camera device found on this system.";
        } else if (err.name === 'NotReadableError') {
          msg = "Camera is currently locked or in use by another application.";
        }
        onErrorRef.current(msg);
      }
    };

    const tick = () => {
      if (!mounted.current || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          onScanRef.current(code.data);
          return;
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      mounted.current = false;
      startedRef.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0F0D26] overflow-hidden rounded-2xl flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Target Aiming Reticle with SITTO Purple Accents */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
        <div className="w-56 h-56 border-2 border-white/40 rounded-3xl relative flex items-center justify-center">
          {/* Corner target brackets */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#6850F4] rounded-tl-xl -mt-1 -ml-1" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#6850F4] rounded-tr-xl -mt-1 -mr-1" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#6850F4] rounded-bl-xl -mb-1 -ml-1" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#6850F4] rounded-br-xl -mb-1 -mr-1" />
          
          <div className="w-full h-0.5 bg-[#6850F4]/60 shadow-[0_0_12px_#6850F4] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CheckInPage() {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [verifiedRes, setVerifiedRes] = useState(null);

  const handleScan = async (qrValue) => {
    if (!qrValue || isProcessing) return;
    setScanEnabled(false);
    verifyReservation({ qr_token: qrValue });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualId.trim() || isProcessing) return;
    verifyReservation({ manual_code: manualId.trim() });
  };

  const verifyReservation = async (payload) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);
    setVerifiedRes(null);
    try {
      const res = await adminVerify(payload);
      setVerifiedRes(res);
    } catch (err) {
      setError(err.message || 'Invalid QR code or reservation ID.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (action) => {
    setIsProcessing(true);
    setError(null);
    try {
      if (action === 'checkin') {
        await checkIn(verifiedRes.id);
        setSuccessMsg(`✓ Seat ${verifiedRes.seatId} successfully checked in! Student presence verified.`);
      } else {
        await checkOut(verifiedRes.id);
        setSuccessMsg(`✓ Seat ${verifiedRes.seatId} successfully checked out. Seat released.`);
      }
      setVerifiedRes(null);
      setManualId('');
    } catch (err) {
      setError(err.message || `${action} failed`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isExpired = verifiedRes?.status === 'EXPIRED';
  const isAlreadyCheckedIn = verifiedRes?.status === 'CHECKED_IN';
  const isCancelled = verifiedRes?.status === 'CANCELLED';
  const isReserved = verifiedRes?.status === 'RESERVED';

  return (
    <div className="max-w-md mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin')} 
            className="bg-white hover:bg-gray-100 rounded-xl shadow-xs shrink-0 h-10 w-10 border border-gray-200"
            title="Back to Admin Console"
          >
            <ArrowLeft className="w-5 h-5 text-[#0F0D26]" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-heading text-[#0F0D26]">
              Admin QR Scanner
            </h1>
            <p className="text-xs text-gray-500">Entrance Verification & Presence Control</p>
          </div>
        </div>

        <SITTOLogo variant="emblem" size="sm" showSubtitle={false} />
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 flex items-start gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-1">✕</button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 flex items-start gap-2.5 shadow-xs animate-in fade-in">
          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Verification Error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-bold ml-1">✕</button>
        </div>
      )}

      {/* ─── Verified Booking Detail Card ────────────────────────────────────── */}
      {verifiedRes ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Card className="bg-white rounded-2xl border border-[#E8EBF2] shadow-[0_8px_30px_rgba(15,13,38,0.06)] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#17143A] via-[#211B54] to-[#120F30] text-white p-5 sm:p-6 pb-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider block mb-1">
                    Verified Booking
                  </span>
                  <CardTitle className="font-heading text-xl text-white">
                    {verifiedRes.spaceName}
                  </CardTitle>
                </div>
                <StatusBadge status={verifiedRes.status} />
              </div>

              {/* Large Seat Callout */}
              <div className="mt-3 flex items-center justify-between bg-white/10 px-4 py-2.5 rounded-xl border border-white/15">
                <span className="text-xs text-purple-200 font-medium">Assigned Seat:</span>
                <span className="text-2xl font-black font-heading text-white">{verifiedRes.seatId}</span>
              </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2.5">
                <span className="text-gray-400 font-medium">Session Schedule</span>
                <span className="font-bold text-[#0F0D26]">
                  {formatSessionDisplay(verifiedRes.startTime, verifiedRes.endTime)}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2.5">
                <span className="text-gray-400 font-medium">Reservation Ref</span>
                <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded">
                  {verifiedRes.id}
                </span>
              </div>

              {verifiedRes.checkInDeadline && (
                <div className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2.5">
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Check-in Deadline
                  </span>
                  <span className="font-bold text-amber-800">
                    {formatTime(verifiedRes.checkInDeadline)}
                  </span>
                </div>
              )}

              {/* Contextual Status Alerts */}
              {isAlreadyCheckedIn && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-800 text-[11px] font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Student is already checked in and present in this seat.</span>
                </div>
              )}

              {isExpired && (
                <div className="p-3 bg-red-50 border border-red-200/80 rounded-xl text-red-800 text-[11px] font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Reservation expired because student did not check in within 15 minutes.</span>
                </div>
              )}

              {isCancelled && (
                <div className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 text-[11px] font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>This reservation was cancelled by the student.</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-5 sm:p-6 pt-0 flex gap-2.5 bg-gray-50/50 border-t border-gray-100">
              <Button 
                variant="outline"
                className="flex-1 rounded-xl text-xs font-bold border-gray-200 text-gray-700 hover:bg-gray-100 h-11"
                onClick={() => setVerifiedRes(null)}
                disabled={isProcessing}
              >
                Reset / Rescan
              </Button>

              {isReserved && (
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  onClick={() => handleAction('checkin')}
                  disabled={isProcessing}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isProcessing ? 'Verifying...' : 'Confirm Check-In'}</span>
                </Button>
              )}

              {isAlreadyCheckedIn && (
                <Button 
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-11 rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                  onClick={() => handleAction('checkout')}
                  disabled={isProcessing}
                >
                  <UserX className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing...' : 'Manual Check-Out'}</span>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      ) : (
        /* ─── Scanner & Manual Input Options ────────────────────────────────── */
        <div className="space-y-6">
          {/* Camera Scanner Card */}
          <Card className="bg-white rounded-2xl border border-[#E8EBF2] shadow-[0_4px_24px_rgba(15,13,38,0.04)] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#17143A] via-[#211B54] to-[#120F30] text-white p-4 sm:p-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#8B6BFF]" />
                <CardTitle className="font-heading text-base text-white">Live Camera Scanner</CardTitle>
              </div>
              <span className="text-[10px] font-mono text-purple-200 bg-white/10 px-2 py-0.5 rounded">
                jsQR Engine
              </span>
            </CardHeader>

            <CardContent className="p-0">
              {!scanEnabled ? (
                <div className="text-center py-12 px-6 bg-[#F7F8FC] flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-[#F1EDFF] text-[#6850F4] rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F0D26] mb-1 font-heading">
                    Ready to Scan Entrance Pass
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs mb-5">
                    Align the student's digital QR code inside the target window for instant verification.
                  </p>
                  <Button 
                    className="bg-[#6850F4] hover:bg-[#5840DC] text-white font-bold text-xs h-11 px-8 rounded-xl shadow-xs"
                    onClick={() => setScanEnabled(true)}
                  >
                    Activate Camera
                  </Button>
                </div>
              ) : (
                <div className="w-full aspect-[4/3] sm:aspect-square relative flex flex-col bg-black">
                  <div className="flex-1 relative">
                    <VideoScanner onScan={handleScan} onError={setError} />
                  </div>
                  <div className="p-3 text-center bg-[#17143A] shrink-0 border-t border-white/10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-white/15 rounded-xl px-6 text-xs font-semibold flex items-center gap-1.5 mx-auto"
                      onClick={() => setScanEnabled(false)}
                    >
                      <StopCircle className="w-4 h-4 text-red-400" />
                      <span>Stop Camera</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
              <span className="bg-[#F6F5FB] px-4 text-gray-400 rounded-full">Or Manual Entry</span>
            </div>
          </div>

          {/* Manual Entry Fallback Card */}
          <Card className="bg-white rounded-2xl border border-[#E8EBF2] shadow-[0_4px_24px_rgba(15,13,38,0.04)]">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-sm font-bold font-heading text-[#0F0D26]">
                Enter Reservation Code or QR Token
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-1">
              <form onSubmit={handleManualSubmit} className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. RES12345678 or QR_..."
                  className="flex h-11 w-full rounded-xl border border-gray-200 bg-[#F7F8FC] px-3.5 py-2 text-xs focus:ring-2 focus:ring-[#6850F4]/30 focus:border-[#6850F4] outline-none transition-all font-mono"
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  disabled={isProcessing}
                />
                <Button 
                  type="submit" 
                  className="h-11 rounded-xl px-5 text-xs font-bold bg-[#6850F4] hover:bg-[#5840DC] text-white shrink-0 shadow-xs" 
                  disabled={isProcessing || !manualId.trim()}
                >
                  {isProcessing ? 'Verifying...' : 'Verify'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CheckInPage;
