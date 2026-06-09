<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { data, children } = $props();

	const links = [
		{ href: '/teams', label: 'The Sale' },
		{ href: '/portfolio', label: 'My Lots' },
		{ href: '/leaderboard', label: 'Leaderboard' },
		{ href: '/rules', label: 'Rules' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>The BonBon World Cup Auction</title>
</svelte:head>

<header>
	<div class="bar">
		<a href="/" class="wordmark">BONHAMS <span>World Cup Auction</span></a>
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
				{data.user.name} · <span class="bonbons">{data.budget - data.committed}</span> of
				<span class="bonbons">{data.budget}</span> BonBons free
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
	{@render children()}
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
