BEGIN;

DO $$
DECLARE
    i INT;
    label_val TEXT;
BEGIN
    FOR i IN 1..50 LOOP
        label_val := 'Q' || lpad(i::text, 2, '0');
        INSERT INTO public.seats (space_id, label) 
        VALUES ('LIB001', label_val) 
        ON CONFLICT (space_id, label) DO NOTHING;
    END LOOP;
END $$;

COMMIT;
