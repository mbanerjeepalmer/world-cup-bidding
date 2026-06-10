<script lang="ts">
	let { form } = $props();
</script>

<h1>Sign in</h1>

{#if form?.sent}
	<div class="panel narrow">
		<p>We've sent a sign-in link to <strong>{form.email}</strong>. It's good for 20 minutes.</p>
		{#if form.link}
			<p class="muted">Dev mode: <a href={form.link}>use the link directly</a>.</p>
		{/if}
	</div>
{:else}
	<form method="POST" class="panel narrow">
		{#if form?.error}<p class="error">{form.error}</p>{/if}

		<label for="email">Email</label>
		<input id="email" name="email" type="email" placeholder="you@example.com" value={form?.email ?? ''} required />

		<p><button type="submit">Email me a sign-in link</button></p>
		<p class="muted">No password — we email you a link. No paddle yet? <a href="/register">Register</a>.</p>
	</form>
{/if}

<style>
	.narrow {
		max-width: 420px;
	}
</style>
