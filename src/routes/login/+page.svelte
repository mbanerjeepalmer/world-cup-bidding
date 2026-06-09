<script lang="ts">
	let { form } = $props();
</script>

<h1>Sign in</h1>

<form method="POST" class="panel narrow">
	{#if form?.error}<p class="error">{form.error}</p>{/if}

	<label for="email">Work email</label>
	<input id="email" name="email" type="email" placeholder="you@bonhams.com" value={form?.email ?? ''} required />

	<label for="password">Password</label>
	<input id="password" name="password" type="password" required />

	<p><button type="submit">Sign in</button></p>
	<p class="muted">No paddle yet? <a href="/register">Register</a>.</p>
</form>

<style>
	.narrow {
		max-width: 420px;
	}
</style>
