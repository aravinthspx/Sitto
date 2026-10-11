import json
import uuid

buildings_data = [
    # Main Campus
    ("Canteen Block", 5), # G+4
    ("PG Block", 4), # G+3
    ("Aarush Block", 3), # G+2
    ("Hi-Tech Block", 7), # G+6
    ("Mech 'A' Block", 4), # G+3
    ("Mech 'B' Block", 4), # G+3
    ("Mech 'C' Block", 4), # G+3
    ("Mech 'D' Block", 3), # G+2
    ("Mech 'E' Block", 1), # G
    ("Mechanical Hanger", 2), # G+1
    ("Aerospace Hanger", 2), # G+1
    ("Structural Lab & Structural Testing Lab", 2), # G+1
    ("ES Block", 4), # G+3
    ("Automobile Block", 3), # G+2
    ("Main Block", 4), # G+3
    ("Old Library Block", 4), # G+3
    ("Admin Block", 4), # G+3
    ("CRC Block", 9), # G+8
    ("Estate Office", 3), # G+2
    ("Dr.Abdul Kalam Block", 2), # G+1
    ("Police Out post building", 1), # G
    
    # Annexure I
    ("Basic Engineering Lab", 6), # G+5
    ("MBA", 5), # G+4
    ("B.Arch", 6), # G+5
    ("B.Arch - A", 6), # G+5
    ("B.Arch - B", 5), # G+4
    ("Bio Tech", 7), # G+6
    ("Tech park", 16), # G+15
    ("Raman Research park", 10), # G+9
    ("Chemistry research (MCA & MBA)", 1), # G
    
    # Administrative Block
    ("University Building", 16), # G+15
    ("Chemical Block", 3), # G+2
    
    # Road and Sports Area
    ("Director Sports", 2), # G+1
    ("Transport Service Station", 1), # G
    ("Fab Lab", 2), # G+1
    ("Indoor Game Studio", 1), # G
]

sql_statements = []

for i, (name, floors) in enumerate(buildings_data):
    bld_id = f"KTR_{i+1:03d}"
    sql_statements.append(f"INSERT INTO public.buildings (id, name) VALUES ('{bld_id}', '{name}') ON CONFLICT (id) DO NOTHING;")
    for f in range(floors):
        floor_id = f"{bld_id}_F{f}"
        floor_name = "Ground Floor" if f == 0 else f"Floor {f}"
        sql_statements.append(f"INSERT INTO public.floors (id, building_id, level, name) VALUES ('{floor_id}', '{bld_id}', {f}, '{floor_name}') ON CONFLICT (id) DO NOTHING;")

with open("campus_import.sql", "w") as f:
    f.write("\n".join(sql_statements))
