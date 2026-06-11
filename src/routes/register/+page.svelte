<script lang="ts">
	let { form } = $props();
	// The form posts without enhance, so a failed action re-renders the whole
	// page and this initial capture of form.email is the only one we need.
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? '');

	// Each email domain is its own sale room, so a personal address lands you
	// among strangers on that provider instead of your colleagues. We nudge,
	// never block — some bidders genuinely have nowhere better.
	const personalProviders = new Set([
		'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
		'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'live.com', 'live.co.uk',
		'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
		'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.de', 'gmx.net',
		'mail.com', 'yandex.com', 'zoho.com', 'hey.com', 'fastmail.com',
		'web.de', 't-online.de'
	]);
	const domain = $derived(email.trim().toLowerCase().split('@')[1] ?? '');
	const looksPersonal = $derived(personalProviders.has(domain));
</script>

<h1>Register for a paddle</h1>
<p class="muted">
	Use your <strong>work email</strong> — each email domain is its own sale room, so that's how
	you end up bidding against your colleagues.
</p>

{#if form?.sent}
	<div class="panel narrow">
		{#if !form.delivered}
			<p>
				This server can't send email yet, so your link was only written to the server log —
				tell the auctioneer.
			</p>
		{:else if form.existing}
			<p>
				That address already holds a paddle, so we've sent a <strong>sign-in</strong> link to
				<strong>{form.email}</strong> instead. It's good for 20 minutes.
			</p>
		{:else}
			<p>
				We've sent a link to <strong>{form.email}</strong> — click it to confirm your paddle.
				It's good for 20 minutes.
			</p>
		{/if}
		{#if form.link}
			<p class="muted">Dev mode: <a href={form.link}>use the link directly</a>.</p>
		{/if}
	</div>
{:else}
	<form method="POST" class="panel narrow">
		{#if form?.error}<p class="error">{form.error}</p>{/if}

		<label for="email">Work email</label>
		<input id="email" name="email" type="email" placeholder="you@yourcompany.com" bind:value={email} required />
		{#if looksPersonal}
			<p class="nudge">
				That's a personal address — the {domain} sale room is shared with every stranger on
				{domain}, not your colleagues. Your work email puts you on the office leaderboard.
			</p>
		{/if}

		<label for="name">Display name</label>
		<input id="name" name="name" type="text" placeholder="How you'll appear on the leaderboard" value={form?.name ?? ''} required />

		<p><button type="submit">Email me a registration link</button></p>
		<p class="muted">No password — we email you a link. Already registered? <a href="/login">Sign in</a>.</p>
	</form>
{/if}

<style>
	.narrow {
		max-width: 420px;
	}

	.nudge {
		color: var(--yellow);
		font-size: 0.9rem;
		margin: 0.5rem 0 0;
		animation: rise 0.2s ease-out both;
	}
</style>
