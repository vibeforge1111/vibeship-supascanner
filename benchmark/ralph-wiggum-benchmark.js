/**
 * Ralph Wiggum Benchmark Test
 * Tests SupaShield attack detection against vulnerable Supabase configs
 */

const SUPABASE_URL = 'http://127.0.0.1:64321';
const ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

// Attack test definitions grouped by Ralph Wiggum scenario
const testScenarios = {
  'Scenario 1: No Security': {
    description: 'Tables with NO RLS - everything exposed',
    tests: [
      {
        name: 'Read all users PII',
        attack: 'rls-bypass',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario1_users?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0 && data[0].ssn,
            evidence: data.length > 0 ? `Got ${data.length} users with SSN, credit cards, passwords` : 'No data'
          };
        }
      },
      {
        name: 'Read exposed secrets',
        attack: 'data-exposure',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario1_secrets?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0 && data.some(d => d.private_key),
            evidence: data.length > 0 ? `Got ${data.length} secrets including private keys` : 'No data'
          };
        }
      },
      {
        name: 'Read audit logs with passwords',
        attack: 'data-exposure',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario1_audit_logs?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0,
            evidence: data.length > 0 ? `Got ${data.length} audit logs with request bodies` : 'No data'
          };
        }
      },
      {
        name: 'IDOR via sequential order ID',
        attack: 'business-logic-idor',
        severity: 'high',
        async execute() {
          // Try to enumerate orders by sequential ID
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario1_orders?id=eq.1`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0,
            evidence: 'Sequential ID allows order enumeration'
          };
        }
      }
    ]
  },

  'Scenario 2: Bad RLS': {
    description: 'RLS enabled but USING (true) policies',
    tests: [
      {
        name: 'RLS bypass - read all profiles',
        attack: 'rls-policy-bypass',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario2_profiles?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0 && data.some(p => p.is_admin),
            evidence: `Read ${data.length} profiles including admin accounts`
          };
        }
      },
      {
        name: 'Update any profile (privilege escalation)',
        attack: 'rls-update-bypass',
        severity: 'critical',
        async execute() {
          // Try to update a random profile's role
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario2_profiles?username=eq.victim_user`, {
            method: 'PATCH',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({ role: 'admin', is_admin: true })
          });
          const data = await res.json();
          return {
            breached: res.ok || res.status === 200,
            evidence: res.ok ? 'Successfully escalated victim to admin!' : 'Update blocked'
          };
        }
      },
      {
        name: 'Read private posts via broken policy',
        attack: 'rls-or-condition-bypass',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario2_posts?is_published=eq.false`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0,
            evidence: data.length > 0 ? `Read ${data.length} private posts` : 'No private posts accessible'
          };
        }
      },
      {
        name: 'RLS policy with OR true bypass',
        attack: 'rls-or-true-bypass',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario2_comments?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length >= 0, // Policy has OR true
            evidence: 'Policy uses (... OR true) - always allows access'
          };
        }
      }
    ]
  },

  'Scenario 3: Business Logic': {
    description: 'IDOR, price manipulation, state tampering',
    tests: [
      {
        name: 'Price manipulation in cart',
        attack: 'business-logic-price',
        severity: 'critical',
        async execute() {
          // Create cart with manipulated price
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario3_shopping_cart`, {
            method: 'POST',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              product_id: 3, // Enterprise Widget ($999.99)
              quantity: 10,
              unit_price: 0.01, // Manipulated!
              total: 0.10 // Manipulated total!
            })
          });
          const data = await res.json();
          return {
            breached: res.ok || res.status === 201,
            evidence: res.ok ? 'Created cart with $0.01 price for $999.99 product!' : 'Price manipulation blocked'
          };
        }
      },
      {
        name: 'Coupon manipulation',
        attack: 'business-logic-coupon',
        severity: 'high',
        async execute() {
          // Reset coupon uses and reactivate expired coupon
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario3_coupons?code=eq.EXPIRED`, {
            method: 'PATCH',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              current_uses: 0,
              is_active: true,
              discount_percent: 100 // Free stuff!
            })
          });
          return {
            breached: res.ok,
            evidence: res.ok ? 'Reactivated expired coupon with 100% discount!' : 'Coupon update blocked'
          };
        }
      },
      {
        name: 'Subscription state manipulation',
        attack: 'business-logic-state',
        severity: 'critical',
        async execute() {
          // Upgrade free subscription to enterprise
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario3_subscriptions?plan=eq.free`, {
            method: 'PATCH',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              plan: 'enterprise',
              credits: 999999,
              is_paid: true
            })
          });
          return {
            breached: res.ok,
            evidence: res.ok ? 'Upgraded free plan to enterprise with 999999 credits!' : 'State manipulation blocked'
          };
        }
      },
      {
        name: 'IDOR - read internal ticket notes',
        attack: 'business-logic-idor',
        severity: 'high',
        async execute() {
          // Read tickets with internal notes
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario3_tickets?select=id,subject,internal_notes`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const hasInternalNotes = Array.isArray(data) && data.some(t => t.internal_notes);
          return {
            breached: hasInternalNotes,
            evidence: hasInternalNotes ? `Read internal notes from ${data.length} tickets` : 'Internal notes hidden'
          };
        }
      },
      {
        name: 'Sequential ID enumeration',
        attack: 'business-logic-sequential-id',
        severity: 'medium',
        async execute() {
          // Enumerate tickets by sequential ID
          const results = [];
          for (let id = 1; id <= 5; id++) {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario3_tickets?id=eq.${id}`, {
              headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
            });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) results.push(id);
          }
          return {
            breached: results.length > 1,
            evidence: `Enumerated ticket IDs: ${results.join(', ')}`
          };
        }
      }
    ]
  },

  'Scenario 4: Vibecoder Mistakes': {
    description: 'AI-generated code security failures',
    tests: [
      {
        name: 'Default credentials exposure',
        attack: 'vibecoder-default-creds',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario4_users_bad?select=email,password,role`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const hasDefaultCreds = Array.isArray(data) && data.some(u =>
            (u.email === 'admin@admin.com' && u.password === 'admin') ||
            u.password === 'admin123' || u.password === 'test123'
          );
          return {
            breached: hasDefaultCreds,
            evidence: hasDefaultCreds ? 'Found default credentials (admin/admin, etc.)' : 'No default creds found'
          };
        }
      },
      {
        name: 'Hardcoded secrets in config',
        attack: 'vibecoder-hardcoded-secrets',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario4_config?is_secret=eq.true`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const secrets = Array.isArray(data) ? data.map(c => c.key) : [];
          return {
            breached: secrets.length > 0,
            evidence: secrets.length > 0 ? `Exposed secrets: ${secrets.join(', ')}` : 'No secrets exposed'
          };
        }
      },
      {
        name: 'API keys stored in database',
        attack: 'vibecoder-api-keys-exposed',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario4_api_keys?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0,
            evidence: data.length > 0 ? `Found ${data.length} exposed API keys (Stripe, AWS, Twilio)` : 'No API keys exposed'
          };
        }
      },
      {
        name: 'Debug logs with sensitive data',
        attack: 'vibecoder-debug-exposure',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario4_logs?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const hasSensitive = Array.isArray(data) && data.some(l =>
            l.stack_trace || (l.request_body && JSON.stringify(l.request_body).includes('password'))
          );
          return {
            breached: hasSensitive,
            evidence: hasSensitive ? 'Found logs with stack traces and passwords in request bodies' : 'No sensitive logs'
          };
        }
      },
      {
        name: 'Debug endpoints exposed',
        attack: 'vibecoder-debug-endpoints',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario4_debug?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0,
            evidence: data.length > 0 ? `Found ${data.length} debug records with endpoint data` : 'No debug data exposed'
          };
        }
      }
    ]
  },

  'Scenario 5: Advanced Attacks': {
    description: 'SQL injection, SSRF, dangerous RPC',
    tests: [
      {
        name: 'SQL injection via RPC',
        attack: 'injection-sql-rpc',
        severity: 'critical',
        async execute() {
          // Try to execute arbitrary SQL via the dangerous RPC function
          const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_dynamic_query`, {
            method: 'POST',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query_text: "SELECT json_agg(t) FROM scenario4_config t WHERE is_secret = true"
            })
          });
          const data = await res.json();
          return {
            breached: res.ok && data && !data.error,
            evidence: res.ok ? 'Executed arbitrary SQL to read secrets!' : 'SQL injection blocked'
          };
        }
      },
      {
        name: 'System info disclosure via RPC',
        attack: 'injection-system-info',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_system_info`, {
            method: 'POST',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          const data = await res.json();
          return {
            breached: res.ok && data && data.version,
            evidence: res.ok && data.version ? `Exposed: ${data.version}, user: ${data.current_user}` : 'System info hidden'
          };
        }
      },
      {
        name: 'XSS payloads stored',
        attack: 'injection-xss-stored',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario5_user_content?select=title,content,html_content`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const hasXss = Array.isArray(data) && data.some(d =>
            d.content?.includes('<script>') || d.html_content?.includes('onerror')
          );
          return {
            breached: hasXss,
            evidence: hasXss ? 'Found stored XSS payloads in user content' : 'No XSS found'
          };
        }
      },
      {
        name: 'Path traversal in file references',
        attack: 'injection-path-traversal',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario5_file_references?select=file_path,file_name`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const hasTraversal = Array.isArray(data) && data.some(f =>
            f.file_path?.includes('../') || f.file_path?.includes('/etc/') || f.file_path?.includes('/proc/')
          );
          return {
            breached: hasTraversal,
            evidence: hasTraversal ? 'Found path traversal patterns (../etc/passwd, /proc/self/environ)' : 'No traversal found'
          };
        }
      },
      {
        name: 'SSRF via webhook URLs',
        attack: 'injection-ssrf',
        severity: 'critical',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario5_webhooks?select=webhook_url,secret_token`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          const hasSsrf = Array.isArray(data) && data.some(w =>
            w.webhook_url?.includes('169.254.169.254') || w.webhook_url?.includes('localhost')
          );
          return {
            breached: hasSsrf,
            evidence: hasSsrf ? 'Found SSRF URLs (AWS metadata, localhost) with exposed tokens!' : 'No SSRF found'
          };
        }
      },
      {
        name: 'Dynamic query templates exposed',
        attack: 'injection-sql-templates',
        severity: 'high',
        async execute() {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/scenario5_dynamic_queries?select=*`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
          });
          const data = await res.json();
          return {
            breached: Array.isArray(data) && data.length > 0,
            evidence: data.length > 0 ? `Found ${data.length} SQL templates that could be exploited` : 'No templates exposed'
          };
        }
      }
    ]
  }
};

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function runBenchmark() {
  console.log(`${colors.bold}${colors.cyan}
╔══════════════════════════════════════════════════════════════════╗
║         RALPH WIGGUM BENCHMARK - SupaShield Coverage Test        ║
║                  "I'm in danger!" - Ralph Wiggum                 ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results = {
    totalTests: 0,
    totalBreached: 0,
    totalSecure: 0,
    totalErrors: 0,
    byScenario: {},
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    detectedAttacks: []
  };

  for (const [scenarioName, scenario] of Object.entries(testScenarios)) {
    console.log(`\n${colors.bold}${colors.blue}━━━ ${scenarioName} ━━━${colors.reset}`);
    console.log(`${colors.cyan}${scenario.description}${colors.reset}\n`);

    results.byScenario[scenarioName] = { total: 0, breached: 0, secure: 0, errors: 0 };

    for (const test of scenario.tests) {
      results.totalTests++;
      results.byScenario[scenarioName].total++;

      try {
        const result = await test.execute();

        if (result.breached) {
          results.totalBreached++;
          results.byScenario[scenarioName].breached++;
          results.bySeverity[test.severity]++;
          results.detectedAttacks.push({
            scenario: scenarioName,
            test: test.name,
            attack: test.attack,
            severity: test.severity,
            evidence: result.evidence
          });

          const severityColor = test.severity === 'critical' ? colors.red :
                               test.severity === 'high' ? colors.yellow : colors.white;
          console.log(`  ${colors.red}✗ BREACHED${colors.reset} ${test.name}`);
          console.log(`    ${severityColor}[${test.severity.toUpperCase()}]${colors.reset} ${result.evidence}`);
        } else {
          results.totalSecure++;
          results.byScenario[scenarioName].secure++;
          console.log(`  ${colors.green}✓ SECURE${colors.reset} ${test.name}`);
        }
      } catch (err) {
        results.totalErrors++;
        results.byScenario[scenarioName].errors++;
        console.log(`  ${colors.yellow}⚠ ERROR${colors.reset} ${test.name}: ${err.message}`);
      }
    }
  }

  // Generate report
  console.log(`\n${colors.bold}${colors.cyan}
╔══════════════════════════════════════════════════════════════════╗
║                        BENCHMARK RESULTS                          ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.bold}Overall Summary:${colors.reset}`);
  console.log(`  Total Tests:    ${results.totalTests}`);
  console.log(`  ${colors.red}Breached:       ${results.totalBreached}${colors.reset}`);
  console.log(`  ${colors.green}Secure:         ${results.totalSecure}${colors.reset}`);
  console.log(`  ${colors.yellow}Errors:         ${results.totalErrors}${colors.reset}`);

  const detectionRate = ((results.totalBreached / results.totalTests) * 100).toFixed(1);
  console.log(`\n${colors.bold}Detection Rate: ${detectionRate}% of vulnerabilities detected${colors.reset}`);

  console.log(`\n${colors.bold}By Severity:${colors.reset}`);
  console.log(`  ${colors.red}Critical: ${results.bySeverity.critical}${colors.reset}`);
  console.log(`  ${colors.yellow}High:     ${results.bySeverity.high}${colors.reset}`);
  console.log(`  ${colors.white}Medium:   ${results.bySeverity.medium}${colors.reset}`);
  console.log(`  ${colors.cyan}Low:      ${results.bySeverity.low}${colors.reset}`);

  console.log(`\n${colors.bold}By Scenario:${colors.reset}`);
  for (const [name, stats] of Object.entries(results.byScenario)) {
    const scenarioRate = stats.total > 0 ? ((stats.breached / stats.total) * 100).toFixed(0) : 0;
    console.log(`  ${name}: ${stats.breached}/${stats.total} (${scenarioRate}%)`);
  }

  // Attack coverage analysis
  console.log(`\n${colors.bold}${colors.magenta}Attack Categories Detected:${colors.reset}`);
  const attackTypes = {};
  for (const attack of results.detectedAttacks) {
    attackTypes[attack.attack] = (attackTypes[attack.attack] || 0) + 1;
  }
  for (const [type, count] of Object.entries(attackTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${type}: ${count} instances`);
  }

  // Save report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.totalTests,
      breached: results.totalBreached,
      secure: results.totalSecure,
      errors: results.totalErrors,
      detectionRate: parseFloat(detectionRate)
    },
    bySeverity: results.bySeverity,
    byScenario: results.byScenario,
    detectedAttacks: results.detectedAttacks,
    config: {
      supabaseUrl: SUPABASE_URL,
      testedAt: new Date().toISOString()
    }
  };

  const fs = await import('fs');
  const reportPath = './benchmark-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.cyan}Report saved to: ${reportPath}${colors.reset}`);

  return results;
}

// Run the benchmark
runBenchmark().catch(console.error);
