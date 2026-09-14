ALTER TABLE public.games ALTER COLUMN display_order DROP NOT NULL;
ALTER TABLE public.games ALTER COLUMN display_order DROP DEFAULT;
UPDATE public.games SET display_order = NULL WHERE display_order = 0;