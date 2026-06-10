<script lang="ts">
	let { form } = $props();
</script>

<h1>Register for a paddle</h1>
<p class="muted">Each email domain is its own sale room — you bid against your colleagues.</p>

{#if form?.sent}
	<div class="panel narrow">
		{#if form.existing}
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

		<label for="email">Email</label>
		<input id="email" name="email" type="email" placeholder="you@example.com" value={form?.email ?? ''} required />

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
</style>
