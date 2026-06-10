# The BonBon World Cup Auction

A World Cup bidding game for colleagues. Every team at the 2026 World Cup
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
- Passwordless auth: signing in or registering emails a single-use magic link
  (20-minute expiry) via [Resend](https://resend.com). Set `RESEND_API_KEY`
  (and optionally `EMAIL_FROM`, default `BonBon Auction <onboarding@resend.dev>`).
  Without a key the link is printed to the server log instead — fine for local
  play. `MAGIC_LINK_ECHO=1` additionally shows the link in the UI; dev and e2e
  only, since it lets anyone sign in as anyone.

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

### Deploying to Coolify

The repo ships a `Dockerfile`. In Coolify:

1. Create a new resource from this Git repository and pick the **Dockerfile**
   build pack. The container listens on **port 3000**.
2. Add a **persistent volume** mounted at `/app/data` so the SQLite database
   survives deploys. Without it every deploy starts a fresh auction (and the
   first person to register on the new database becomes admin).
3. Set the environment variables:
   - `ORIGIN` — the public URL, e.g. `https://auction.example.com`.
     Required: adapter-node rejects form posts (login, bids) without it.
   - `RESEND_API_KEY` — for the sign-in emails. Until it's set, magic links
     are only printed to the container log (Coolify → Logs), which works in a
     pinch but means signing players in by hand.
   - `EMAIL_FROM` (optional) — defaults to
     `BonBon Auction <onboarding@resend.dev>`, which Resend only delivers to
     the email address that owns the Resend account. For everyone else to
     receive links, verify a domain in Resend and set something like
     `BonBon Auction <auction@yourdomain.com>`.
4. Deploy, open the site, and register — the first account becomes the
   auctioneer/admin.

Fixtures and results sync from the feed at boot and hourly after that, so no
scheduled jobs are needed.

## Notes for the auctioneer

- Sign-ups are open to any email address, and each email domain is its own
  tenant: a private sale room and leaderboard for that domain's colleagues.
  Bids on one domain never set the price on another.
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
