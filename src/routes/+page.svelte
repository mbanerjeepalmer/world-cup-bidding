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

	<h2>Two worked examples</h2>
	<div class="examples">
		<div class="panel example">
			<h3>Priya pays top BonBon</h3>
			<p>
				Priya wins Brazil for <strong class="bonbons">500</strong> BonBons. Brazil tops its
				group and wins the whole tournament — <strong>25 points</strong>, the most any team can
				score.
			</p>
			<p class="math">25 points ÷ 500 BonBons = <strong>0.05</strong></p>
		</div>
		<div class="panel example">
			<h3>Sam buys a bargain</h3>
			<p>
				Sam picks up Curaçao for <strong class="bonbons">10</strong> BonBons. They top their
				group, then go out in the round of 16 — a modest <strong>5 points</strong>.
			</p>
			<p class="math">5 points ÷ 10 BonBons = <strong>0.5</strong></p>
		</div>
	</div>
	<p>
		Sam scores <strong>ten times</strong> what Priya does. Glory is points <em>per BonBon</em>:
		a cheap team that does respectably beats an expensive team that wins it all.
	</p>

	<h2>Who you bid against</h2>
	<p>
		Everyone who registers with the same email domain — the part after the <code>@</code> —
		shares one private saleroom. Sign up as <code>priya@acme.com</code> and you bid only against
		other <code>@acme.com</code> addresses: their bids set your prices, and your leaderboard
		shows only them. People on <code>gmail.com</code> run a completely separate auction over the
		same 48 teams, at their own prices. So register with your work email to play against your
		colleagues.
	</p>

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

	.examples {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 1rem;
	}

	.example h3 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	.example .math {
		margin: 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
		font-variant-numeric: tabular-nums;
	}

	.example .math strong {
		color: var(--yellow);
		font-size: 1.2rem;
	}

	code {
		background: var(--panel-raised);
		border: 1px solid var(--border);
		border-radius: 3px;
		padding: 0.05rem 0.35rem;
		font-size: 0.9em;
	}
</style>
