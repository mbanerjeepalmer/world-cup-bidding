<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// Keep the lot fresh while it is live — others may be bidding.
	$effect(() => {
		if (!data.lotOpen) return;
		const t = setInterval(() => invalidateAll(), 5000);
		return () => clearInterval(t);
	});

	const youLead = $derived(data.team.high_bidder_id === data.user?.id);
</script>

<p><a href="/teams" class="muted">← Back to the sale</a></p>

<h1>{data.team.flag} {data.team.name}</h1>
<p class="muted">
	Group {data.team.group_name}
	{#if data.points > 0}· {data.points} tournament points so far{/if}
</p>

<div class="columns">
	<div class="panel">
		<h2>Bidding</h2>
		{#if data.team.high_bid}
			<p>
				High bid: <strong class="bonbons">{data.team.high_bid} BonBons</strong>
				{#if youLead}
					<span class="badge yellow">You hold this lot</span>
				{:else}
					by {data.team.high_bidder_name}
				{/if}
			</p>
		{:else}
			<p class="muted">No bids yet. Opening bid: {data.nextBid} BonBons.</p>
		{/if}

		{#if data.lotOpen}
			<p class="muted">
				Hammer falls at <strong>{new Date(data.team.close_at).toLocaleString()}</strong>.
			</p>
			{#if form?.error}<p class="error">{form.error}</p>{/if}
			{#if form?.success}<p class="success">{form.success}</p>{/if}
			<form method="POST" action="?/bid" use:enhance>
				<label for="amount">Your bid (min {data.nextBid} BonBons)</label>
				<input
					id="amount"
					name="amount"
					type="number"
					min={data.nextBid}
					step="1"
					value={data.nextBid}
					required
				/>
				<p><button type="submit" disabled={youLead || !!data.heldOther}>Place bid</button></p>
				{#if youLead}
					<p class="muted">You already hold the high bid.</p>
				{:else if data.heldOther?.closed}
					<p class="muted">
						<a href="/teams/{data.heldOther.id}">{data.heldOther.flag} {data.heldOther.name}</a>
						is your team for the tournament — the hammer has fallen on it.
					</p>
				{:else if data.heldOther}
					<p class="muted">
						One team per bidder — you hold
						<a href="/teams/{data.heldOther.id}">{data.heldOther.flag} {data.heldOther.name}</a>.
						You can bid here if someone outbids you there.
					</p>
				{/if}
			</form>
		{:else}
			<p class="badge outline">Hammer down</p>
			{#if data.team.high_bid}
				<p class="muted">
					Sold to {youLead ? 'you' : data.team.high_bidder_name} for
					<span class="bonbons">{data.team.high_bid}</span> BonBons.
				</p>
			{:else}
				<p class="muted">Unsold.</p>
			{/if}
		{/if}
	</div>

	<div class="panel">
		<h2>Bid history</h2>
		{#if data.history.length === 0}
			<p class="muted">Silence in the room.</p>
		{:else}
			<table>
				<thead><tr><th>Bidder</th><th class="num">Amount</th><th>When</th></tr></thead>
				<tbody>
					{#each data.history as b, i (b.created_at + b.amount)}
						<tr class:leading={i === 0}>
							<td>{b.name}</td>
							<td class="num bonbons">{b.amount}</td>
							<td class="muted">{new Date(b.created_at.replace(' ', 'T') + 'Z').toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<style>
	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		margin-top: 1.5rem;
	}

	@media (max-width: 760px) {
		.columns {
			grid-template-columns: 1fr;
		}
	}

	.columns h2 {
		margin-top: 0;
	}

	tr.leading td {
		color: var(--yellow);
	}
</style>
