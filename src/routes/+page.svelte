<script lang="ts">
	let { data } = $props();

	let now = $state(Date.now());
	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const remaining = $derived(
		new Date(data.nextHammer?.closeAt ?? data.auctionClose).getTime() - now
	);
	const lastRemaining = $derived(new Date(data.auctionClose).getTime() - now);

	function countdown(ms: number): string {
		if (ms <= 0) return 'Hammer down';
		const s = Math.floor(ms / 1000);
		const d = Math.floor(s / 86400);
		const h = Math.floor((s % 86400) / 3600);
		const m = Math.floor((s % 3600) / 60);
		const sec = s % 60;
		return `${d}d ${h}h ${m}m ${sec}s`;
	}
</script>

<h1>The World Cup, going once…</h1>

{#if data.user}
	<div class="panel countdown">
		{#if data.auctionOpen && data.nextHammer}
			<span class="muted">Next hammer: {data.nextHammer.flag} {data.nextHammer.name} in</span>
			<strong>{countdown(remaining)}</strong>
			<span class="muted">
				— lots close one at a time, the last two hours before kickoff
				({new Date(data.auctionClose).toLocaleString()}). {data.unsoldCount} of
				{data.teamCount} lots still without a bid.
			</span>
		{:else}
			<strong>The hammer has fallen.</strong>
			<span class="muted">Scores now follow the tournament. Good luck.</span>
		{/if}
	</div>

	<h2>Your lot</h2>
	{#if data.mine.length === 0}
		<p class="muted">
			You hold no high bid — it's one team per bidder, so choose well. Browse
			<a href="/teams">the sale</a> before the hammer falls.
		</p>
	{:else}
		<table>
			<thead>
				<tr><th>Team</th><th class="num">Your bid</th></tr>
			</thead>
			<tbody>
				{#each data.mine as t (t.id)}
					<tr>
						<td><a href="/teams/{t.id}">{t.flag} {t.name}</a></td>
						<td class="num bonbons">{t.high_bid}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	{#if data.hot.length > 0}
		<h2>Most contested lots</h2>
		<table>
			<thead>
				<tr><th>Team</th><th class="num">Bids</th><th class="num">High bid</th><th>Held by</th></tr>
			</thead>
			<tbody>
				{#each data.hot as t (t.id)}
					<tr>
						<td><a href="/teams/{t.id}">{t.flag} {t.name}</a></td>
						<td class="num">{t.bid_count}</td>
						<td class="num bonbons">{t.high_bid}</td>
						<td>{t.high_bidder_name}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
{:else}
	<p>
		Forty-eight national teams go under the hammer, payable in BonBons. Bid wisely: glory is
		measured not by what your teams win, but by what they win <em>per BonBon paid</em>. Overpay
		for Brazil and you will be beaten by whoever picked up Curaçao for loose change.
	</p>

	{#if data.auctionOpen}
		<div class="panel countdown">
			{#if data.nextHammer}
				<span class="muted">Next hammer in</span>
				<strong>{countdown(remaining)}</strong>
			{/if}
			<span class="muted">— final hammer in</span>
			<strong>{countdown(lastRemaining)}</strong>
		</div>
	{:else}
		<div class="panel countdown">
			<strong>The hammer has fallen.</strong>
			<span class="muted">Scores now follow the tournament.</span>
		</div>
	{/if}

	<ol class="steps">
		<li>
			<strong>Sign in and bid.</strong> Register a paddle with just your email — we send you a
			sign-in link, no password — then bid BonBons on the team you want.
		</li>
		<li>
			<strong>One team per bidder.</strong> You can lead only one lot at a time; when the hammer
			falls on a lot you lead, that team is yours and your auction is over. Lots close one at a
			time, the final one two hours before the opening kickoff.
		</li>
		<li>
			<strong>Points ÷ price.</strong> Your team earns points for its tournament results, and
			your score is those points divided by the BonBons you paid. The cheaper the glory, the
			higher you rank.
		</li>
	</ol>

	<p>
		<a class="button" href="/register">Register for a paddle</a>
		&nbsp; or <a href="/login">sign in</a>.
	</p>
{/if}

<style>
	.countdown {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		flex-wrap: wrap;
	}

	.countdown strong {
		font-family: var(--serif);
		font-size: 1.6rem;
		color: var(--yellow);
		font-variant-numeric: tabular-nums;
	}

	.steps {
		padding-left: 1.25rem;
	}

	.steps li {
		margin: 0.75rem 0;
	}

	.steps strong {
		color: var(--yellow);
	}
</style>
