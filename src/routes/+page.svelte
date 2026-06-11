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

<div class="panel countdown">
	{#if data.auctionOpen && data.nextHammer}
		<span class="muted">Next hammer: {data.nextHammer.flag} {data.nextHammer.name} in</span>
		<strong>{countdown(remaining)}</strong>
		<span class="muted">
			— lots close one at a time until {new Date(data.auctionClose).toLocaleString()}{#if data.user},
				and {data.unsoldCount} of {data.teamCount} still have no bid{/if}.
		</span>
	{:else}
		<strong>The hammer has fallen.</strong>
		<span class="muted">Scores now follow the tournament. Good luck.</span>
	{/if}
</div>

{#if data.user}
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
		Forty-eight teams go under the hammer, priced in BonBons. Your score is your team's
		tournament points divided by what you paid. Winning cheap beats winning big.
	</p>

	<h2>How it works</h2>
	<div class="panel how">
		<div class="flow">
			<div class="step" style="--d: 0s">
				<span class="icon">🍬</span>
				<span><strong>Bid</strong><br />BonBons, one team each</span>
			</div>
			<span class="arrow" style="--d: 0.1s" aria-hidden="true">→</span>
			<div class="step" style="--d: 0.15s">
				<span class="icon gavel">🔨</span>
				<span><strong>Hammer falls</strong><br />the team is yours</span>
			</div>
			<span class="arrow" style="--d: 0.25s" aria-hidden="true">→</span>
			<div class="step" style="--d: 0.3s">
				<span class="icon">🏆</span>
				<span><strong>Score</strong><br />its points ÷ your price</span>
			</div>
		</div>

		<div class="proof">
			<div class="lot">
				<span>🇧🇷 Brazil, champions</span>
				<span class="math">25 pts ÷ 500 🍬 = <strong>0.05</strong></span>
				<span class="bar dim" style="--w: 10%; --d: 0.5s"></span>
			</div>
			<div class="lot">
				<span>🇨🇼 Curaçao, out in the round of 16</span>
				<span class="math">5 pts ÷ 10 🍬 = <strong>0.50</strong></span>
				<span class="bar" style="--w: 100%; --d: 0.65s"></span>
			</div>
			<p class="muted">The bargain beats the champion, ten to one.</p>
		</div>
	</div>

	<p>
		Each email domain is its own saleroom, so register with your work email — you bid against
		your colleagues and nobody else.
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

	.how {
		display: grid;
		gap: 1.5rem;
	}

	.flow {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		line-height: 1.3;
		animation: rise 0.35s ease-out both;
		animation-delay: var(--d);
	}

	.step strong {
		color: var(--yellow);
	}

	.icon {
		font-size: 1.6rem;
	}

	.gavel {
		display: inline-block;
		transform-origin: 70% 80%;
		animation: tap 5s ease-in-out 1.2s infinite;
	}

	/* One gentle tap of the gavel every five seconds. */
	@keyframes tap {
		0%,
		86%,
		100% {
			transform: rotate(0);
		}
		90% {
			transform: rotate(-16deg);
		}
		95% {
			transform: rotate(5deg);
		}
	}

	.arrow {
		display: inline-block;
		color: var(--text-muted);
		animation: rise 0.35s ease-out both;
		animation-delay: var(--d);
	}

	.proof {
		display: grid;
		gap: 0.75rem;
		border-top: 1px solid var(--border);
		padding-top: 1.25rem;
	}

	.proof .muted {
		margin: 0;
	}

	.lot {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.15rem 1rem;
	}

	.math {
		font-variant-numeric: tabular-nums;
		color: var(--text-muted);
	}

	.math strong {
		color: var(--yellow);
		font-size: 1.1rem;
	}

	.bar {
		grid-column: 1 / -1;
		height: 6px;
		width: var(--w);
		border-radius: 3px;
		background: var(--yellow);
		transform-origin: left;
		animation: grow 0.9s ease-out both;
		animation-delay: var(--d);
	}

	.bar.dim {
		background: var(--yellow-dim);
	}

	@keyframes grow {
		from {
			transform: scaleX(0);
		}
	}

	@media (max-width: 560px) {
		.flow {
			flex-direction: column;
			align-items: flex-start;
		}

		.arrow {
			margin-left: 0.45rem;
			/* The rise animation ends on `transform: none` and holds it, so the
			   turn must ride the separate rotate property. */
			rotate: 90deg;
		}

		.lot {
			grid-template-columns: 1fr;
		}
	}
</style>
