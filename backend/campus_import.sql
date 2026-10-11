BEGIN;

INSERT INTO public.buildings (id, name) VALUES ('KTR_001', 'Canteen Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_001_F0', 'KTR_001', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_001_F1', 'KTR_001', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_001_F2', 'KTR_001', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_001_F3', 'KTR_001', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_001_F4', 'KTR_001', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_002', 'PG Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_002_F0', 'KTR_002', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_002_F1', 'KTR_002', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_002_F2', 'KTR_002', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_002_F3', 'KTR_002', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_003', 'Aarush Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_003_F0', 'KTR_003', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_003_F1', 'KTR_003', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_003_F2', 'KTR_003', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_004', 'Hi-Tech Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F0', 'KTR_004', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F1', 'KTR_004', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F2', 'KTR_004', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F3', 'KTR_004', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F4', 'KTR_004', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F5', 'KTR_004', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_004_F6', 'KTR_004', 6, 'Floor 6') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_005', 'Mech ''A'' Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_005_F0', 'KTR_005', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_005_F1', 'KTR_005', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_005_F2', 'KTR_005', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_005_F3', 'KTR_005', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_006', 'Mech ''B'' Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_006_F0', 'KTR_006', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_006_F1', 'KTR_006', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_006_F2', 'KTR_006', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_006_F3', 'KTR_006', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_007', 'Mech ''C'' Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_007_F0', 'KTR_007', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_007_F1', 'KTR_007', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_007_F2', 'KTR_007', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_007_F3', 'KTR_007', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_008', 'Mech ''D'' Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_008_F0', 'KTR_008', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_008_F1', 'KTR_008', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_008_F2', 'KTR_008', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_009', 'Mech ''E'' Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_009_F0', 'KTR_009', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_010', 'Mechanical Hanger') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_010_F0', 'KTR_010', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_010_F1', 'KTR_010', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_011', 'Aerospace Hanger') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_011_F0', 'KTR_011', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_011_F1', 'KTR_011', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_012', 'Structural Lab & Structural Testing Lab') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_012_F0', 'KTR_012', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_012_F1', 'KTR_012', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_013', 'ES Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_013_F0', 'KTR_013', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_013_F1', 'KTR_013', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_013_F2', 'KTR_013', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_013_F3', 'KTR_013', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_014', 'Automobile Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_014_F0', 'KTR_014', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_014_F1', 'KTR_014', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_014_F2', 'KTR_014', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_015', 'Main Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_015_F0', 'KTR_015', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_015_F1', 'KTR_015', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_015_F2', 'KTR_015', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_015_F3', 'KTR_015', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_016', 'Old Library Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_016_F0', 'KTR_016', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_016_F1', 'KTR_016', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_016_F2', 'KTR_016', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_016_F3', 'KTR_016', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_017', 'Admin Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_017_F0', 'KTR_017', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_017_F1', 'KTR_017', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_017_F2', 'KTR_017', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_017_F3', 'KTR_017', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_018', 'CRC Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F0', 'KTR_018', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F1', 'KTR_018', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F2', 'KTR_018', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F3', 'KTR_018', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F4', 'KTR_018', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F5', 'KTR_018', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F6', 'KTR_018', 6, 'Floor 6') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F7', 'KTR_018', 7, 'Floor 7') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_018_F8', 'KTR_018', 8, 'Floor 8') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_019', 'Estate Office') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_019_F0', 'KTR_019', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_019_F1', 'KTR_019', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_019_F2', 'KTR_019', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_020', 'Dr.Abdul Kalam Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_020_F0', 'KTR_020', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_020_F1', 'KTR_020', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_021', 'Police Out post building') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_021_F0', 'KTR_021', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_022', 'Basic Engineering Lab') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_022_F0', 'KTR_022', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_022_F1', 'KTR_022', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_022_F2', 'KTR_022', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_022_F3', 'KTR_022', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_022_F4', 'KTR_022', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_022_F5', 'KTR_022', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_023', 'MBA') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_023_F0', 'KTR_023', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_023_F1', 'KTR_023', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_023_F2', 'KTR_023', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_023_F3', 'KTR_023', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_023_F4', 'KTR_023', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_024', 'B.Arch') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_024_F0', 'KTR_024', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_024_F1', 'KTR_024', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_024_F2', 'KTR_024', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_024_F3', 'KTR_024', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_024_F4', 'KTR_024', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_024_F5', 'KTR_024', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_025', 'B.Arch - A') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_025_F0', 'KTR_025', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_025_F1', 'KTR_025', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_025_F2', 'KTR_025', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_025_F3', 'KTR_025', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_025_F4', 'KTR_025', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_025_F5', 'KTR_025', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_026', 'B.Arch - B') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_026_F0', 'KTR_026', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_026_F1', 'KTR_026', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_026_F2', 'KTR_026', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_026_F3', 'KTR_026', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_026_F4', 'KTR_026', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_027', 'Bio Tech') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F0', 'KTR_027', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F1', 'KTR_027', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F2', 'KTR_027', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F3', 'KTR_027', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F4', 'KTR_027', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F5', 'KTR_027', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_027_F6', 'KTR_027', 6, 'Floor 6') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_028', 'Tech park') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F0', 'KTR_028', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F1', 'KTR_028', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F2', 'KTR_028', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F3', 'KTR_028', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F4', 'KTR_028', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F5', 'KTR_028', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F6', 'KTR_028', 6, 'Floor 6') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F7', 'KTR_028', 7, 'Floor 7') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F8', 'KTR_028', 8, 'Floor 8') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F9', 'KTR_028', 9, 'Floor 9') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F10', 'KTR_028', 10, 'Floor 10') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F11', 'KTR_028', 11, 'Floor 11') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F12', 'KTR_028', 12, 'Floor 12') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F13', 'KTR_028', 13, 'Floor 13') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F14', 'KTR_028', 14, 'Floor 14') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_028_F15', 'KTR_028', 15, 'Floor 15') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_029', 'Raman Research park') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F0', 'KTR_029', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F1', 'KTR_029', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F2', 'KTR_029', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F3', 'KTR_029', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F4', 'KTR_029', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F5', 'KTR_029', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F6', 'KTR_029', 6, 'Floor 6') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F7', 'KTR_029', 7, 'Floor 7') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F8', 'KTR_029', 8, 'Floor 8') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_029_F9', 'KTR_029', 9, 'Floor 9') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_030', 'Chemistry research (MCA & MBA)') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_030_F0', 'KTR_030', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_031', 'University Building') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F0', 'KTR_031', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F1', 'KTR_031', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F2', 'KTR_031', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F3', 'KTR_031', 3, 'Floor 3') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F4', 'KTR_031', 4, 'Floor 4') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F5', 'KTR_031', 5, 'Floor 5') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F6', 'KTR_031', 6, 'Floor 6') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F7', 'KTR_031', 7, 'Floor 7') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F8', 'KTR_031', 8, 'Floor 8') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F9', 'KTR_031', 9, 'Floor 9') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F10', 'KTR_031', 10, 'Floor 10') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F11', 'KTR_031', 11, 'Floor 11') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F12', 'KTR_031', 12, 'Floor 12') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F13', 'KTR_031', 13, 'Floor 13') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F14', 'KTR_031', 14, 'Floor 14') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_031_F15', 'KTR_031', 15, 'Floor 15') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_032', 'Chemical Block') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_032_F0', 'KTR_032', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_032_F1', 'KTR_032', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_032_F2', 'KTR_032', 2, 'Floor 2') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_033', 'Director Sports') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_033_F0', 'KTR_033', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_033_F1', 'KTR_033', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_034', 'Transport Service Station') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_034_F0', 'KTR_034', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_035', 'Fab Lab') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_035_F0', 'KTR_035', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_035_F1', 'KTR_035', 1, 'Floor 1') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.buildings (id, name) VALUES ('KTR_036', 'Indoor Game Studio') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floors (id, building_id, level, name) VALUES ('KTR_036_F0', 'KTR_036', 0, 'Ground Floor') ON CONFLICT (id) DO NOTHING;

COMMIT;
