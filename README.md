# The BonBon World Cup Auction

A World Cup bidding game for Bonhams colleagues. Every team at the 2026 World Cup
is a lot in an open auction, paid for in BonBons. Each team earns tournament
points for its results; your score for a team is **points ÷ price paid**, and your
total is the sum across the teams you own. The auction closes one hour before
kickoff of the first match.

Full rules are on the `/rules` page in the app.

## Stack

- SvelteKit (Svelte 5) full-stack app, `@sveltejs/adapter-node`
- SQLite via `better-sqlite3` — the database file lives in `data/` (gitignored)
  and is created and seeded with all 48 teams on first run

## Development

```sh
npm install
npm run dev
```

## Production

```sh
npm run build
node build
```

Set `DATABASE_DIR` to control where the SQLite file is stored (defaults to `./data`).

## Notes for the auctioneer

- Sign-ups are limited to `@bonhams.com` email addresses.
- The **first account to register becomes the admin** (the auctioneer); admins can
  promote others from the admin page.
- Admin → Settings holds the first-match kickoff time (the auction closes one hour
  before it), the per-bidder budget, and the minimum opening bid.
- Admin → Teams & results is where you rename the play-off placeholder lots, set
  groups after the draw, and enter group positions and knockout results as the
  tournament unfolds — scores update automatically.
