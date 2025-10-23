-- Database triggers for automatic notification sending

-- Function to call external notification API
CREATE OR REPLACE FUNCTION notify_external_api(
  notification_type TEXT,
  notification_data JSONB
) RETURNS void AS $$
DECLARE
  api_url TEXT;
  api_key TEXT;
BEGIN
  -- Get API configuration from environment or settings
  api_url := current_setting('app.notification_api_url', true);
  api_key := current_setting('app.internal_api_key', true);
  
  -- Only proceed if we have the required configuration
  IF api_url IS NOT NULL AND api_key IS NOT NULL THEN
    -- Use pg_net extension to make HTTP request (if available)
    -- This is a placeholder - in production you might use a different approach
    -- such as a queue system or direct function calls
    
    -- For now, we'll insert into a notification_queue table
    INSERT INTO notification_queue (type, data, created_at)
    VALUES (notification_type, notification_data, NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create notification queue table for processing
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Function to handle request status changes
CREATE OR REPLACE FUNCTION handle_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_external_api(
      'request_status_changed',
      jsonb_build_object(
        'requestId', NEW.id,
        'oldStatus', OLD.status,
        'newStatus', NEW.status,
        'studentId', NEW.student_id,
        'lecturerIds', NEW.lecturer_ids,
        'purpose', NEW.purpose,
        'deadline', NEW.deadline
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new request creation
CREATE OR REPLACE FUNCTION handle_request_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_external_api(
    'request_created',
    jsonb_build_object(
      'id', NEW.id,
      'student_id', NEW.student_id,
      'lecturer_ids', NEW.lecturer_ids,
      'purpose', NEW.purpose,
      'deadline', NEW.deadline,
      'status', NEW.status,
      'details', NEW.details
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle payment status changes
CREATE OR REPLACE FUNCTION handle_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_external_api(
      'payment_status_changed',
      jsonb_build_object(
        'id', NEW.id,
        'student_id', NEW.student_id,
        'request_id', NEW.request_id,
        'amount', NEW.amount,
        'status', NEW.status,
        'oldStatus', OLD.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle payout completion
CREATE OR REPLACE FUNCTION handle_payout_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when payout is marked as paid
  IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
    PERFORM notify_external_api(
      'payout_completed',
      jsonb_build_object(
        'lecturerId', NEW.lecturer_id,
        'amount', NEW.amount,
        'paymentId', NEW.payment_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle complaint filing
CREATE OR REPLACE FUNCTION handle_complaint_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_external_api(
    'complaint_filed',
    jsonb_build_object(
      'id', NEW.id,
      'student_id', NEW.student_id,
      'type', NEW.type,
      'subject', NEW.subject,
      'priority', NEW.priority
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_request_creation ON requests;
CREATE TRIGGER trigger_request_creation
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_request_creation();

DROP TRIGGER IF EXISTS trigger_request_status_change ON requests;
CREATE TRIGGER trigger_request_status_change
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_request_status_change();

DROP TRIGGER IF EXISTS trigger_payment_status_change ON payments;
CREATE TRIGGER trigger_payment_status_change
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_status_change();

DROP TRIGGER IF EXISTS trigger_payout_completion ON payouts;
CREATE TRIGGER trigger_payout_completion
  AFTER UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION handle_payout_completion();

DROP TRIGGER IF EXISTS trigger_complaint_creation ON complaints;
CREATE TRIGGER trigger_complaint_creation
  AFTER INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION handle_complaint_creation();

-- Enable RLS on notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policy for notification queue (only system can access)
CREATE POLICY "System can manage notification queue" ON notification_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to process notification queue (to be called by a background job)
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS void AS $$
DECLARE
  queue_item RECORD;
  api_url TEXT;
  api_key TEXT;
BEGIN
  api_url := current_setting('app.notification_api_url', true);
  api_key := current_setting('app.internal_api_key', true);
  
  -- Process unprocessed notifications
  FOR queue_item IN 
    SELECT * FROM notification_queue 
    WHERE processed = FALSE 
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    -- Here you would make the actual HTTP call to your notification API
    -- For now, we'll just mark as processed
    
    UPDATE notification_queue 
    SET processed = TRUE, processed_at = NOW()
    WHERE id = queue_item.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_processed ON notification_queue(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);