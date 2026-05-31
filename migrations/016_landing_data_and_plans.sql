-- Migration 016: Landing data + plan visibility/order
-- Date: 2026-05-31

-- ===================================================================
-- 1. app_settings: add social/contact + branding fields
-- ===================================================================
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Seed default HTK data (only if values are empty/null)
UPDATE app_settings SET
  center_name       = COALESCE(NULLIF(center_name, ''), 'HTK Center'),
  center_address    = COALESCE(NULLIF(center_address, ''), 'José Domingo Cañas #1563'),
  center_phone      = COALESCE(NULLIF(center_phone, ''), '+56994748507'),
  center_email      = COALESCE(NULLIF(center_email, ''), 'htkcenter@gmail.com'),
  whatsapp_phone    = COALESCE(NULLIF(whatsapp_phone, ''), '+56994748507'),
  instagram_url     = COALESCE(NULLIF(instagram_url, ''), 'https://www.instagram.com/htk_center'),
  tiktok_handle     = COALESCE(NULLIF(tiktok_handle, ''), 'HTK.center'),
  tagline           = COALESCE(NULLIF(tagline, ''), 'Excelencia en deporte y kinesiología de alto rendimiento')
WHERE id = 1;

-- ===================================================================
-- 2. plan_templates: visibility on landing + display order
-- ===================================================================
ALTER TABLE plan_templates
  ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS highlight BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS badge_text TEXT;

CREATE INDEX IF NOT EXISTS idx_plan_templates_landing
  ON plan_templates(show_on_landing, display_order) WHERE is_active = TRUE;

-- ===================================================================
-- 3. RLS for plan_templates landing visibility (already covered by
--    "Anyone can read active plan_templates" — landing reads same path)
-- ===================================================================

NOTIFY pgrst, 'reload schema';
