-- 1. Reclassify incorrectly labeled 'Lab' classrooms to 'Classroom'
-- This safely removes them from the student booking flow without deleting any records.
UPDATE public.spaces 
SET type = 'Classroom' 
WHERE id IN (
    'KTR_016_F2_L201', 'KTR_016_F2_L202', 'KTR_016_F2_L203', 'KTR_016_F2_L204',
    'KTR_016_F3_L301', 'KTR_016_F3_L302', 'KTR_016_F3_L303', 'KTR_016_F3_L304'
);

-- 2. Create additional DEMO labs and libraries
-- We will place these in CSE Block (BLD01) First Floor (FLO2) and Old Library Block (KTR_016)
INSERT INTO public.spaces (id, name, type, floor_id, capacity) VALUES 
('DEMO_LAB_2', 'Demo Lab 2', 'Lab', 'FLO2', 10),
('DEMO_LIB_2', 'Demo Library 2', 'Library', 'KTR_016_F2', 10)
ON CONFLICT (id) DO NOTHING;

-- 3. Populate synthetic bookable seats for these new demo spaces
INSERT INTO public.seats (space_id, label) VALUES
('DEMO_LAB_2', 'S1'), ('DEMO_LAB_2', 'S2'), ('DEMO_LAB_2', 'S3'), ('DEMO_LAB_2', 'S4'), ('DEMO_LAB_2', 'S5'),
('DEMO_LAB_2', 'S6'), ('DEMO_LAB_2', 'S7'), ('DEMO_LAB_2', 'S8'), ('DEMO_LAB_2', 'S9'), ('DEMO_LAB_2', 'S10'),
('DEMO_LIB_2', 'L1'), ('DEMO_LIB_2', 'L2'), ('DEMO_LIB_2', 'L3'), ('DEMO_LIB_2', 'L4'), ('DEMO_LIB_2', 'L5'),
('DEMO_LIB_2', 'L6'), ('DEMO_LIB_2', 'L7'), ('DEMO_LIB_2', 'L8'), ('DEMO_LIB_2', 'L9'), ('DEMO_LIB_2', 'L10')
ON CONFLICT (space_id, label) DO NOTHING;
