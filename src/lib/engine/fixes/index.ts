/**
 * SupaRalph Fix Rulesets
 * SQL scripts and recommendations to fix detected vulnerabilities
 */

export interface FixRuleset {
	id: string;
	title: string;
	description: string;
	category: string;
	severity: string;
	sqlFix?: string;
	steps: string[];
	references: string[];
}

/**
 * Fix rulesets for each vulnerability type
 */
export const FIX_RULESETS: Record<string, FixRuleset> = {
	// ============================================
	// RLS VULNERABILITIES
	// ============================================
	'rls-no-rls': {
		id: 'rls-no-rls',
		title: 'Enable Row Level Security',
		description: 'Tables without RLS allow anyone to read/write all data',
		category: 'rls',
		severity: 'critical',
		sqlFix: `-- Enable RLS on the table
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (recommended)
ALTER TABLE public.your_table FORCE ROW LEVEL SECURITY;

-- Create policy for authenticated users to access their own data
CREATE POLICY "Users can view own data"
ON public.your_table
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON public.your_table
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON public.your_table
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
ON public.your_table
FOR DELETE
USING (auth.uid() = user_id);`,
		steps: [
			'1. Enable RLS: ALTER TABLE your_table ENABLE ROW LEVEL SECURITY',
			'2. Create SELECT policy with proper USING clause',
			'3. Create INSERT policy with proper WITH CHECK clause',
			'4. Create UPDATE policy with both USING and WITH CHECK',
			'5. Create DELETE policy with USING clause',
			'6. Test with different user contexts'
		],
		references: [
			'https://supabase.com/docs/guides/auth/row-level-security',
			'https://www.postgresql.org/docs/current/ddl-rowsecurity.html'
		]
	},

	'rls-using-true': {
		id: 'rls-using-true',
		title: 'Fix USING(true) Policy',
		description: 'USING(true) allows everyone to access all data - defeats the purpose of RLS',
		category: 'rls',
		severity: 'critical',
		sqlFix: `-- WRONG: This allows everyone to read everything
-- CREATE POLICY "bad_policy" ON public.profiles FOR SELECT USING (true);

-- Drop the bad policy
DROP POLICY IF EXISTS "bad_policy" ON public.profiles;

-- CORRECT: Only allow users to see their own data
CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- For public data, use a specific column check
CREATE POLICY "Public profiles readable"
ON public.profiles
FOR SELECT
USING (is_public = true OR auth.uid() = user_id);`,
		steps: [
			'1. Identify policies with USING(true)',
			'2. Drop these dangerous policies',
			'3. Create new policies that check auth.uid()',
			'4. For public data, use is_public column checks',
			'5. Never use USING(true) for sensitive data'
		],
		references: [
			'https://supabase.com/docs/guides/auth/row-level-security#policies'
		]
	},

	'rls-missing-operations': {
		id: 'rls-missing-operations',
		title: 'Add Missing Operation Policies',
		description: 'Having SELECT policy but missing INSERT/UPDATE/DELETE creates vulnerabilities',
		category: 'rls',
		severity: 'high',
		sqlFix: `-- Check existing policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table';

-- Add missing INSERT policy
CREATE POLICY "Users insert own data"
ON public.your_table
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add missing UPDATE policy
CREATE POLICY "Users update own data"
ON public.your_table
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add missing DELETE policy
CREATE POLICY "Users delete own data"
ON public.your_table
FOR DELETE
USING (auth.uid() = user_id);`,
		steps: [
			'1. List all policies: SELECT * FROM pg_policies WHERE tablename = \'your_table\'',
			'2. Identify missing operations (SELECT, INSERT, UPDATE, DELETE)',
			'3. Add policies for each missing operation',
			'4. UPDATE needs both USING (old row) and WITH CHECK (new row)'
		],
		references: [
			'https://supabase.com/docs/guides/auth/row-level-security#update-policies'
		]
	},

	// ============================================
	// AUTH VULNERABILITIES
	// ============================================
	'auth-weak-password': {
		id: 'auth-weak-password',
		title: 'Enforce Strong Password Policy',
		description: 'Weak passwords like "123456" should be rejected',
		category: 'auth',
		severity: 'high',
		sqlFix: `-- In supabase/config.toml, set:
-- minimum_password_length = 8
-- password_requirements = "lower_upper_letters_digits_symbols"

-- Or via Dashboard: Authentication > Providers > Email
-- Set minimum password length to 8+
-- Enable password strength requirements`,
		steps: [
			'1. Go to Supabase Dashboard > Authentication > Providers',
			'2. Set minimum password length to at least 8',
			'3. Enable password requirements: lowercase, uppercase, digits, symbols',
			'4. Consider adding a password strength meter in your UI',
			'5. Implement password breach checking (haveibeenpwned API)'
		],
		references: [
			'https://supabase.com/docs/guides/auth/passwords'
		]
	},

	'auth-rate-limit': {
		id: 'auth-rate-limit',
		title: 'Enable Login Rate Limiting',
		description: 'Unlimited login attempts allow brute force attacks',
		category: 'auth',
		severity: 'high',
		sqlFix: `-- Rate limiting is configured in Dashboard or config.toml
-- In config.toml:
[auth.rate_limit]
sign_in_sign_ups = 10  # Max 10 attempts per 5 minutes
token_refresh = 30      # Max refresh attempts

-- Also implement application-level rate limiting
-- using middleware or Edge Functions`,
		steps: [
			'1. Dashboard > Authentication > Rate Limits',
			'2. Set sign-in attempts to 10 per 5 minutes',
			'3. Enable CAPTCHA for repeated failures',
			'4. Implement account lockout after N failures',
			'5. Add delay between failed attempts'
		],
		references: [
			'https://supabase.com/docs/guides/auth/auth-rate-limits'
		]
	},

	// ============================================
	// API/INFRASTRUCTURE VULNERABILITIES
	// ============================================
	'api-security-headers': {
		id: 'api-security-headers',
		title: 'Add Security Headers',
		description: 'Missing headers like X-Frame-Options, CSP expose to XSS/clickjacking',
		category: 'api',
		severity: 'medium',
		sqlFix: `-- Security headers are set in your frontend/Edge Functions
-- For Next.js (next.config.js):
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "default-src 'self'" }
];

-- For Edge Functions, return headers in response:
return new Response(body, {
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'"
  }
});`,
		steps: [
			'1. Add X-Frame-Options: DENY to prevent clickjacking',
			'2. Add X-Content-Type-Options: nosniff',
			'3. Add Strict-Transport-Security for HTTPS',
			'4. Configure Content-Security-Policy',
			'5. Test with securityheaders.com'
		],
		references: [
			'https://securityheaders.com/',
			'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers'
		]
	},

	'api-cors': {
		id: 'api-cors',
		title: 'Fix CORS Configuration',
		description: 'Allowing any origin enables cross-site attacks',
		category: 'api',
		severity: 'high',
		sqlFix: `-- In your Edge Function or API handler:
const allowedOrigins = [
  'https://yourdomain.com',
  'https://app.yourdomain.com'
];

const origin = request.headers.get('Origin');
if (allowedOrigins.includes(origin)) {
  headers.set('Access-Control-Allow-Origin', origin);
}

// NEVER do this in production:
// headers.set('Access-Control-Allow-Origin', '*');`,
		steps: [
			'1. Define explicit list of allowed origins',
			'2. Never use Access-Control-Allow-Origin: *',
			'3. Validate Origin header against allowlist',
			'4. Be careful with Access-Control-Allow-Credentials',
			'5. Test with different origins to verify'
		],
		references: [
			'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS'
		]
	},

	'api-graphql-introspection': {
		id: 'api-graphql-introspection',
		title: 'Disable GraphQL Introspection in Production',
		description: 'Introspection exposes your entire schema to attackers',
		category: 'api',
		severity: 'medium',
		sqlFix: `-- Supabase GraphQL introspection can't be disabled directly
-- but you can limit exposure by:

-- 1. Use RLS to protect sensitive data
-- 2. Don't expose sensitive tables via GraphQL
-- 3. Revoke anon access to sensitive tables:
REVOKE ALL ON public.sensitive_table FROM anon;

-- 4. Use Edge Functions as API layer instead of direct GraphQL`,
		steps: [
			'1. Review which tables are exposed via GraphQL',
			'2. Apply proper RLS policies to all tables',
			'3. Consider using Edge Functions as API layer',
			'4. Revoke anon access to sensitive tables',
			'5. Monitor GraphQL queries for abuse'
		],
		references: [
			'https://supabase.com/docs/guides/graphql'
		]
	},

	// ============================================
	// BUSINESS LOGIC VULNERABILITIES
	// ============================================
	'logic-quantity-abuse': {
		id: 'logic-quantity-abuse',
		title: 'Validate Quantities Server-Side',
		description: 'Negative quantities or extreme values should be rejected',
		category: 'business-logic',
		severity: 'high',
		sqlFix: `-- Add CHECK constraints to prevent invalid values
ALTER TABLE public.cart_items
ADD CONSTRAINT quantity_positive CHECK (quantity > 0 AND quantity <= 1000);

-- Or use a trigger for more complex validation
CREATE OR REPLACE FUNCTION validate_cart_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF NEW.quantity > 1000 THEN
    RAISE EXCEPTION 'Quantity exceeds maximum';
  END IF;
  -- Prevent price override if column exists
  IF NEW.price_override IS NOT NULL THEN
    RAISE EXCEPTION 'Price override not allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cart_item_validation
BEFORE INSERT OR UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION validate_cart_item();`,
		steps: [
			'1. Add CHECK constraints for valid ranges',
			'2. Create validation triggers for complex logic',
			'3. Never trust client-provided prices',
			'4. Calculate prices server-side from product table',
			'5. Log suspicious values for review'
		],
		references: [
			'https://www.postgresql.org/docs/current/ddl-constraints.html'
		]
	},

	// ============================================
	// SENSITIVE DATA EXPOSURE
	// ============================================
	'data-sensitive-exposure': {
		id: 'data-sensitive-exposure',
		title: 'Protect Sensitive Data',
		description: 'SSN, credit cards, passwords should never be returned in API responses',
		category: 'data',
		severity: 'critical',
		sqlFix: `-- Option 1: Use column-level security
REVOKE SELECT (ssn, credit_card, password_hash)
ON public.users FROM anon, authenticated;

-- Option 2: Create a view that excludes sensitive columns
CREATE VIEW public.users_safe AS
SELECT id, email, full_name, created_at
FROM public.users;

-- Grant access to the safe view instead
GRANT SELECT ON public.users_safe TO authenticated;

-- Option 3: Use computed columns with masking
CREATE OR REPLACE FUNCTION masked_ssn(users)
RETURNS TEXT AS $$
  SELECT '***-**-' || RIGHT($1.ssn, 4);
$$ LANGUAGE SQL SECURITY DEFINER;`,
		steps: [
			'1. Identify all columns with sensitive data',
			'2. Never expose passwords, SSN, full credit card numbers',
			'3. Use column-level REVOKE or safe views',
			'4. Implement data masking for display purposes',
			'5. Encrypt sensitive data at rest (Vault)'
		],
		references: [
			'https://supabase.com/docs/guides/database/vault'
		]
	}
};

/**
 * Get fix ruleset for a vulnerability
 */
export function getFixForVulnerability(attackId: string): FixRuleset | undefined {
	// Map attack IDs to fix rulesets
	const mappings: Record<string, string> = {
		'rls-anon-select-all': 'rls-no-rls',
		'rls-missing-policy': 'rls-missing-operations',
		'vibecoder-rls-disabled': 'rls-no-rls',
		'vibecoder-using-true': 'rls-using-true',
		'auth-weak-password': 'auth-weak-password',
		'auth-rate-limit-login': 'auth-rate-limit',
		'infra-security-headers': 'api-security-headers',
		'vibecoder-cors-misconfiguration': 'api-cors',
		'infra-graphql-introspection': 'api-graphql-introspection',
		'logic-quantity-abuse': 'logic-quantity-abuse'
	};

	const fixId = mappings[attackId] || attackId;
	return FIX_RULESETS[fixId];
}

/**
 * Generate SQL fix script for all vulnerabilities in a report
 */
export function generateFixScript(vulnerabilities: Array<{ attackId: string; title: string }>): string {
	const fixes: string[] = [
		'-- ============================================',
		'-- SUPARALPH AUTO-GENERATED FIX SCRIPT',
		`-- Generated: ${new Date().toISOString()}`,
		'-- ============================================',
		'',
		'-- IMPORTANT: Review each fix before applying!',
		'-- Some fixes may need customization for your schema.',
		''
	];

	for (const vuln of vulnerabilities) {
		const fix = getFixForVulnerability(vuln.attackId);
		if (fix?.sqlFix) {
			fixes.push(`-- ============================================`);
			fixes.push(`-- FIX: ${vuln.title}`);
			fixes.push(`-- Severity: ${fix.severity.toUpperCase()}`);
			fixes.push(`-- ============================================`);
			fixes.push('');
			fixes.push(fix.sqlFix);
			fixes.push('');
		}
	}

	return fixes.join('\n');
}
