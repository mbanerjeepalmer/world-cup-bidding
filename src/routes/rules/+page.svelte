<script lang="ts">
	let { data } = $props();
</script>

<h1>Rules of the sale</h1>

<h2>The auction</h2>
<ul>
	<li>Every World Cup team is a lot, sold by open auction in BonBons, our house currency.</li>
	<li>Each bidder has a budget of <strong class="bonbons">{data.budget} BonBons</strong>. Funds are
		only committed while you hold the high bid — if you are outbid, they are freed.</li>
	<li>The auction closes <strong>one hour before kickoff of the first match</strong>
		({new Date(data.auctionClose).toLocaleString()} your time). Whoever holds the high bid on a
		lot at that moment owns the team at that price.</li>
	<li>Teams with no bids go unsold and score for nobody.</li>
</ul>

<h2>Bidding increments</h2>
<p>Standard house increments apply. The minimum opening bid is 10 BonBons.</p>
<table class="increments">
	<thead><tr><th>Current bid</th><th class="num">Increment</th></tr></thead>
	<tbody>
		<tr><td>Under 100</td><td class="num">5</td></tr>
		<tr><td>100 – 199</td><td class="num">10</td></tr>
		<tr><td>200 – 499</td><td class="num">25</td></tr>
		<tr><td>500 – 999</td><td class="num">50</td></tr>
		<tr><td>1,000 – 1,999</td><td class="num">100</td></tr>
		<tr><td>2,000 – 4,999</td><td class="num">250</td></tr>
		<tr><td>5,000 and above</td><td class="num">500</td></tr>
	</tbody>
</table>

<h2>Tournament points</h2>
<p>Teams earn points from their finishing position in the group, plus a bonus for every
	knockout match they win:</p>
<table class="increments">
	<thead><tr><th>Result</th><th class="num">Points</th></tr></thead>
	<tbody>
		<tr><td>4th in group</td><td class="num">0</td></tr>
		<tr><td>3rd in group</td><td class="num">1</td></tr>
		<tr><td>2nd in group</td><td class="num">3</td></tr>
		<tr><td>1st in group</td><td class="num">6</td></tr>
		<tr><td>Winning a Round-of-32 match</td><td class="num">+4</td></tr>
		<tr><td>Winning a Round-of-16 match</td><td class="num">+6</td></tr>
		<tr><td>Winning a quarter-final</td><td class="num">+8</td></tr>
		<tr><td>Winning a semi-final</td><td class="num">+10</td></tr>
		<tr><td>Winning the final</td><td class="num">+16</td></tr>
	</tbody>
</table>
<p class="muted">So a team that tops its group and is knocked out immediately scores 6; a team
	that tops its group and wins the whole thing scores 50.</p>

<h2>Scoring the game</h2>
<ul>
	<li>Each team's score is its <strong>tournament points divided by the price you paid</strong>.</li>
	<li>Your total is the sum across all the teams you own.</li>
	<li>Overpay for Brazil and even the trophy may not save you. Pick up Paraguay, Curaçao and
		Saudi Arabia for loose change and a few decent group runs could win you the whole game.</li>
</ul>

<style>
	.increments {
		max-width: 480px;
	}
</style>
