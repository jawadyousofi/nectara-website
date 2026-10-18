# Nectara website (nectaraschool.org)

A small, fast static site with one working form. Hosted on Cloudflare Pages.

## Pages

| File | Page |
| --- | --- |
| index.html | Home |
| approach.html | How we learn (beliefs + a day at Nectara) |
| programs.html | Programs: Seeds 2–3, Sprouts 4–5, Blossoms 6–7, and formats |
| families.html | For families + FAQ |
| asal.html | Meet Asal (for children) |
| about.html | Our story, the name, how Nectara will grow, partners |
| join.html | Founding-list sign-up form (families, teachers, partners) |
| 404.html | Not-found page |

`assets/` holds the stylesheet, script, the Flight logo mark and Asal. To change wording, edit `build.py` and run `python3 build.py`, which rewrites every page with the same header and footer. (You can also edit the .html files directly; just remember build.py will overwrite them next time it runs.)

## Put it online (Cloudflare Pages)

1. In Cloudflare: **Workers & Pages → Create → Pages → Upload assets** (or connect a GitHub repo). Name the project `nectara`.
2. Upload this whole folder (including `functions/`). With a GitHub repo, set the build command to empty and the output directory to `/`.
3. **Custom domains:** add `nectaraschool.org` and `www.nectaraschool.org`. Add `nectaraschool.com` too, then in Cloudflare create a Redirect Rule sending nectaraschool.com/* to https://nectaraschool.org/$1 (301).
   Your domains are at Namecheap: either move their nameservers to Cloudflare (recommended, Cloudflare walks you through it) or add the CNAME records Cloudflare shows you.

## Turn on the sign-up form

1. **Workers & Pages → KV → Create namespace** named `nectara-interest`.
2. Done: `wrangler.toml` binds it as `NECTARA_INTEREST` (namespace nectara-interest).
3. Optional, to download sign-ups as a spreadsheet: **Settings → Variables and secrets**, add secret `ADMIN_TOKEN` (any long random phrase). Then visit
   `https://nectaraschool.org/api/interest-export?token=YOUR_ADMIN_TOKEN` to download a CSV. You can also browse entries in the KV namespace in the dashboard.
4. Optional email alert for each sign-up (free tier at resend.com): add secrets `RESEND_API_KEY`, `NOTIFY_EMAIL` (where alerts go) and `FROM_EMAIL` (a sender on a domain verified in Resend, e.g. `Nectara <hello@nectaraschool.org>`).

Until step 2 is done, the form politely says sign-ups aren't connected yet.

## Before launch, please check

- Founder paragraph on **Our story** mentions you and your son; edit if you'd rather keep it more private.
- Programs, tuition, location and licensing are written as "coming" on purpose. Licensing rules for early-childhood programs vary by state and program type, so confirm what applies before announcing a start date.
- The logo mark in `assets/logo-mark.svg` is a vector redraw of "The Flight". Swap in the final artwork file if you have one.
