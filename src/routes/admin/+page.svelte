<script lang="ts">
	let { data, form } = $props();
</script>

<h1>Admin</h1>
<p><a href="/admin/teams">Manage teams & results →</a></p>

{#if form?.error}<p class="error">{form.error}</p>{/if}
{#if form?.success}<p class="success">{form.success}</p>{/if}

<h2>Settings</h2>
<form method="POST" action="?/settings" class="panel narrow">
	<label for="kickoff">First match kickoff (UTC ISO — auction closes one hour before)</label>
	<input id="kickoff" name="kickoff" value={data.kickoff} required />

	<label for="budget">Budget per bidder (BonBons)</label>
	<input id="budget" name="budget" type="number" min="1" value={data.budgetSetting} required />

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
