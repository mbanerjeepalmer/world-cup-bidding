# The BonBon World Cup Auction

A World Cup bidding game for Bonhams colleagues. Every team at the 2026 World Cup
is a lot in an open auction, paid for in BonBons — **one team per bidder**, and no
budget: every BonBon you pay divides your points, so overbidding is its own
punishment. Each team earns tournament points for its results; your score is
**points ÷ price paid**. Lots are hammered one at a time in running order, the
final lot two hours before kickoff of the first match.

Full rules are on the `/rules` page in the app.

## Stack

- SvelteKit (Svelte 5) full-stack app, `@sveltejs/adapter-node`
- SQLite via `better-sqlite3` — the database file lives in `data/` (gitignored)
  and is created and seeded with all 48 teams on first run
- Fixtures, results and scores sync from the keyless
  [openfootball World Cup 2026 feed](https://github.com/openfootball/worldcup.json):
  on every `npm run build`, at server start, hourly while the server runs, and
  on demand via the admin page. Set `WC_FEED_URL` to point at another URL or a
  local JSON file (used by the e2e suite).

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
- Admin → Settings holds the first-match kickoff time (set automatically from the
  earliest fixture on every sync), the stagger interval between hammers, the
  final-hammer margin before kickoff (default 120 minutes), and the minimum
  opening bid.
- Groups, group positions and knockout results come from the feed; **Sync now**
  on the admin page pulls the latest immediately. Admin → Teams & results still
  allows manual corrections, but the next sync overwrites them — the feed is the
  source of truth.
