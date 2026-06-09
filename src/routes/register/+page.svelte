<script lang="ts">
	let { form } = $props();
</script>

<h1>Register for a paddle</h1>
<p class="muted">Open to bonhams.com colleagues only.</p>

<form method="POST" class="panel narrow">
	{#if form?.error}<p class="error">{form.error}</p>{/if}

	<label for="email">Work email</label>
	<input id="email" name="email" type="email" placeholder="you@bonhams.com" value={form?.email ?? ''} required />

	<label for="name">Display name</label>
	<input id="name" name="name" type="text" placeholder="How you'll appear on the leaderboard" value={form?.name ?? ''} required />

	<label for="password">Password</label>
	<input id="password" name="password" type="password" minlength="8" required />

	<p><button type="submit">Register</button></p>
	<p class="muted">Already registered? <a href="/login">Sign in</a>.</p>
</form>

<style>
	.narrow {
		max-width: 420px;
	}
</style>
