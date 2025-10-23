-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student profiles
CREATE TABLE student_profiles (
  id UUID REFERENCES profiles PRIMARY KEY,
  enrollment_year INTEGER NOT NULL,
  completion_year INTEGER NOT NULL,
  contact_info JSONB NOT NULL,
  date_of_birth DATE NOT NULL,
  transcript_urls TEXT[] NOT NULL,
  cv_url TEXT,
  photo_url TEXT
);

-- Lecturer profiles
CREATE TABLE lecturer_profiles (
  id UUID REFERENCES profiles PRIMARY KEY,
  staff_number TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  affiliated_departments TEXT[],
  employment_year INTEGER NOT NULL,
  rank TEXT NOT NULL,
  notification_preferences JSONB NOT NULL,
  payment_details JSONB
);

-- Requests
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('school', 'scholarship', 'job')),
  details JSONB NOT NULL,
  lecturer_ids UUID[] NOT NULL,
  document_urls TEXT[] NOT NULL,
  draft_letter TEXT,
  additional_notes TEXT,
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_acceptance' CHECK (status IN ('pending_acceptance', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled', 'auto_cancelled', 'reassigned')),
  payment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Letters
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests NOT NULL,
  lecturer_id UUID REFERENCES profiles NOT NULL,
  content TEXT NOT NULL,
  attribute_ratings JSONB,
  ai_generated BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  declaration_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles NOT NULL,
  request_id UUID REFERENCES requests NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  receipt_url TEXT,
  failure_reason TEXT,
  refund_id TEXT,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  token_used UUID REFERENCES tokens,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts for lecturers
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID REFERENCES profiles NOT NULL,
  payment_id UUID REFERENCES payments NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  stripe_transfer_id TEXT UNIQUE,
  stripe_account_id TEXT,
  failure_reason TEXT,
  scheduled_date DATE,
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tokens
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  value INTEGER NOT NULL,
  expiry_date DATE NOT NULL,
  created_by UUID REFERENCES profiles NOT NULL,
  used_by UUID REFERENCES profiles,
  used_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs for security and compliance
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL CHECK (category IN ('auth', 'data', 'system', 'security', 'payment', 'notification')),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB,
  threat_type TEXT,
  risk_score INTEGER,
  blocked BOOLEAN DEFAULT FALSE
);

-- Security events for threat detection
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source_ip TEXT NOT NULL,
  user_id UUID REFERENCES profiles,
  details JSONB NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_positive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles
);

-- Rate limiting tracking
CREATE TABLE rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL,
  requests_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session tracking for security
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  logout_reason TEXT
);

-- Failed login attempts tracking
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  failure_reason TEXT NOT NULL
);

-- Complaints
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles NOT NULL,
  request_id UUID REFERENCES requests,
  lecturer_id UUID REFERENCES profiles,
  type TEXT NOT NULL CHECK (type IN ('request_issue', 'lecturer_issue', 'payment_issue', 'technical_issue', 'other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample letters for style analysis
CREATE TABLE sample_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID REFERENCES profiles NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  file_url TEXT,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Style profiles for lecturers
CREATE TABLE style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID REFERENCES profiles UNIQUE NOT NULL,
  style_analysis JSONB NOT NULL,
  embedding_summary VECTOR(1536),
  sample_count INTEGER DEFAULT 0,
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance and security
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

CREATE INDEX idx_security_events_source_ip ON security_events(source_ip);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);

CREATE INDEX idx_rate_limit_events_identifier ON rate_limit_events(identifier);
CREATE INDEX idx_rate_limit_events_endpoint ON rate_limit_events(endpoint);
CREATE INDEX idx_rate_limit_events_window_start ON rate_limit_events(window_start);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_ip_address ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_attempts_attempt_time ON failed_login_attempts(attempt_time);

-- Additional performance indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

CREATE INDEX idx_requests_student_id ON requests(student_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_deadline ON requests(deadline);
CREATE INDEX idx_requests_created_at ON requests(created_at);
CREATE INDEX idx_requests_lecturer_ids ON requests USING GIN(lecturer_ids);

CREATE INDEX idx_letters_request_id ON letters(request_id);
CREATE INDEX idx_letters_lecturer_id ON letters(lecturer_id);
CREATE INDEX idx_letters_submitted_at ON letters(submitted_at);

CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

CREATE INDEX idx_payouts_lecturer_id ON payouts(lecturer_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_scheduled_date ON payouts(scheduled_date);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_tokens_code ON tokens(code);
CREATE INDEX idx_tokens_expiry_date ON tokens(expiry_date);
CREATE INDEX idx_tokens_used_by ON tokens(used_by);

CREATE INDEX idx_complaints_student_id ON complaints(student_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);
CREATE INDEX idx_complaints_created_at ON complaints(created_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_requests_student_status ON requests(student_id, status);
CREATE INDEX idx_requests_lecturer_status ON requests USING GIN(lecturer_ids) WHERE status IN ('pending_acceptance', 'accepted', 'in_progress');
CREATE INDEX idx_payments_student_status ON payments(student_id, status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);

-- Partial indexes for better performance on filtered queries
CREATE INDEX idx_active_requests ON requests(created_at) WHERE status NOT IN ('completed', 'cancelled', 'auto_cancelled');
CREATE INDEX idx_pending_payments ON payments(created_at) WHERE status = 'pending';
CREATE INDEX idx_unread_notifications ON notifications(created_at) WHERE read = false;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Student profiles policies
CREATE POLICY "Students can view own profile" ON student_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Students can update own profile" ON student_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Students can insert own profile" ON student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Lecturers can view student profiles for assigned requests" ON student_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM requests 
      WHERE student_id = student_profiles.id 
      AND auth.uid() = ANY(lecturer_ids)
    )
  );

-- Lecturer profiles policies
CREATE POLICY "Lecturers can view own profile" ON lecturer_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Lecturers can update own profile" ON lecturer_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Lecturers can insert own profile" ON lecturer_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Students can view lecturer profiles" ON lecturer_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'student'
    )
  );

-- Requests policies
CREATE POLICY "Students can view own requests" ON requests
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own requests" ON requests
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Lecturers can view assigned requests" ON requests
  FOR SELECT USING (auth.uid() = ANY(lecturer_ids));

CREATE POLICY "Lecturers can update assigned requests" ON requests
  FOR UPDATE USING (auth.uid() = ANY(lecturer_ids));

-- Letters policies
CREATE POLICY "Lecturers can view own letters" ON letters
  FOR SELECT USING (auth.uid() = lecturer_id);

CREATE POLICY "Lecturers can insert own letters" ON letters
  FOR INSERT WITH CHECK (auth.uid() = lecturer_id);

CREATE POLICY "Lecturers can update own letters" ON letters
  FOR UPDATE USING (auth.uid() = lecturer_id);

-- Payments policies
CREATE POLICY "Students can view own payments" ON payments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own payments" ON payments
  FOR UPDATE USING (auth.uid() = student_id);

-- Payouts policies
CREATE POLICY "Lecturers can view own payouts" ON payouts
  FOR SELECT USING (auth.uid() = lecturer_id);

CREATE POLICY "Admins can view all payouts" ON payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Tokens policies
CREATE POLICY "Admins can manage tokens" ON tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Students can view available tokens" ON tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'student'
    )
    AND used_by IS NULL 
    AND expiry_date > CURRENT_DATE
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Complaints policies
CREATE POLICY "Students can view own complaints" ON complaints
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert own complaints" ON complaints
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can manage all complaints" ON complaints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Lecturers can view complaints about them" ON complaints
  FOR SELECT USING (auth.uid() = lecturer_id);

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Security events policies (admin only)
CREATE POLICY "Admins can manage security events" ON security_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Rate limit events policies (admin only)
CREATE POLICY "Admins can view rate limit events" ON rate_limit_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Failed login attempts policies (admin only)
CREATE POLICY "Admins can view failed login attempts" ON failed_login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Sample letters policies
CREATE POLICY "Lecturers can manage own sample letters" ON sample_letters
  FOR ALL USING (auth.uid() = lecturer_id);

-- Style profiles policies
CREATE POLICY "Lecturers can view own style profile" ON style_profiles
  FOR SELECT USING (auth.uid() = lecturer_id);

CREATE POLICY "Lecturers can update own style profile" ON style_profiles
  FOR UPDATE USING (auth.uid() = lecturer_id);

CREATE POLICY "Lecturers can insert own style profile" ON style_profiles
  FOR INSERT WITH CHECK (auth.uid() = lecturer_id);

-- Storage policies for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);

-- Documents storage policy
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Lecturers can view student documents for assigned requests" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM requests 
      WHERE student_id::text = (storage.foldername(name))[1]
      AND auth.uid() = ANY(lecturer_ids)
    )
  );

-- Photos storage policy
CREATE POLICY "Users can upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_letters_updated_at BEFORE UPDATE ON letters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sample_letters_updated_at BEFORE UPDATE ON sample_letters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_style_profiles_updated_at BEFORE UPDATE ON style_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();