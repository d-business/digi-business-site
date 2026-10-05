# Domain Cutover Record: digi-business.co.uk to Cloudflare Worker

Planned 7 August 2026. DNS re-verified and plan updated 4 October 2026. **Executed 4 October 2026.** This document started as a plan and is now a record of what was actually done, what deviated from the plan, and what still needs checking.

## Outcome

- Nameservers at Hostinger (the registrar) changed to Cloudflare's `bob.ns.cloudflare.com` and `melany.ns.cloudflare.com`. The Cloudflare zone showed as Active ("Your domain is now protected by Cloudflare").
- Custom Domain `digi-business.co.uk` (Production) attached to the `digi-business-site` Worker. A fetch of `https://digi-business.co.uk/` returned the new site, and `www.digi-business.co.uk` redirected to the apex.
- Email stayed on Google Workspace throughout. The contact form was found broken after cutover, fixed, and now sends with SPF, DKIM and DMARC all passing (see "Issues found after cutover").

## State before cutover (live DNS lookups, 7 Aug and re-checked 4 Oct 2026)

| Record | Value |
|---|---|
| Nameservers | `ns1.dns-parking.com`, `ns2.dns-parking.com` (Hostinger) |
| A (root) | `77.37.76.252`, `92.112.198.13` (Hostinger, rotating) |
| AAAA (root) | Two Hostinger IPv6 addresses (not in the original plan; found later) |
| CNAME (www) | `www.digi-business.co.uk.cdn.hstgr.net` |
| MX | Google: `aspmx.l.google.com` (1), `alt1`/`alt2` (5), `alt3`/`alt4` (10). Hostinger: `mx1`/`mx2.hostinger.co.uk` (5, 10) |
| SPF | `v=spf1 include:_spf.google.com ~all` |
| DMARC | `v=DMARC1; p=none` |
| DKIM | `google._domainkey` (Google Workspace, 2048-bit RSA) |
| Verification TXT x4 | Google Search Console, Facebook, Yandex, Anthropic |
| Other hostnames | `dev`, `n8n`, `new`, `ftp`, `pm-bounces` (found by the Cloudflare import, not by the original lookups) |

**MX question, resolved:** Hostinger hPanel showed 0 of 100 mailboxes and no forwarders, so the two Hostinger MX records were dropped. DNSSEC was not enabled (no DS record at the `.uk` registry), so it could not block the nameserver change.

## What was done, stage by stage

### Stage 1: Connect the domain to Cloudflare
Used **Connect a domain** (not "Transfer a domain" or "Buy a domain"), Free plan. DNS import left on Automatic. AI bot settings: Search and Agent set to Allow; Training left on Allow (a business decision, reversible); Bot Preference Sync left on.

### Stage 2: DNS records, final decisions

The import pulled in everything, including Hostinger leftovers. Decisions made on 4 October 2026:

| Record | Decision |
|---|---|
| 5 Google MX, SPF, DMARC, `google._domainkey` DKIM, 4 verification TXTs | Kept, DNS only. Checked against the live records; DKIM matched (Cloudflare stores it as two quoted strings, which is normal for long keys) |
| Apex `A` x2 and `AAAA` x2 (Hostinger) | Deleted (they would conflict with the Worker Custom Domain) |
| `mx1`/`mx2.hostinger.co.uk` | Not recreated |
| `autodiscover` and `autoconfig` CNAMEs (`*.mail.hostinger.com`) | Not recreated (Hostinger mail client config; no Hostinger mailboxes) |
| `dev` (old version of the site) | Deleted |
| `new`, `ftp` (unused) | Deleted |
| `pm-bounces` (Postmark return-path from an unused ActiveCampaign/Postmark trial) | Deleted |
| `n8n` (live n8n instance, same server IP as `dev`) | Kept, set to **DNS only** to preserve how it worked before |
| `www` | Replaced the Hostinger CNAME with an **A record to `192.0.2.1`, Proxied** (dummy placeholder so the redirect rule can act) |

Confirmed by a Cloudflare DNS screenshot on 4 October 2026: the zone holds exactly 15 records (`n8n`, `www`, 5 Google MX, SPF, 4 verification TXTs, `_dmarc`, `google._domainkey`, plus the Worker Custom Domain record). `dev`, `new`, `ftp`, `pm-bounces` and all apex A/AAAA records are gone. `dev.digi-business.co.uk` still loaded for a while afterwards because public resolvers were still serving the old Hostinger DNS (see Issues found after cutover).

### Stage 3: Custom Domain on the Worker
Added from the Worker's Domains & Routes (not from the zone screen). Cloudflare created the root record and SSL certificate itself. The zone's "Visitors cannot reach digi-business.co.uk" recommendation before this step was expected, because the apex records had been deliberately deleted.

### Stage 4: www to apex redirect
Created from the "Redirect from WWW to root" template: pattern `https://www.*`, target `https://${1}`, 301, **Preserve query string ticked**. Cloudflare warned the rule "may not apply" because it could not see a proxied `www` record; deployed anyway ("Ignore and deploy rule anyway"), and the redirect was subsequently seen working.

### Stage 5/6: Verify and switch nameservers
DNS list compared against the plan before switching. Nameservers changed at Hostinger. Early lookups through Google's public DNS still returned the old values (resolver caching); the new site was reachable via other resolvers within the same session.

## Issues found after cutover

1. **Contact form returned "Could not send message" (502).** Cause: `src/pages/api/contact.ts` read the email binding via `locals.runtime.env`, which the installed Astro adapter deliberately throws on (removed in Astro v6). Fix: `import { env } from 'cloudflare:workers'` and `env.SEB.send(...)`. The destination address `will@digi-business.co.uk` was also verified in Cloudflare (Email Service > Email Routing > Destination addresses). **Email Routing was not enabled on the domain**, because that would have replaced the Google MX records.
2. **Form email landed in spam.** Headers showed SPF softfail (Cloudflare's sending IP not authorised), DKIM pass but for `cloudflare-email.net` (not aligned), DMARC fail. Fix: the root SPF record was changed to `v=spf1 include:_spf.google.com include:_spf.mx.cloudflare.net ~all` (edited in place, not a second SPF record). A later test showed SPF pass, DMARC pass, and a pass for DKIM on `cloudflare-email.net`.
3. **Remaining harmless DKIM note:** the message also carries a signature for `digi-business.co.uk` (selector `cf2024-1`) that reports `permerror (no key for signature)`, because that public key is not published. DMARC passes via SPF, and DMARC is `p=none`, so nothing is blocked. Publishing the key would need Cloudflare email onboarding, which risks the MX records, so it was deliberately not done.
4. **Reply-To added** to the form email (`Reply-To` set to the enquirer, with basic email validation) so Reply in Gmail goes to the visitor, not `noreply@`.

Recommended: a Gmail filter on `noreply@digi-business.co.uk` (never send to spam) as a belt-and-braces measure.

## Final checklist

Confirmed:
- [x] `https://digi-business.co.uk` loads the new site (verified by fetch, with current copy)
- [x] `https://www.digi-business.co.uk` redirects to the apex (seen in the fetch)
- [x] Contact form delivers, with SPF/DMARC pass and a working Reply-To

Not yet confirmed (do these):
- [ ] External test email *to* `will@digi-business.co.uk` arrives
- [ ] Test email *from* the Workspace account: SPF, DKIM and DMARC all pass in headers
- [ ] Google Search Console property still shows as verified
- [ ] Facebook Business Manager domain verification still verified
- [ ] `https://digi-business.co.uk/robots.txt` still contains the sitemap line (Bot Preference Sync prepends to it)
- [ ] `https://n8n.digi-business.co.uk` still loads its sign-in page
- [ ] Old backlinked URLs (e.g. `/contact-us/`, `/seo-case-studies/`) 301 correctly. One old URL, `/tag/ways-email-marketing-can/`, was seen returning 404; review Search Console's crawl errors over the coming weeks and add redirects where worthwhile
- [ ] The Hostinger date 2026-12-04 (email plan expiry or domain renewal date?) checked at the registrar, and the domain set to renew
- [x] `ftp`, `new` and `dev` records confirmed absent from Cloudflare DNS
- [ ] `dev.digi-business.co.uk` stops resolving everywhere once the nameserver change finishes propagating (up to 48 hours). If it still loads after that, investigate. The old dev site itself, if still wanted gone, must be removed on the server at `187.124.117.224`, which also hosts n8n, so take care not to break n8n
- [ ] Optional: turn on Always Use HTTPS (SSL/TLS > Edge Certificates) so plain `http://www...` upgrades before redirecting
- [ ] Optional: disable the `workers.dev` URLs later (canonical tags already point at `digi-business.co.uk`)

## If something goes wrong

Nameservers can be reverted at Hostinger to `ns1.dns-parking.com` / `ns2.dns-parking.com`, but propagation delay applies in reverse. Note that the old Hostinger A and AAAA records were deleted from Cloudflare, not preserved, and the old hostnames `dev`, `new` and `ftp` no longer resolve.

## Not covered

- Email itself was not migrated: Google Workspace remains the mail system, and Cloudflare Email Routing was deliberately not enabled on the root domain (it would replace the Google MX records).
- Cloudflare's newer Email Sending (beta, Workers Paid plan) was looked at as an alternative for the contact form, but was not needed once the code bug and SPF were fixed. It would add records on a `cf-bounce` subdomain and a DMARC TXT at `_dmarc`, which could clash with the existing DMARC record.
