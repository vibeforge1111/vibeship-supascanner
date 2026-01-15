<script lang="ts">
	import { goto } from '$app/navigation';

	let showContent = $state(false);
	let scanUrl = $state('');
	let isScanning = $state(false);
	let scanProgress = $state(0);
	let attacksFound = $state(0);
	let currentAttack = $state('');

	// Animate in content after ralph appears
	$effect(() => {
		setTimeout(() => {
			showContent = true;
		}, 800);
	});

	// Simulated scan animation
	async function startScan() {
		if (!scanUrl) return;
		isScanning = true;
		scanProgress = 0;
		attacksFound = 0;

		const attacks = [
			'RLS Bypass Detection...',
			'Auth Token Analysis...',
			'Storage Bucket Scan...',
			'Edge Function Probe...',
			'Realtime Channel Test...',
			'Vibecoder Pattern Match...',
			'SQL Injection Test...',
			'SSRF Detection...',
			'Multi-tenant Leak Check...',
			'AI Config Exposure...',
		];

		for (let i = 0; i < attacks.length; i++) {
			currentAttack = attacks[i];
			await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
			scanProgress = ((i + 1) / attacks.length) * 100;
			if (Math.random() > 0.4) attacksFound++;
		}

		setTimeout(() => {
			goto('/dashboard');
		}, 1000);
	}
</script>

<svelte:head>
	<title>SupaShield - "I'm in danger!" - Supabase Penetration Testing</title>
	<meta name="description" content="AI-powered penetration testing for Supabase. Don't guess what's broken - break it and prove it with 252 attack vectors." />
</svelte:head>

<!-- Hero Section with Ralph Wiggum -->
<div class="relative min-h-screen bg-surface-900 overflow-hidden">
	<!-- Animated Background Grid -->
	<div class="absolute inset-0 opacity-20">
		<div class="absolute inset-0" style="background-image: linear-gradient(rgba(20, 184, 166, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.1) 1px, transparent 1px); background-size: 50px 50px;"></div>
	</div>

	<!-- Scan Lines Effect -->
	<div class="absolute inset-0 pointer-events-none overflow-hidden">
		<div class="absolute inset-0 opacity-5 animate-scan-line bg-gradient-to-b from-transparent via-vibe-400 to-transparent h-32"></div>
	</div>

	<!-- Main Hero Content -->
	<div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">

		<!-- Ralph Wiggum Image with Effects -->
		<div class="relative mb-8 animate-float">
			<!-- Danger Glow Ring -->
			<div class="absolute -inset-4 border-2 border-breach-500 animate-danger-pulse"></div>
			<div class="absolute -inset-8 border border-breach-500/30 animate-danger-pulse" style="animation-delay: 0.5s;"></div>

			<!-- The Ralph -->
			<div class="relative group">
				<img
					src="/ralph-wiggum.avif"
					alt="Ralph Wiggum - I'm in danger!"
					class="w-64 h-64 md:w-80 md:h-80 object-cover shadow-2xl transition-transform duration-300 group-hover:scale-105"
				/>

				<!-- Glitch Overlay on Hover -->
				<div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
					<div class="absolute inset-0 bg-breach-500/20 mix-blend-overlay animate-glitch"></div>
				</div>

				<!-- Scan Line Overlay -->
				<div class="absolute inset-0 overflow-hidden pointer-events-none">
					<div class="absolute w-full h-1 bg-gradient-to-r from-transparent via-vibe-400 to-transparent animate-scan-line"></div>
				</div>
			</div>

			<!-- "I'm in danger" Speech Bubble -->
			<div class="absolute -top-4 -right-4 md:-right-8 bg-white text-black px-4 py-2 font-bold text-sm md:text-base shadow-lg transform rotate-3 animate-pulse">
				<span class="text-breach-600">"I'm in danger!"</span>
				<div class="absolute -bottom-2 left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
			</div>
		</div>

		<!-- Title with Staggered Animation -->
		<div class="text-center {showContent ? 'animate-slide-up' : 'opacity-0'}">
			<h1 class="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
				<span class="text-vibe-400">Supa</span><span class="text-white">Shield</span>
			</h1>
			<p class="text-xl md:text-2xl text-gray-400 mb-2">
				AI-Powered Supabase <span class="text-breach-400">Penetration Testing</span>
			</p>
			<p class="text-gray-500 max-w-xl mx-auto font-mono text-sm">
				Don't tell vibe coders what <em>might</em> be broken.<br/>
				<span class="text-breach-400 font-semibold">Break it and prove it with 252 attack vectors.</span>
			</p>
		</div>

		<!-- Stats Bar -->
		<div class="flex gap-8 mt-8 mb-12 {showContent ? 'animate-fade-in' : 'opacity-0'}" style="animation-delay: 0.3s;">
			<div class="text-center">
				<div class="text-3xl font-bold text-vibe-400">252</div>
				<div class="text-xs text-gray-500 uppercase tracking-wider">Attack Vectors</div>
			</div>
			<div class="text-center">
				<div class="text-3xl font-bold text-breach-400">100%</div>
				<div class="text-xs text-gray-500 uppercase tracking-wider">Detection Rate</div>
			</div>
			<div class="text-center">
				<div class="text-3xl font-bold text-shield-400">10</div>
				<div class="text-xs text-gray-500 uppercase tracking-wider">Scenarios</div>
			</div>
		</div>

		<!-- Interactive Scan Form -->
		<div class="w-full max-w-2xl {showContent ? 'animate-slide-up' : 'opacity-0'}" style="animation-delay: 0.5s;">
			{#if !isScanning}
				<div class="relative">
					<!-- Danger Border Animation -->
					<div class="absolute -inset-0.5 bg-gradient-to-r from-breach-500 via-vibe-500 to-breach-500 opacity-75 animate-pulse"></div>

					<div class="relative bg-surface-800 p-6">
						<label class="block text-sm text-gray-400 mb-2 font-mono">
							<span class="text-vibe-400">$</span> Enter your Supabase URL to start penetration test
						</label>
						<div class="flex gap-3">
							<input
								type="text"
								bind:value={scanUrl}
								placeholder="https://your-project.supabase.co"
								class="flex-1 bg-surface-900 border border-gray-700 px-4 py-3 text-white font-mono focus:border-vibe-500 focus:outline-none transition-colors"
							/>
							<button
								onclick={startScan}
								disabled={!scanUrl}
								class="px-6 py-3 bg-breach-600 hover:bg-breach-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold transition-all hover:shadow-lg hover:shadow-breach-500/30"
							>
								BREACH TEST
							</button>
						</div>
						<p class="text-xs text-gray-600 mt-3 font-mono">
							⚠️ Only test projects you own or have explicit authorization to test
						</p>
					</div>
				</div>
			{:else}
				<!-- Scanning Animation -->
				<div class="bg-surface-800 border-2 border-breach-500 animate-danger-pulse p-6">
					<div class="flex items-center gap-4 mb-4">
						<div class="w-4 h-4 bg-breach-500 animate-pulse"></div>
						<span class="text-breach-400 font-bold font-mono">BREACH TEST IN PROGRESS</span>
					</div>

					<!-- Progress Bar -->
					<div class="h-2 bg-surface-900 mb-4 overflow-hidden">
						<div
							class="h-full bg-gradient-to-r from-breach-500 to-vibe-500 transition-all duration-300"
							style="width: {scanProgress}%"
						></div>
					</div>

					<!-- Current Attack -->
					<div class="font-mono text-sm text-gray-400 mb-4">
						<span class="text-vibe-400">›</span> {currentAttack}
					</div>

					<!-- Live Stats -->
					<div class="flex gap-8">
						<div class="text-center">
							<div class="text-2xl font-bold text-breach-400">{attacksFound}</div>
							<div class="text-xs text-gray-500">BREACHES FOUND</div>
						</div>
						<div class="text-center">
							<div class="text-2xl font-bold text-vibe-400">{Math.round(scanProgress)}%</div>
							<div class="text-xs text-gray-500">COMPLETE</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- CTA Buttons -->
		<div class="flex gap-4 mt-8 {showContent ? 'animate-fade-in' : 'opacity-0'}" style="animation-delay: 0.7s;">
			<a href="/dashboard" class="px-6 py-3 bg-vibe-600 hover:bg-vibe-500 text-white font-bold transition-all hover:shadow-lg hover:shadow-vibe-500/30">
				View Demo Dashboard →
			</a>
			<a href="/attacks" class="px-6 py-3 border border-gray-600 hover:border-vibe-500 text-gray-300 hover:text-white transition-all">
				Browse 252 Attacks
			</a>
		</div>
	</div>
</div>

<!-- Attack Categories Section -->
<section class="bg-surface-800 py-20 px-4">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-4">
			<span class="text-vibe-400">10</span> Attack Scenarios
		</h2>
		<p class="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
			Comprehensive coverage of every Supabase attack surface. Each scenario contains multiple attack vectors tested against real vulnerabilities.
		</p>

		<div class="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
			<!-- Scenario Cards -->
			{#each [
				{ num: '01', name: 'No Security', desc: 'RLS Disabled', icon: '🔓', color: 'breach' },
				{ num: '02', name: 'Bad RLS', desc: 'USING (true)', icon: '❌', color: 'breach' },
				{ num: '03', name: 'Business Logic', desc: 'Price & IDOR', icon: '💰', color: 'breach' },
				{ num: '04', name: 'Vibecoder', desc: 'AI Mistakes', icon: '🤖', color: 'vibe' },
				{ num: '05', name: 'Injection', desc: 'SQL & XSS', icon: '💉', color: 'breach' },
				{ num: '06', name: 'GraphQL/Vault', desc: 'Secrets', icon: '🔐', color: 'breach' },
				{ num: '07', name: 'Auth/Tenant', desc: 'Multi-tenant', icon: '👥', color: 'breach' },
				{ num: '08', name: 'Database', desc: 'Deep Access', icon: '🗄️', color: 'breach' },
				{ num: '09', name: 'AI/Realtime', desc: 'ML & WS', icon: '⚡', color: 'vibe' },
				{ num: '10', name: 'Backup/Logs', desc: 'Operations', icon: '📦', color: 'breach' },
			] as scenario}
				<div class="group bg-surface-900 border border-gray-800 hover:border-{scenario.color}-500 p-4 transition-all hover:shadow-lg hover:shadow-{scenario.color}-500/20 cursor-pointer">
					<div class="flex items-start justify-between mb-2">
						<span class="text-2xl">{scenario.icon}</span>
						<span class="text-xs font-mono text-gray-600 group-hover:text-{scenario.color}-400">{scenario.num}</span>
					</div>
					<h3 class="font-bold text-white group-hover:text-{scenario.color}-400 transition-colors">{scenario.name}</h3>
					<p class="text-xs text-gray-500">{scenario.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Features Section -->
<section class="bg-surface-900 py-20 px-4">
	<div class="max-w-6xl mx-auto">
		<div class="grid md:grid-cols-3 gap-8">
			<!-- Feature 1 -->
			<div class="bg-surface-800 border border-gray-800 p-6 group hover:border-breach-500 transition-all">
				<div class="w-12 h-12 bg-breach-500/20 flex items-center justify-center mb-4 group-hover:bg-breach-500/30 transition-colors">
					<span class="text-2xl">🔴</span>
				</div>
				<h3 class="text-xl font-bold mb-2 text-white">Active Breach Testing</h3>
				<p class="text-gray-400 text-sm">
					Actually attempts to exploit your Supabase using 252 attack vectors.
					No guessing - real proof of vulnerabilities.
				</p>
			</div>

			<!-- Feature 2 -->
			<div class="bg-surface-800 border border-gray-800 p-6 group hover:border-vibe-500 transition-all">
				<div class="w-12 h-12 bg-vibe-500/20 flex items-center justify-center mb-4 group-hover:bg-vibe-500/30 transition-colors">
					<span class="text-2xl">🔄</span>
				</div>
				<h3 class="text-xl font-bold mb-2 text-white">Ralph Wiggum Loop</h3>
				<p class="text-gray-400 text-sm">
					"I'm in danger!" - Persistent iteration until every vulnerability is found.
					Keeps attacking until the attack surface is fully mapped.
				</p>
			</div>

			<!-- Feature 3 -->
			<div class="bg-surface-800 border border-gray-800 p-6 group hover:border-shield-500 transition-all">
				<div class="w-12 h-12 bg-shield-500/20 flex items-center justify-center mb-4 group-hover:bg-shield-500/30 transition-colors">
					<span class="text-2xl">✅</span>
				</div>
				<h3 class="text-xl font-bold mb-2 text-white">Fix Verification</h3>
				<p class="text-gray-400 text-sm">
					After you apply fixes, re-runs all attacks to confirm they're actually resolved.
					No more "trust me, it's fixed."
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Terminal Section -->
<section class="bg-surface-800 py-20 px-4">
	<div class="max-w-4xl mx-auto">
		<div class="bg-surface-900 border border-gray-800 overflow-hidden">
			<!-- Terminal Header -->
			<div class="bg-surface-700 px-4 py-2 flex items-center gap-2 border-b border-gray-800">
				<div class="w-3 h-3 bg-breach-500"></div>
				<div class="w-3 h-3 bg-yellow-500"></div>
				<div class="w-3 h-3 bg-shield-500"></div>
				<span class="ml-4 text-gray-400 text-sm font-mono">supashield-scanner</span>
			</div>

			<!-- Terminal Content -->
			<div class="p-6 font-mono text-sm space-y-2">
				<p><span class="text-vibe-400">$</span> supashield scan https://your-project.supabase.co</p>
				<p class="text-gray-500">Initializing SupaShield v1.0.0...</p>
				<p class="text-gray-500">Loading 252 attack vectors...</p>
				<p class="text-yellow-400">⚡ Starting breach test...</p>
				<p>&nbsp;</p>
				<p class="text-breach-400">✗ BREACHED Scenario 1: RLS Bypass - Got 3 users with SSN</p>
				<p class="text-breach-400">✗ BREACHED Scenario 2: Bad RLS - Read 3 profiles</p>
				<p class="text-breach-400">✗ BREACHED Scenario 4: Vibecoder - Found default credentials!</p>
				<p class="text-breach-400">✗ BREACHED Scenario 7: Auth - 4 OAuth secrets exposed!</p>
				<p class="text-breach-400">✗ BREACHED Scenario 9: AI - Conversations from 6 users visible!</p>
				<p>&nbsp;</p>
				<p class="text-white">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
				<p class="text-breach-400 font-bold">🚨 CRITICAL: 49 vulnerabilities found</p>
				<p class="text-gray-400">Detection Rate: <span class="text-vibe-400">100%</span> | Time: 12.4s</p>
				<p>&nbsp;</p>
				<p><span class="text-vibe-400">$</span> <span class="border-r-2 border-vibe-400 animate-blink pr-1"></span></p>
			</div>
		</div>
	</div>
</section>

<!-- Warning Section -->
<section class="bg-breach-900/30 border-y border-breach-800 py-12 px-4">
	<div class="max-w-4xl mx-auto text-center">
		<h3 class="text-2xl font-bold text-breach-400 mb-4">⚠️ For Educational & Authorized Testing Only</h3>
		<p class="text-gray-400">
			Only test projects you own or have explicit permission to test.
			SupaShield performs real attacks that could affect data.
			<span class="text-breach-400">Use responsibly.</span>
		</p>
	</div>
</section>

<!-- Final CTA -->
<section class="bg-surface-900 py-20 px-4">
	<div class="max-w-4xl mx-auto text-center">
		<h2 class="text-4xl font-bold mb-4">
			Ready to find out if you're <span class="text-breach-400">"in danger"</span>?
		</h2>
		<p class="text-gray-400 mb-8">
			Start your penetration test now and discover vulnerabilities before attackers do.
		</p>
		<div class="flex justify-center gap-4">
			<a href="/settings" class="px-8 py-4 bg-vibe-600 hover:bg-vibe-500 text-white font-bold text-lg transition-all hover:shadow-xl hover:shadow-vibe-500/30">
				Connect Your Project →
			</a>
			<a href="https://github.com/vibeforge1111/vibeship-supascanner" target="_blank" class="px-8 py-4 border border-gray-600 hover:border-white text-gray-300 hover:text-white transition-all">
				View on GitHub
			</a>
		</div>
	</div>
</section>
