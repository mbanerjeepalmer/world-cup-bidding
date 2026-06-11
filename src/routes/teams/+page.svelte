<script lang="ts">
	let { data } = $props();

	let query = $state('');
	const teams = $derived(
		data.teams.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))
	);
</script>

<h1>The Sale</h1>
<p class="muted">
	{data.teams.length} lots, hammered one at a time in running order — Group A first, starting an
	hour before kickoff. Minimum next bid follows standard increments — see
	<a href="/rules">the rules</a>.
</p>

<input type="search" placeholder="Search teams…" bind:value={query} class="search" />

<table>
	<thead>
		<tr>
			<th>Lot</th>
			<th>Group</th>
			<th>Hammer</th>
			<th class="num">Bids</th>
			<th class="num">High bid</th>
			<th>Held by</th>
			<th class="num">Next bid</th>
		</tr>
	</thead>
	<tbody>
		{#each teams as t (t.id)}
			<tr>
				<td><a href="/teams/{t.id}">{t.flag} {t.name}</a></td>
				<td class="muted">{t.group_name}</td>
				<td class="muted">
					{#if new Date(t.close_at) <= new Date()}
						<span class="badge outline">Hammer down</span>
					{:else}
						{new Date(t.close_at).toLocaleString(undefined, {
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						})}
					{/if}
				</td>
				<td class="num">{t.bid_count}</td>
				<td class="num bonbons">{t.high_bid ?? '—'}</td>
				<td>
					{#if t.high_bidder_id === data.user?.id}
						<span class="badge yellow">You</span>
					{:else}
						{t.high_bidder_name ?? ''}
					{/if}
				</td>
				<td class="num bonbons">{t.next_bid}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.search {
		max-width: 320px;
		margin-bottom: 1rem;
	}
</style>
