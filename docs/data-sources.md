# Data sources: price and promo-code spike (#6)

Access date for every claim below: 2026-11-15. "Not verified" means we could not confirm the fact on a vendor page. Output feeds #12.

## 1. Purpose and rules

- Find a legal source of live prices and promo codes for the PRD stores: Amazon, Walmart, Target, American Eagle, Banana Republic, Adidas, Facebook Marketplace.
- Only official APIs and affiliate feeds are considered. Store sites are never scraped (AGENTS.md section 3).
- Paid scraping and unofficial services (SerpApi, Rainforest, Keepa, scraping actors) are excluded because they are scraping or unofficial.
- The chosen source plugs into `getListingUpdates(item, listings)`. It returns `{ price, stockBySize: Record<size, qty> }` per listing. A deterministic demo fallback runs when the key is missing or the call fails.
- Each listing carries `source: "live" | "demo"`. Anything from the fallback is labelled demo.
- The user makes the decision. This doc only recommends.

## 2. Comparison

| Option | PRD stores covered | Free tier | Approval and wait | Rate limits | ToS on caching and display | Per-size stock | Promo codes | Auth needed | Effort |
|---|---|---|---|---|---|---|---|---|---|
| Amazon Creators API | Amazon | Free | Needs Associates account and at least 10 qualifying sales in the past 30 days [1][2] | Not verified from Amazon. Third-party blogs say about 1 request per second [3] | Not verified. Third-party blogs disagree (1 hour vs 24 hours) [3] | Not verified, assumed none | No | Credentials from Associates Central [2] | Medium. Blocked by the sales gate |
| Walmart affiliate API (walmart.io, Impact) | Walmart | Free to join the program [4] | Walmart reviews each application at its discretion [4]. API access for new members: not verified | Not verified | Not verified | Not verified | No | Approved affiliate account | Medium. Wait unknown |
| Affiliate networks (Impact, CJ, Rakuten) | Target, Adidas (Impact, per secondary sources [5][6]). American Eagle (CJ per a directory site [7]). Banana Republic: network not verified [12] | Free to join | Per-brand approval. Time not verified. A public site is usually asked for | Not verified | Feed ToS not verified | Not verified, feeds are usually product level | Coupon feeds exist on networks. Per-brand access not verified [13] | Network account plus per-brand approval | High |
| eBay Browse API | None of the PRD stores. Covers new, used and resale | Free. Default 5,000 calls per day for the Browse API, from a community post quoting eBay docs [8] | Developer account. Production keyset needs account deletion notifications, or an opt-out if no eBay data is stored [9]. Wait time: not verified | 5,000 per day by default. Higher needs the Application Growth Check [8] | eBay API License Agreement. Page not reachable by us (404 and 403), so not verified | Not verified. Quantity per size not verified | No | OAuth app token | Low to medium |
| Best Buy Products API | None of the PRD stores. Small tech only | Free key, email signup and activation [10] | Key by email [10]. Wait not stated | Not stated. A 403 means invalid key or call limit exceeded [10] | "Not to cache any content except on a temporary basis" [10]. This blocks our Postgres history | No size field. `onlineAvailability` only [10] | No | API key in query string [10] | Low |
| Facebook Marketplace | Facebook Marketplace | n/a | n/a | n/a | n/a | n/a | n/a | n/a | No public listings API found. Stays demo |

## 3. Notes per option

### Amazon Creators API
- PA-API 5 is deprecated. Calls to it get HTTP 403 `AccessDeniedException`. The Creators API is the replacement [1]. Exact shutdown dates are not on that page. A third-party blog reports 15 May 2026 [3]. We do not document PA-API 5 as live.
- The Creators API intro page says access needs an enrolled Associates account and at least 10 qualifying sales in the past 30 days [2]. A student project with no traffic cannot meet that tonight.
- Rate limits, price caching and display rules are not on the pages we could read. Do not rely on the 1 hour or 24 hour figures from blogs.

### Walmart affiliate API
- The affiliate FAQ describes the Affiliate Member Center, data feeds and Impact tracking. It does not mention an API, rate limits or API terms [4]. Whether new members get API access: not verified. The developer portal landing page lists only seller, supplier, carrier and advertising programs, with no affiliate API [11].
- Approval is at Walmart's discretion and can be refused [4].

### Affiliate networks (Impact, CJ, Rakuten)
- Target runs on Impact according to secondary sources [5]. Adidas US is on Impact according to one secondary source [6]. American Eagle is on CJ according to one directory [7]. Banana Republic: one directory points to VigLink, not confirmed [12]. None of these are brand pages.
- The CJ developer portal page we fetched had no usable content [13]. Approval time, feed ToS and coupon feed access are not verified for any network.
- This is the only legal route to promo codes for the PRD brands. It also needs per-brand approval, which is the slowest option.

### eBay Browse API
- Not a PRD store. Useful because signup is self-serve and it covers used and resale listings, which the PRD counts (story 3).
- Subscribe to marketplace account deletion notifications, or opt out if no eBay data is stored [9]. We would store prices in Postgres, so assume we must build the endpoint. Opt-out eligibility for stored price data: not verified.
- Default limit 5,000 calls per day [8]. A daily cron for a small wishlist fits.
- The developer docs and license pages returned 403 or 404 to our fetches, so caching and display rules are not verified. Read the license before storing prices.

### Best Buy Products API
- Not a PRD store. Keys are issued by email signup [10]. Whether signup is still open today: the docs page says so, not independently confirmed.
- Terms forbid caching beyond temporary use [10]. A price history table would break that rule.
- The Commerce API is invite only [14]. We do not need it.

### Facebook Marketplace
- No public listings API found. It stays demo and is labelled demo.

## 4. Gaps

- Per-size stock: no source above gives verified quantity per size. `stockBySize` stays demo. Low-size alerts stay demo.
- Promo codes: only affiliate networks carry them, and none is approved. Codes stay seeded demo data.
- Facebook Marketplace stays demo.
- Amazon, Walmart, Target, American Eagle, Banana Republic and Adidas all need an approval we do not have today.

## 5. Recommendation

Weights: no approval wait 35%, PRD store coverage 25%, ToS fit for Postgres plus daily cron 15%, free tier and limits 15%, effort 10%. Scores are 0 to 5 judgement calls, not measurements.

| Option | No wait (35) | Coverage (25) | ToS fit (15) | Free tier (15) | Effort (10) | Weighted, of 5 |
|---|---|---|---|---|---|---|
| eBay Browse API | 3 | 0 | 2 | 4 | 3 | 2.2 |
| Affiliate networks | 1 | 4 | 1 | 2 | 0 | 1.8 |
| Best Buy Products API | 3 | 0 | 0 | 3 | 4 | 1.9 |
| Walmart affiliate API | 1 | 1 | 1 | 2 | 2 | 1.2 |
| Amazon Creators API | 0 | 1 | 1 | 2 | 2 | 0.6 |

Honest answer: nothing covers the PRD stores and works tonight.

1. Ship the demo fallback as the path for all PRD stores. Every listing is `source: "demo"`. The plan allows cutting #12 to this. It keeps data honesty intact.
2. If the user wants one real adapter for #12, use the eBay Browse API for used and resale listings only. Read the eBay license for storage rules before saving prices. Keep `stockBySize` demo.
3. In parallel, apply to Impact for Target and Adidas. Treat any approval as a later bonus, not a dependency.

Fallback rule: no key or any failed call returns the deterministic demo values, labelled demo.

## 6. Sources (accessed 2026-11-15)

1. Amazon, PA-API 5 deprecation: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
2. Amazon, Creators API introduction: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction
3. Third-party blogs on shutdown date, limits, caching (secondary): https://blog.freshstore.com/amazon-creators-api-pa-api-retirement/ and https://velantio.com/blog/how-to-get-amazon-creators-api-access
4. Walmart affiliates FAQ: https://affiliates.walmart.com/faqs
5. Target affiliate on Impact (secondary): https://affmaven.com/target-affiliate-program/
6. Adidas on Impact (secondary): https://reverbico.com/blog/adidas-affiliate-program/
7. American Eagle on CJ (secondary): https://uppromote.com/affiliate-directory/american-eagle/
8. eBay API call limits: https://developer.ebay.com/develop/get-started/api-call-limits (page not reachable by us, figure from search results and a community post)
9. eBay account deletion notifications: https://developer.ebay.com/support/kb-article?KBid=5196
10. Best Buy API documentation: https://bestbuyapis.github.io/api-documentation/
11. Walmart developer portal: https://developer.walmart.com/api/us/affiliates
12. Banana Republic directory listing (secondary): https://getlasso.co/affiliate/banana-republic/
13. CJ developer portal: https://developers.cj.com/docs/product-feed
14. Best Buy APIs overview: https://developer.bestbuy.com/apis

Decision: pending
