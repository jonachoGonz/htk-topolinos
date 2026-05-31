-- Migration 012: Messaging (student ↔ teacher)
-- Date: 2026-05-31

-- ===================================================================
-- 1. messages table
-- ===================================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair_time
  ON messages(LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own messages" ON messages;
CREATE POLICY "Users read own messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users send messages as themselves" ON messages;
CREATE POLICY "Users send messages as themselves"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Recipient can mark read" ON messages;
CREATE POLICY "Recipient can mark read"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid());

-- ===================================================================
-- 2. RPC: list conversation threads for current user
-- ===================================================================
CREATE OR REPLACE FUNCTION public.list_message_threads()
RETURNS TABLE (
  other_user_id UUID,
  other_user_name TEXT,
  other_user_photo TEXT,
  other_user_role TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH pairs AS (
    SELECT DISTINCT
      CASE WHEN sender_id = v_user THEN recipient_id ELSE sender_id END AS other_id
    FROM messages
    WHERE sender_id = v_user OR recipient_id = v_user
  ),
  latest AS (
    SELECT
      p.other_id,
      (SELECT body FROM messages m
        WHERE (m.sender_id = v_user AND m.recipient_id = p.other_id)
           OR (m.sender_id = p.other_id AND m.recipient_id = v_user)
        ORDER BY m.created_at DESC LIMIT 1) AS last_body,
      (SELECT created_at FROM messages m
        WHERE (m.sender_id = v_user AND m.recipient_id = p.other_id)
           OR (m.sender_id = p.other_id AND m.recipient_id = v_user)
        ORDER BY m.created_at DESC LIMIT 1) AS last_at,
      (SELECT COUNT(*) FROM messages m
        WHERE m.sender_id = p.other_id AND m.recipient_id = v_user AND m.read_at IS NULL) AS unread
    FROM pairs p
  )
  SELECT
    l.other_id,
    pr.full_name,
    pr.photo_url,
    pr.role,
    l.last_body,
    l.last_at,
    l.unread
  FROM latest l
  JOIN profiles pr ON pr.id = l.other_id
  ORDER BY l.last_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.list_message_threads() TO authenticated;

-- ===================================================================
-- 3. RPC: mark thread as read (all messages from a specific user)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.mark_thread_read(p_other_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE messages
  SET read_at = NOW()
  WHERE recipient_id = auth.uid()
    AND sender_id = p_other_id
    AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mark_thread_read(UUID) TO authenticated;

-- ===================================================================
-- 4. Trigger: notify recipient of new message (in-app)
-- ===================================================================
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  PERFORM public.create_notification(
    NEW.recipient_id,
    'admin_message',
    'Nuevo mensaje de ' || COALESCE(v_sender_name, 'un usuario'),
    LEFT(NEW.body, 80),
    '/dashboard?tab=messages',
    jsonb_build_object('sender_id', NEW.sender_id, 'message_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON messages;
CREATE TRIGGER trg_notify_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
