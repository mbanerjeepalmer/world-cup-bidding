<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Sign in</h1>

{#if !data.valid}
	<div class="panel narrow">
		<p class="error">This sign-in link has expired or was already used.</p>
		<p class="muted">
			<a href="/login">Request a fresh one</a> or <a href="/register">register for a paddle</a>.
		</p>
	</div>
{:else}
	<form method="POST" class="panel narrow">
		{#if form?.error}<p class="error">{form.error}</p>{/if}
		<p>Signing in as <strong>{data.email}</strong>.</p>
		<p><button type="submit">Step into the saleroom</button></p>
	</form>
{/if}

<style>
	.narrow {
		max-width: 420px;
	}
</style>
