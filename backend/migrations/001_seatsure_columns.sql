-- =============================================================
-- SITTO SeatSure — Database Migration 001
-- Run this in Supabase SQL Editor before starting the scheduler
-- =============================================================

-- 1. Add missing columns to notifications table
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS reservation_id TEXT,
  ADD COLUMN IF NOT EXISTS seatsure_task_id UUID REFERENCES seatsure_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_url TEXT;

-- 2. Add response tracking to seatsure_tasks
ALTER TABLE seatsure_tasks
  ADD COLUMN IF NOT EXISTS response TEXT,          -- 'YES' | 'NO' | NULL
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- 3. Add resolution tracking to admin_verification_tasks
ALTER TABLE admin_verification_tasks
  ADD COLUMN IF NOT EXISTS resolution TEXT,        -- 'PRESENT' | 'ABSENT' | NULL
  ADD COLUMN IF NOT EXISTS resolved_by UUID,       -- admin user_id
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- =============================================================
-- Verification Queries (read-only, run after migration)
-- =============================================================

-- Latest checked-in reservation
-- SELECT r.id, r.user_id, r.space_id, r.status, r.start_time, r.end_time,
--        os.id as occ_id, os.checked_in_at, os.status as occ_status
-- FROM reservations r
-- JOIN occupancy_sessions os ON os.reservation_id = r.id
-- WHERE r.status = 'CHECKED_IN'
-- ORDER BY os.checked_in_at DESC LIMIT 5;

-- Scheduled SeatSure verifications (student tasks)
-- SELECT st.id, st.occupancy_session_id, st.status, st.deadline, st.response, st.resolved_at
-- FROM seatsure_tasks st
-- ORDER BY st.created_at DESC LIMIT 10;

-- Student notifications
-- SELECT n.id, n.user_id, n.type, n.title, n.message, n.is_read,
--        n.expires_at, n.seatsure_task_id, n.reservation_id, n.action_url, n.created_at
-- FROM notifications n
-- ORDER BY n.created_at DESC LIMIT 20;

-- Admin verification tasks
-- SELECT avt.id, avt.occupancy_session_id, avt.status, avt.deadline,
--        avt.resolution, avt.resolved_by, avt.resolved_at
-- FROM admin_verification_tasks avt
-- ORDER BY avt.created_at DESC LIMIT 10;

-- Released reservations
-- SELECT r.id, r.user_id, r.status, r.end_time,
--        os.status as occ_status
-- FROM reservations r
-- LEFT JOIN occupancy_sessions os ON os.reservation_id = r.id
-- WHERE r.status = 'COMPLETED' AND os.status = 'RELEASED'
-- ORDER BY r.end_time DESC LIMIT 10;
