<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const stages = [
		{ value: '', label: 'Group stage / not out yet' },
		{ value: 'r32', label: 'Out in Round of 32' },
		{ value: 'r16', label: 'Out in Round of 16' },
		{ value: 'qf', label: 'Out in Quarter-finals' },
		{ value: 'sf', label: 'Out in Semi-finals' },
		{ value: 'final', label: 'Runners-up' },
		{ value: 'champion', label: 'Champions' }
	];
</script>

<h1>Teams & results</h1>
<p><a href="/admin" class="muted">← Admin</a></p>
<p class="muted">
	Rename play-off placeholder lots once qualifiers are known, set groups after the draw, and
	enter results as the tournament unfolds. Points recalculate automatically.
</p>

{#if form?.error}<p class="error">{form.error}</p>{/if}

<table>
	<thead>
		<tr>
			<th>Flag</th>
			<th>Name</th>
			<th>Group</th>
			<th>Group pos</th>
			<th>Knockout result</th>
			<th class="num">Pts</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.teams as t (t.id)}
			<tr>
				<td><input form="team-{t.id}" name="flag" value={t.flag} class="tiny" /></td>
				<td>
					<input form="team-{t.id}" type="hidden" name="id" value={t.id} />
					<input form="team-{t.id}" name="name" value={t.name} required />
				</td>
				<td><input form="team-{t.id}" name="group_name" value={t.group_name} class="tiny" /></td>
				<td>
					<select form="team-{t.id}" name="group_position">
						<option value="" selected={t.group_position === null}>—</option>
						{#each [1, 2, 3, 4] as p (p)}
							<option value={p} selected={t.group_position === p}>{p}</option>
						{/each}
					</select>
				</td>
				<td>
					<select form="team-{t.id}" name="exit_stage">
						{#each stages as s (s.value)}
							<option value={s.value} selected={(t.exit_stage ?? '') === s.value}>{s.label}</option>
						{/each}
					</select>
				</td>
				<td class="num">{t.points}</td>
				<td>
					<button form="team-{t.id}" type="submit" class="subtle">
						{form?.success && form?.id === t.id ? 'Saved ✓' : 'Save'}
					</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<!-- Row inputs reference these via the form attribute; form elements are not
     valid children of table rows. -->
{#each data.teams as t (t.id)}
	<form method="POST" action="?/update" use:enhance id="team-{t.id}"></form>
{/each}

<style>
	.tiny {
		width: 4.5rem;
	}

	td input,
	td select {
		padding: 0.3rem 0.5rem;
		font-size: 0.85rem;
	}
</style>
