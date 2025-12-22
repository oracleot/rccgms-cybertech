-- ===========================================
-- Migration 012: Notifications Tables
-- ===========================================

-- Notification log (for audit and retry)
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- e.g., 'rota_reminder', 'swap_request'
  channel notification_channel NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}', -- Additional data
  sent_at timestamptz,
  read_at timestamptz,
  status notification_status NOT NULL DEFAULT 'pending',
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications; admins can view all
CREATE POLICY "View notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can mark their own as read; admins can update any
CREATE POLICY "Update notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Notification preferences (per-user settings)
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- e.g., 'rota_reminder'
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  reminder_timing text DEFAULT '1_day', -- When to remind
  
  UNIQUE(user_id, notification_type)
);

-- Indexes
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own preferences
CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
