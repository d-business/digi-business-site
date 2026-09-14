# Domain Cutover Plan: digi-business.co.uk → Cloudflare Worker

Prepared 7 August 2026. This is a reference plan, not yet executed — nothing below has been actioned. All DNS values were pulled live from public DNS lookups on the date above; re-check them yourself immediately before you actually start, in case anything's changed since.

## Current state (confirmed by live DNS lookup, not assumed)

| Record | Current value |
|---|---|
| Nameservers | `ns1.dns-parking.com`, `ns2.dns-parking.com` — **not** Cloudflare |
| A (root) | `77.37.76.252`, `92.112.198.13` (Hostinger) |
| CNAME (www) | `www.digi-business.co.uk.cdn.hstgr.net` |
| MX | `1 aspmx.l.google.com` / `5 alt1.aspmx.l.google.com` / `5 alt2.aspmx.l.google.com` / `5 mx1.hostinger.co.uk` / `10 alt3.aspmx.l.google.com` / `10 alt4.aspmx.l.google.com` / `10 mx2.hostinger.co.uk` |
| TXT (SPF) | `v=spf1 include:_spf.google.com ~all` |
| TXT (DMARC) | `v=DMARC1; p=none` |
| TXT (verification, x4) | Google Search Console, Facebook Business, Yandex, Anthropic domain verification — exact strings below |

**The MX finding**: Google Workspace and Hostinger mail servers are both listed. Your SPF record only authorises Google, which is why the plan below drops the two Hostinger MX entries. Before you actually do this: double-check nothing (an alias, a shared mailbox, an old catch-all) is still relying on Hostinger mail. If in doubt, leave them in for now and revisit — it costs nothing to keep them a little longer, but a wrongly dropped mailbox costs you real email.

## Why this is a bigger step than a normal DNS edit

Cloudflare Workers Custom Domains require the domain's DNS zone to actually live on Cloudflare — this means moving the domain's **nameservers** to Cloudflare, not just changing one record at your current registrar. That hands Cloudflare all DNS for the domain, so every existing record (email, verifications, everything) has to be faithfully recreated inside Cloudflare *before* the nameserver switch, or it goes dark the moment the switch takes effect.

The good news: creating records inside Cloudflare doesn't affect the live site at all until you actually change the nameservers at the registrar. Stages 1–4 below are zero-risk and reversible — nothing goes live until Stage 6.

---

## Stage 1 — Add the site to Cloudflare

1. In the Cloudflare dashboard, "Add a Site" → enter `digi-business.co.uk`.
2. Cloudflare scans existing DNS and shows you what it found — compare against the table above and fix anything it missed or got wrong.
3. Cloudflare will assign you two nameservers (something like `xxx.ns.cloudflare.com`). Note them down. **Do not enter these at your registrar yet.**

## Stage 2 — Recreate every DNS record inside Cloudflare, exactly

Do not skip any of these — each one is something currently working that would otherwise break.

| Type | Name | Content | Notes |
|---|---|---|---|
| MX | `@` | `aspmx.l.google.com` | Priority 1 |
| MX | `@` | `alt1.aspmx.l.google.com` | Priority 5 |
| MX | `@` | `alt2.aspmx.l.google.com` | Priority 5 |
| MX | `@` | `alt3.aspmx.l.google.com` | Priority 10 |
| MX | `@` | `alt4.aspmx.l.google.com` | Priority 10 |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | SPF — keep exactly as-is |
| TXT | `_dmarc` | `v=DMARC1; p=none` | DMARC — keep exactly as-is |
| TXT | `@` | `google-site-verification=GvZSeMqbfIZmySOHBfklo9D0uOVokWs2nMqFoOaYv1Q` | Search Console — breaks GSC if dropped |
| TXT | `@` | `facebook-domain-verification=az0z3a6qtxkla997pvlymvl46omzof` | Facebook Business verification |
| TXT | `@` | `yandex-verification: e3de273ea7817401` | Yandex Webmaster verification |
| TXT | `@` | `anthropic-domain-verification-wt9bbm=QuoJG1FAvCUnCBvSUKtyhOGeO` | Anthropic domain verification |

**Deliberately not recreated**, per your decision: the two Hostinger MX records (`mx1.hostinger.co.uk`, `mx2.hostinger.co.uk`) and the Hostinger A records / www CNAME — those pointed at the old host and are being replaced by the Worker in Stage 3.

## Stage 3 — Point the domain at the Worker

1. In the `digi-business-site` Worker's settings → **Domains & Routes** → **Add Custom Domain** → enter `digi-business.co.uk`. Cloudflare provisions SSL and manages the underlying DNS record itself — you don't need to hand-create an A record for this.
2. Decide on `www`: recommend **not** serving the full site twice at `www` — instead add a **Redirect Rule** (Stage 4) sending `www` → the apex domain. Cleaner, avoids duplicate-content SEO issues, and matches the redirect map we already built for the old site's `www` variant.

## Stage 4 — Add the www → apex redirect rule

In Cloudflare's **Rules → Redirect Rules** (zone level, not the `_redirects` file — that only handles paths on a single host, not domain-level redirects):

- When incoming hostname equals `www.digi-business.co.uk` → redirect to `https://digi-business.co.uk/$1` (301, preserve path).

This is also where the `http://` and `www` variants from the earlier backlink redirect map finally get handled — `_redirects` in the repo already covers everything else.

## Stage 5 — Verify before touching the registrar

Cloudflare gives every zone a way to check things are correctly configured before the nameservers change (the dashboard will flag missing/misconfigured records). Go through the DNS table above one more time and confirm every row is present and correct. Nothing is live yet — take the time here.

## Stage 6 — The actual cutover: change nameservers

This is the one irreversible-feeling step, done at your **registrar** (wherever `ns1/ns2.dns-parking.com` is managed from — check your domain purchase/renewal emails if you're not sure which login that is).

Replace the current nameservers with the two Cloudflare ones from Stage 1.

Propagation is typically fast (Cloudflare usually detects the change within minutes to a few hours) but can technically take up to 48 hours depending on your registrar and DNS caching. Pick a moment that isn't hours before something email-dependent and important.

## Stage 7 — Post-cutover checklist

- [ ] `https://digi-business.co.uk` loads the new site, padlock shows a valid Cloudflare SSL cert
- [ ] `https://www.digi-business.co.uk` redirects to the apex domain
- [ ] A handful of the old backlinked URLs from the redirect map (e.g. `/contact-us/`, `/seo-case-studies/`) 301 correctly
- [ ] Send a test email to `will@digi-business.co.uk` from an external address, confirm it arrives
- [ ] Send a test email *from* the Google Workspace account, confirm it sends (SPF still valid)
- [ ] Google Search Console property for digi-business.co.uk still shows as verified
- [ ] Facebook Business Manager domain verification still shows as verified
- [ ] The contact form on the new site actually delivers an email (this is the first time it'll be tested against the real domain)

## If something goes wrong

Nameserver changes can be reverted at the registrar back to `ns1.dns-parking.com` / `ns2.dns-parking.com`, but propagation delay applies in reverse too — so a revert isn't instant. This is exactly why Stages 1–5 exist: getting everything right *before* Stage 6 is what makes Stage 6 low-drama.

## Not covered by this plan

- Cloudflare Email Routing was set up earlier in this project for the contact form's outbound mail (the `SEB` binding) — that's separate from your inbound Google Workspace mail above and doesn't need to change.
- This plan assumes you're keeping Google Workspace as-is. If you ever want to migrate email itself into Cloudflare Email Routing, that's a distinct, larger project — not part of this cutover.
