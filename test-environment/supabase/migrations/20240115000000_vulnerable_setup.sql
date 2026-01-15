-- ============================================
-- SUPARALPH VULNERABILITY TEST SUITE
-- Intentionally vulnerable configurations
-- DO NOT USE IN PRODUCTION!
-- ============================================

-- ============================================
-- SCENARIO 1: NO RLS (CRITICAL)
-- Tables without Row Level Security enabled
-- ============================================

CREATE TABLE public.users_no_rls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT, -- Storing passwords (bad practice)
    api_key TEXT, -- Storing API keys in plain text
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS enabled - anyone can access all data
INSERT INTO public.users_no_rls (email, password_hash, api_key) VALUES
    ('admin@example.com', 'hashed_password_123', 'sk_live_secret_key_12345'),
    ('user@example.com', 'hashed_password_456', 'sk_test_another_key_67890');

-- ============================================
-- SCENARIO 2: RLS WITH USING(true) - CRITICAL
-- The classic vibecoder mistake
-- ============================================

CREATE TABLE public.profiles_bad_rls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    full_name TEXT,
    ssn TEXT, -- Sensitive data
    credit_card TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles_bad_rls ENABLE ROW LEVEL SECURITY;

-- VULNERABILITY: USING (true) allows everyone to read all data
CREATE POLICY "Anyone can read profiles" ON public.profiles_bad_rls
    FOR SELECT USING (true);

-- VULNERABILITY: USING (true) allows everyone to insert
CREATE POLICY "Anyone can insert profiles" ON public.profiles_bad_rls
    FOR INSERT WITH CHECK (true);

INSERT INTO public.profiles_bad_rls (user_id, full_name, ssn, credit_card) VALUES
    (gen_random_uuid(), 'John Doe', '123-45-6789', '4111111111111111'),
    (gen_random_uuid(), 'Jane Smith', '987-65-4321', '5500000000000004');

-- ============================================
-- SCENARIO 3: MISSING DELETE/UPDATE POLICIES
-- Read-only RLS but write is open
-- ============================================

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Only SELECT is protected, but DELETE/UPDATE are missing
CREATE POLICY "Users read own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Missing: No INSERT, UPDATE, DELETE policies = denied by default
-- But let's add a bad one:
CREATE POLICY "Anyone can delete orders" ON public.orders
    FOR DELETE USING (true);

INSERT INTO public.orders (user_id, total_amount, status) VALUES
    (gen_random_uuid(), 999.99, 'completed'),
    (gen_random_uuid(), 1500.00, 'pending');

-- ============================================
-- SCENARIO 4: HORIZONTAL PRIVILEGE ESCALATION
-- Can access other users' data via query manipulation
-- ============================================

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- VULNERABILITY: OR condition allows bypass
CREATE POLICY "Read messages" ON public.messages
    FOR SELECT USING (
        sender_id = auth.uid()
        OR receiver_id = auth.uid()
        OR is_private = false  -- This allows reading ALL non-private messages
    );

INSERT INTO public.messages (sender_id, receiver_id, content, is_private) VALUES
    (gen_random_uuid(), gen_random_uuid(), 'Secret corporate data', false),
    (gen_random_uuid(), gen_random_uuid(), 'Confidential message', true);

-- ============================================
-- SCENARIO 5: PRICE MANIPULATION (Business Logic)
-- No server-side price validation
-- ============================================

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER,
    price_override DECIMAL(10,2), -- VULNERABILITY: Client can set their own price!
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING (true);

INSERT INTO public.products (name, price) VALUES
    ('Premium Subscription', 99.99),
    ('Enterprise License', 999.99);

-- ============================================
-- SCENARIO 6: IDOR (Insecure Direct Object Reference)
-- Sequential IDs allow enumeration
-- ============================================

CREATE TABLE public.documents (
    id SERIAL PRIMARY KEY, -- VULNERABILITY: Sequential IDs
    owner_id UUID,
    title TEXT,
    content TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- VULNERABILITY: No owner check for public documents
CREATE POLICY "Read documents" ON public.documents
    FOR SELECT USING (is_public = true OR owner_id = auth.uid());

INSERT INTO public.documents (owner_id, title, content, is_public) VALUES
    (gen_random_uuid(), 'Public Doc', 'This is public', true),
    (gen_random_uuid(), 'Private Doc', 'Secret content', false),
    (gen_random_uuid(), 'Another Private', 'More secrets', false);

-- ============================================
-- SCENARIO 7: SQL INJECTION VECTORS
-- Functions vulnerable to injection
-- ============================================

CREATE OR REPLACE FUNCTION public.search_users(search_term TEXT)
RETURNS SETOF public.users_no_rls
LANGUAGE plpgsql
SECURITY DEFINER -- VULNERABILITY: Runs with elevated privileges
AS $$
BEGIN
    -- VULNERABILITY: Direct string concatenation
    RETURN QUERY EXECUTE 'SELECT * FROM public.users_no_rls WHERE email LIKE ''%' || search_term || '%''';
END;
$$;

-- Grant execute to anon - allows unauthenticated access
GRANT EXECUTE ON FUNCTION public.search_users TO anon;

-- ============================================
-- SCENARIO 8: STORAGE BUCKET MISCONFIG
-- (Simulated via table - actual bucket would need Supabase setup)
-- ============================================

CREATE TABLE public.file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket TEXT,
    path TEXT,
    owner_id UUID,
    is_public BOOLEAN DEFAULT true, -- VULNERABILITY: Default public
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- VULNERABILITY: Anyone can read all file paths
CREATE POLICY "Read file metadata" ON public.file_metadata
    FOR SELECT USING (true);

INSERT INTO public.file_metadata (bucket, path, owner_id, is_public) VALUES
    ('avatars', 'users/admin/profile.jpg', gen_random_uuid(), true),
    ('documents', 'confidential/financials.pdf', gen_random_uuid(), false),
    ('backups', 'database/dump.sql', gen_random_uuid(), false);

-- ============================================
-- SCENARIO 9: AUTH BYPASS VECTORS
-- Weak auth-related configurations
-- ============================================

CREATE TABLE public.api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    token TEXT, -- VULNERABILITY: Tokens in plain text
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- VULNERABILITY: Anon can read all tokens
CREATE POLICY "Read tokens" ON public.api_tokens
    FOR SELECT USING (true);

INSERT INTO public.api_tokens (user_id, token, expires_at) VALUES
    (gen_random_uuid(), 'token_abc123_secret', NOW() + INTERVAL '1 year'),
    (gen_random_uuid(), 'token_xyz789_admin', NOW() + INTERVAL '1 year');

-- ============================================
-- SCENARIO 10: REALTIME CHANNEL EXPOSURE
-- (Simulated - actual realtime needs config)
-- ============================================

CREATE TABLE public.live_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.live_data ENABLE ROW LEVEL SECURITY;

-- VULNERABILITY: All channels readable
CREATE POLICY "Read live data" ON public.live_data
    FOR SELECT USING (true);

INSERT INTO public.live_data (channel, payload) VALUES
    ('admin-notifications', '{"type": "alert", "message": "Server credentials rotated"}'),
    ('user-activity', '{"user": "admin", "action": "logged_in", "ip": "192.168.1.1"}');

-- ============================================
-- GRANT PERMISSIONS TO ANON AND AUTHENTICATED
-- This enables the attack vectors to work
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- SECURE TABLES FOR COMPARISON
-- These should pass the security tests
-- ============================================

CREATE TABLE public.secure_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.secure_profiles ENABLE ROW LEVEL SECURITY;

-- SECURE: Proper user-based access control
CREATE POLICY "Users read own profile" ON public.secure_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own profile" ON public.secure_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile" ON public.secure_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No delete policy = delete denied (secure default)

CREATE TABLE public.secure_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid(),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.secure_orders ENABLE ROW LEVEL SECURITY;

-- SECURE: Complete policy coverage
CREATE POLICY "Users manage own orders" ON public.secure_orders
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
