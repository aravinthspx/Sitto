import re
import uuid

# Map prefix to building ID
prefixes = {
    'H': 'KTR_004',      # Hi-Tech Block
    'TP': 'KTR_028',     # Tech Park
    'B': 'KTR_027',      # Bio Tech
    'ESB': 'KTR_013',    # ES Block
    'L': 'KTR_016',      # Old Library Block
    'A': 'KTR_015',      # Main Block (or B.Arch)
    'AA': 'KTR_025',     # B.Arch - A
    'MA': 'KTR_005',     # Mech A
    'M': 'KTR_015',      # Main Block
}

lines = open('pdf_text.txt', encoding='utf-8').read().splitlines()
sql = ['BEGIN;']

def get_floor_num(room_code):
    match = re.search(r'\d{3,4}', room_code)
    if match:
        num = match.group(0)
        if len(num) == 4:
            return int(num[:2])
        else:
            return int(num[:1])
    return 0

for i, line in enumerate(lines):
    room = line.strip()
    match = re.match(r'^([A-Z]{1,3})\s*(\d{3,4}.*)$', room)
    if not match: continue
    
    cap_line = lines[i+2].strip()
    if not cap_line.isdigit(): continue
    capacity = int(cap_line)
    
    prefix = match.group(1)
    if prefix not in prefixes:
        if prefix == 'M': b_id = 'KTR_015'
        elif prefix == 'MA': b_id = 'KTR_005'
        elif prefix == 'A': b_id = 'KTR_024' # B.Arch
        elif prefix == 'AA': b_id = 'KTR_025' # B.Arch - A
        else: continue
    else:
        b_id = prefixes[prefix]
        
    f_num = get_floor_num(room)
    # cap max floor based on limits from generate_campus.py
    if b_id == 'KTR_027' and f_num > 6: f_num = 6
    if b_id == 'KTR_015' and f_num > 3: f_num = 3 
    if b_id == 'KTR_016' and f_num > 3: f_num = 3
    if b_id == 'KTR_028' and f_num > 15: f_num = 15
    if b_id == 'KTR_004' and f_num > 6: f_num = 6
    if b_id == 'KTR_005' and f_num > 3: f_num = 3
    if b_id == 'KTR_024' and f_num > 5: f_num = 5
    if b_id == 'KTR_025' and f_num > 5: f_num = 5
    if b_id == 'KTR_013' and f_num > 3: f_num = 3
    
    floor_id = f'{b_id}_F{f_num}'
    # Use a deterministic UUID for reproducibility so we don't duplicate on re-run if it wasn't UUID PK, 
    # but ID is TEXT, so we can just use the room name as ID to be strictly idempotent!
    space_id = f"{floor_id}_{room.replace(' ', '_').replace('/', '_').replace(',', '')}"
    
    room_type = 'Lab' if 'Lab' in room or 'L' in prefix else 'Classroom'
    
    sql.append(f"INSERT INTO public.spaces (id, name, type, floor_id, capacity) VALUES ('{space_id}', '{room}', '{room_type}', '{floor_id}', {capacity}) ON CONFLICT (id) DO NOTHING;")

sql.append('COMMIT;')

with open('campus_spaces_import.sql', 'w') as f:
    f.write('\n'.join(sql))

print(len(sql)-2, 'spaces generated.')
