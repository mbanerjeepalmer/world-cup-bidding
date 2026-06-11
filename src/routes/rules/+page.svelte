<script lang="ts">
	let { data } = $props();
</script>

<h1>Rules of the sale</h1>

<h2>The auction</h2>
<ul>
	<li>Every World Cup team is a lot, sold by open auction in BonBons, our house currency.</li>
	<li><strong>Each email domain is its own sale room.</strong> You bid against, and are scored
		against, colleagues on your own domain only — other domains run the same sale in parallel
		and never cross your bids.</li>
	<li><strong>One team per bidder.</strong> You may hold the high bid on only one lot at a time;
		being outbid frees you to bid elsewhere.</li>
	<li><strong>We email you when it matters.</strong> An email goes out when another paddle outbids
		you, and when the hammer falls on a lot you've won — no need to watch the room all day.</li>
	<li>There is no budget — bid whatever you like. But remember the scoring: every BonBon you pay
		divides your points at the end. Win the lot too dearly and you lose the game.</li>
	<li>Lots are hammered <strong>one at a time</strong>, in running order — Group A first,
		alphabetically within each group, {data.staggerMinutes}
		{data.staggerMinutes === 1 ? 'minute' : 'minutes'} apart. Each lot's hammer time is shown
		in the sale.</li>
	<li>The first lot closes <strong>{data.firstHammerLeadMinutes} minutes before kickoff of the
		first match</strong> ({new Date(data.firstHammer).toLocaleString()} your time); the last
		falls at {new Date(data.auctionClose).toLocaleString()}. Whoever holds the high bid when a
		lot's hammer falls owns that team at that price — and their auction is over.</li>
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
		<tr><td>2nd in group</td><td class="num">2</td></tr>
		<tr><td>1st in group</td><td class="num">3</td></tr>
		<tr><td>Winning a Round-of-32 match</td><td class="num">+2</td></tr>
		<tr><td>Winning a Round-of-16 match</td><td class="num">+3</td></tr>
		<tr><td>Winning a quarter-final</td><td class="num">+4</td></tr>
		<tr><td>Winning a semi-final</td><td class="num">+5</td></tr>
		<tr><td>Winning the final</td><td class="num">+8</td></tr>
	</tbody>
</table>
<p class="muted">So a team that tops its group and is knocked out immediately scores 3; a team
	that tops its group and wins the whole thing scores 25.</p>

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
