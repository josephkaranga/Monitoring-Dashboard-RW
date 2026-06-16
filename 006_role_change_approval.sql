



















-- ROLE CHANGE APPROVAL WORKFLOW
-- Migration: 006_role_change_approval.sql
-- ============================================================

-- ── CREATE ENUM TYPE ─────────────────────────────────────────
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'stale');

-- ── CREATE TABLE ─────────────────────────────────────────────
CREATE TABLE public.role_change_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_role         TEXT NOT NULL,
  to_role           TEXT NOT NULL,
  justification     TEXT NOT NULL CHECK (LENGTH(justification) >= 20),
  status            request_status NOT NULL DEFAULT 'pending',
  
  -- Approval/Rejection fields
  reviewed_by       UUID REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,
  review_note       TEXT,
  rejection_reason  TEXT,
  
  -- Metadata
  is_notified       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT rejection_requires_reason CHECK (
    status != 'rejected' OR (rejection_reason IS NOT NULL AND LENGTH(rejection_reason) >= 10)
  ),
  CONSTRAINT no_self_approval CHECK (
    reviewed_by IS NULL OR reviewed_by != user_id
  )
);

-- ── CREATE INDEXES ───────────────────────────────────────────
CREATE INDEX idx_role_change_requests_user_id ON public.role_change_requests(user_id);
CREATE INDEX idx_role_change_requests_status ON public.role_change_requests(status);
CREATE INDEX idx_role_change_requests_created_at ON public.role_change_requests(created_at DESC);
CREATE INDEX idx_role_change_requests_reviewed_by ON public.role_change_requests(reviewed_by);

-- ── FUNCTION: Notify Admins of New Request ───────────────────
CREATE OR REPLACE FUNCTION public.notify_admins_of_role_request()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  requester_name TEXT;
BEGIN
  -- Get requester's name
  SELECT full_name INTO requester_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notify all REMA Administrators
  FOR admin_record IN
    SELECT id FROM public.profiles
    WHERE role = 'dashboard_management' AND is_active = TRUE
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, action_tab, action_label)
    VALUES (
      admin_record.id,
      'New Role Change Request',
      requester_name || ' has requested to change their role from ' || 
      NEW.from_role || ' to ' || NEW.to_role || '. Justification: ' || 
      LEFT(NEW.justification, 100) || '...',
      'info',
      'role-requests',
      'Review Request'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_role_request_created
  AFTER INSERT ON public.role_change_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_admins_of_role_request();

-- ── FUNCTION: Apply Approved Role Change ─────────────────────
CREATE OR REPLACE FUNCTION public.apply_approved_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update user's role in profiles table
    UPDATE public.profiles
    SET role = NEW.to_role,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Log the role change in audit_log
    INSERT INTO public.audit_log (user_id, action_type, action, detail, role)
    VALUES (
      NEW.user_id,
      'role_updated',
      'Role changed via approval workflow',
      'Changed from ' || NEW.from_role || ' to ' || NEW.to_role || 
      ' by admin ' || NEW.reviewed_by,
      NEW.to_role::TEXT
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_role_request_approved
  AFTER UPDATE ON public.role_change_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.apply_approved_role_change();

-- ── FUNCTION: Notify User of Decision ────────────────────────
CREATE OR REPLACE FUNCTION public.notify_user_of_decision()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only proceed if status changed to approved or rejected
  IF (NEW.status IN ('approved', 'rejected')) AND 
     (OLD.status != NEW.status) AND 
     (NEW.is_notified = FALSE) THEN
    
    IF NEW.status = 'approved' THEN
      notification_title := 'Role Change Request Approved';
      notification_message := 'Your request to change your role to ' || NEW.to_role || 
                             ' has been approved. The change is now effective.';
      notification_type := 'success';
    ELSE
      notification_title := 'Role Change Request Rejected';
      notification_message := 'Your request to change your role to ' || NEW.to_role || 
                             ' has been rejected. Reason: ' || NEW.rejection_reason;
      notification_type := 'warning';
    END IF;
    
    -- Send notification to user
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.user_id, notification_title, notification_message, notification_type);
    
    -- Mark as notified
    UPDATE public.role_change_requests
    SET is_notified = TRUE
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_role_request_decided
  AFTER UPDATE ON public.role_change_requests
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION public.notify_user_of_decision();

-- ── FUNCTION: Flag Stale Requests ────────────────────────────
CREATE OR REPLACE FUNCTION public.flag_stale_role_requests()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.role_change_requests
  SET status = 'stale'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── FUNCTION: Auto-update updated_at ─────────────────────────
CREATE TRIGGER set_updated_at_role_change_requests
  BEFORE UPDATE ON public.role_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users view own role change requests"
  ON public.role_change_requests FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own requests
CREATE POLICY "Users submit role change requests"
  ON public.role_change_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Users can cancel their own pending requests
CREATE POLICY "Users cancel own pending requests"
  ON public.role_change_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (status = 'cancelled');

-- Admins can view all requests
CREATE POLICY "Admins view all role change requests"
  ON public.role_change_requests FOR SELECT
  USING (is_admin());

-- Admins can approve/reject requests (but not their own)
CREATE POLICY "Admins approve or reject requests"
  ON public.role_change_requests FOR UPDATE
  USING (is_admin() AND user_id != auth.uid())
  WITH CHECK (status IN ('approved', 'rejected') AND reviewed_by = auth.uid());
