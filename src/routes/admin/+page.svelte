<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Admin</h1>
<p><a href="/admin/teams">Manage teams & results →</a></p>

{#if form?.error}<p class="error">{form.error}</p>{/if}
{#if form?.success}<p class="success">{form.success}</p>{/if}

<h2>Fixtures & results</h2>
<p class="muted">
	Fixtures, results and scores come from the openfootball World Cup feed — synced on every
	build, at server start and hourly. Edits on the teams page hold only until the next sync.
</p>
<form method="POST" action="?/sync">
	<p><button type="submit">Sync now</button></p>
</form>

<h2>Settings</h2>
<form method="POST" action="?/settings" class="panel narrow">
	<label for="kickoff">First match kickoff (UTC ISO — set automatically by the feed sync)</label>
	<input id="kickoff" name="kickoff" value={data.kickoff} required />

	<label for="first_hammer_lead_minutes">First hammer, minutes before kickoff</label>
	<input id="first_hammer_lead_minutes" name="first_hammer_lead_minutes" type="number" min="1" value={data.firstHammerLeadMinutes} required />

	<label for="stagger_minutes">Minutes between hammers (lots close one at a time)</label>
	<input id="stagger_minutes" name="stagger_minutes" type="number" min="1" value={data.staggerMinutes} required />

	<label for="min_opening_bid">Minimum opening bid</label>
	<input id="min_opening_bid" name="min_opening_bid" type="number" min="1" value={data.minOpeningBid} required />

	<p><button type="submit">Save settings</button></p>
</form>

<h2>Bidders</h2>
<table>
	<thead>
		<tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>
	</thead>
	<tbody>
		{#each data.users as u (u.id)}
			<tr>
				<td>{u.name}</td>
				<td>{u.email}</td>
				<td>{u.is_admin ? 'Auctioneer' : 'Bidder'}</td>
				<td class="muted">{new Date(u.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}</td>
				<td>
					{#if u.id !== data.user?.id}
						<form method="POST" action="?/toggleAdmin">
							<input type="hidden" name="id" value={u.id} />
							<button class="subtle" type="submit">
								{u.is_admin ? 'Demote' : 'Make auctioneer'}
							</button>
						</form>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.narrow {
		max-width: 480px;
	}
</style>
