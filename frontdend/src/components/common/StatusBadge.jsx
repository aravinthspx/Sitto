import React from 'react';
import { cn } from '../../utils/classnames';

/**
 * Supported Backend Reservation States:
 * - RESERVED (Confirmed / Awaiting Check-In)
 * - CHECKED_IN (Checked In / Active Presence)
 * - COMPLETED (Completed / Checked Out)
 * - CANCELLED (Cancelled)
 * - EXPIRED (Expired / No-Show Auto-Release)
 */
export function StatusBadge({ status, className = '' }) {
  if (!status) return null;

  const normalized = status.toUpperCase();

  const config = {
    RESERVED: {
      label: 'Confirmed',
      dotColor: 'bg-amber-400',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    CHECKED_IN: {
      label: 'Checked In',
      dotColor: 'bg-emerald-400 animate-pulse',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
    COMPLETED: {
      label: 'Completed',
      dotColor: 'bg-blue-400',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    },
    CANCELLED: {
      label: 'Cancelled',
      dotColor: 'bg-gray-400',
      badgeClass: 'bg-gray-50 text-gray-700 border-gray-200/80',
    },
    EXPIRED: {
      label: 'Expired',
      dotColor: 'bg-red-400',
      badgeClass: 'bg-red-50 text-red-800 border-red-200/80',
    },
    // Seat map / live state fallbacks
    AVAILABLE: {
      label: 'Available',
      dotColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    },
    OCCUPIED: {
      label: 'Occupied',
      dotColor: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    },
    UNVERIFIED: {
      label: 'Unverified',
      dotColor: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
  }[normalized] || {
    label: status.replace(/_/g, ' '),
    dotColor: 'bg-gray-400',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs select-none',
        config.badgeClass,
        className
      )}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', config.dotColor)} />
      <span>{config.label}</span>
    </span>
  );
}

export default StatusBadge;
