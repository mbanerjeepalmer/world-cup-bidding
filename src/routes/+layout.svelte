<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

	let { data, children } = $props();

	// Windows' emoji font draws 🇧🇷 as the letters BR. Where flags don't render,
	// this loads a small flag-only font (self-hosted; the font stacks in
	// app.css list it first). Everywhere else it's a no-op.
	$effect(() => {
		polyfillCountryFlagEmojis('Twemoji Country Flags', '/fonts/TwemojiCountryFlags.woff2');
	});

	const links = [
		{ href: '/teams', label: 'The Sale' },
		{ href: '/portfolio', label: 'My Lots' },
		{ href: '/state-of-play', label: 'State of Play' },
		{ href: '/calculator', label: 'Calculator' },
		{ href: '/leaderboard', label: 'Leaderboard' },
		{ href: '/rules', label: 'Rules' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<meta name="theme-color" content="#0d0d0d" />
	<meta
		name="description"
		content="Bid BonBons on World Cup teams against your colleagues. Points ÷ price — the cheaper the glory, the higher you rank."
	/>
	<title>The BonBon World Cup Auction</title>
</svelte:head>

<header>
	<div class="bar">
		<a href="/" class="wordmark">BONBON <span>World Cup Auction</span></a>
		<nav>
			{#if data.user}
				{#each links as link (link.href)}
					<a href={link.href} class:active={page.url.pathname.startsWith(link.href)}
						>{link.label}</a
					>
				{/each}
				{#if data.user.is_admin}
					<a href="/admin" class:active={page.url.pathname.startsWith('/admin')}>Admin</a>
				{/if}
			{:else}
				<a href="/login">Sign in</a>
				<a href="/register">Register</a>
			{/if}
		</nav>
	</div>
	{#if data.user}
		<div class="bar sub">
			<span class="muted">
				{data.user.name} ·
				{#if data.held}
					leading <a href="/teams/{data.held.id}">{data.held.flag} {data.held.name}</a> at
					<span class="bonbons">{data.held.bid}</span> BonBons
				{:else}
					no lot held
				{/if}
			</span>
			<span>
				{#if data.auctionOpen}
					<span class="badge yellow">Auction open</span>
				{:else}
					<span class="badge outline">Auction closed</span>
				{/if}
				<form method="POST" action="/logout" class="inline">
					<button class="linklike" type="submit">Sign out</button>
				</form>
			</span>
		</div>
	{/if}
</header>

<main>
	{#key page.url.pathname}
		<div class="page">
			{@render children()}
		</div>
	{/key}
</main>

<style>
	header {
		border-bottom: 1px solid var(--border);
		background: var(--black);
	}

	.bar {
		max-width: 960px;
		margin: 0 auto;
		padding: 1rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.bar.sub {
		padding-top: 0;
		font-size: 0.85rem;
	}

	.wordmark {
		font-family: var(--serif);
		font-size: 1.5rem;
		letter-spacing: 0.18em;
		color: var(--yellow);
	}

	.wordmark:hover {
		text-decoration: none;
	}

	.wordmark span {
		font-size: 0.8rem;
		letter-spacing: 0.12em;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	nav {
		display: flex;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	nav a {
		color: var(--text);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	nav a.active,
	nav a:hover {
		color: var(--yellow);
		text-decoration: none;
	}

	form.inline {
		display: inline;
		margin-left: 1rem;
	}

	button.linklike {
		background: none;
		border: none;
		color: var(--text-muted);
		padding: 0;
		font-size: 0.85rem;
		text-decoration: underline;
		font-weight: 400;
	}
</style>
