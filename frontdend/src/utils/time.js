export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric' });
}

export function generateBookingDates(daysAhead) {
  const dates = [];
  const now = new Date();
  
  for (let i = 0; i <= daysAhead; i++) {
    // Kolkata has no DST, so adding 24h per day is safe
    const target = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short"
    }).formatToParts(target);
    
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const weekday = parts.find(p => p.type === 'weekday').value;
    
    const dateStr = `${year}-${month}-${day}`;
    
    const monthShort = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata", month: "short"
    }).format(target);
    
    let label = `${weekday}, ${monthShort} ${parseInt(day, 10)}`;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    
    dates.push({
      dateStr,
      label,
      dateObj: target, // Reference object, actual operations use ISO
    });
  }
  return dates;
}

export function formatSessionLabel(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startStr = start.toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

export function generateSessionsForDate(dateStr, operatingHours, durationMins) {
  const sessions = [];
  const [year, month, day] = dateStr.split('-').map(Number);
  const now = new Date();
  
  // Create a base date representing midnight in Asia/Kolkata
  const baseStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+05:30`;
  const baseDate = new Date(baseStr);
  
  let currentMins = operatingHours.START * 60;
  const endMinsLimit = operatingHours.END * 60;
  
  while (currentMins < endMinsLimit) {
    const startObj = new Date(baseDate.getTime() + currentMins * 60000);
    const endObj = new Date(startObj.getTime() + durationMins * 60000);
    
    // A session is "past" only if its start time has passed (to avoid booking a 9:00 slot at 9:15)
    // Actually, user says: "Disable only start times that have genuinely passed." 
    // And "automatically deselect an expired selected slot."
    // So if startObj <= now, it is past and disabled.
    const isPast = startObj <= now;
    
    sessions.push({
      id: `${startObj.toISOString()}_${endObj.toISOString()}`,
      startIso: startObj.toISOString(),
      endIso: endObj.toISOString(),
      label: formatSessionLabel(startObj.toISOString(), endObj.toISOString()),
      isPast: isPast,
      isFull: false,
    });
    
    currentMins += durationMins;
  }
  
  return sessions;
}

export function formatSessionDisplay(startIso, endIso) {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso);
  const end = new Date(endIso);
  const now = new Date();
  
  // Format the target date's YYYY-MM-DD in Kolkata
  const getKolkataDateStr = (dateObj) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(dateObj);
    return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}-${parts.find(p=>p.type==='day').value}`;
  };

  const startStrDate = getKolkataDateStr(start);
  const todayStrDate = getKolkataDateStr(now);
  
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStrDate = getKolkataDateStr(tomorrow);

  let dayLabel = start.toLocaleDateString(undefined, { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' });
  
  if (startStrDate === todayStrDate) {
     dayLabel = 'Today';
  } else if (startStrDate === tomorrowStrDate) {
     dayLabel = 'Tomorrow';
  }

  const startStr = start.toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
  
  return `${dayLabel}, ${startStr} – ${endStr}`;
}

