-- Seed Buildings
INSERT INTO public.buildings (id, name) VALUES 
('BLD01', 'CSE Block'),
('BLD02', 'Main Library')
ON CONFLICT (id) DO NOTHING;

-- Seed Floors
INSERT INTO public.floors (id, building_id, level, name) VALUES 
('FL01', 'BLD01', 1, 'Ground Floor'),
('FLO2', 'BLD01', 2, 'First Floor'),
('FL03', 'BLD01', 3, 'Third Floor'),
('FL04', 'BLD02', 1, 'Reading Hall 1')
ON CONFLICT (id) DO NOTHING;

-- Seed Spaces
INSERT INTO public.spaces (id, name, type, floor_id, capacity) VALUES 
('LAB001', 'Computer Lab 1', 'Lab', 'FLO2', 30),
('LAB004', 'Computer Lab 4', 'Lab', 'FL03', 20),
('LIB001', 'Quiet Reading Zone', 'Library', 'FL04', 50)
ON CONFLICT (id) DO NOTHING;

-- Seed Seats for LAB004 (20 seats, prefix A)
DO $$
DECLARE
    i INT;
    label_val TEXT;
BEGIN
    FOR i IN 1..20 LOOP
        label_val := 'A' || lpad(i::text, 2, '0');
        INSERT INTO public.seats (space_id, label) VALUES ('LAB004', label_val) ON CONFLICT (space_id, label) DO NOTHING;
    END LOOP;
END $$;

-- Seed Seats for LAB001 (30 seats, prefix S)
DO $$
DECLARE
    i INT;
    label_val TEXT;
BEGIN
    FOR i IN 1..30 LOOP
        label_val := 'S' || lpad(i::text, 2, '0');
        INSERT INTO public.seats (space_id, label) VALUES ('LAB001', label_val) ON CONFLICT (space_id, label) DO NOTHING;
    END LOOP;
END $$;
