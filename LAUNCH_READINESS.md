# Launch readiness

Nothing below is done unless checked. The same checklist appears in **Admin → Settings**.

## Business and legal (owner)
- [ ] Final name spelling confirmed; name clearance (Georgia SOS search, USPTO search)
- [ ] Legal entity / DBA registered; set `legalName`
- [ ] Licensed conditioned-air contractor structure verified (who holds the license, which work is allowed). A qualified relative or subcontractor is not proof of authority to advertise regulated work.
- [ ] EPA Section 608 certification for anyone handling refrigerant
- [ ] General liability insurance (and workers' comp if applicable)
- [ ] Subcontractor agreements and COIs, if used
- [ ] Privacy policy and terms reviewed by a professional; remove draft banners
- [ ] SMS / call recording / marketing consent wording reviewed; bump `consentText` versions if changed

## Public facts (`src/config/business.ts`)
- [ ] `publicPhone` / `publicPhoneDisplay` (call buttons appear automatically)
- [ ] `publicEmail`, `publicDomain`
- [ ] `businessHours`
- [ ] `serviceAreaLabel`, `serviceAreaCommunities`
- [ ] Approved ZIPs added in Admin → Settings (production database)
- [ ] Approved request categories (Admin → Settings), then `serviceCategoriesApproved = true`
- [ ] Diagnostic fee policy decided; FAQ copy updated
- [ ] Real photos (team, van, work) with rights; replace designed placeholders as wanted
- [ ] Final logo approved and dropped into `BrandMark`

## Technical
- [ ] Managed Postgres created; `DATABASE_URL` set; automated backups confirmed; restore tested once
- [ ] `IP_HASH_SALT`, `SESSION_SECRET` set (random, 32+ chars)
- [ ] Owner login created with `npm run db:create-owner`; demo logins never created in production
- [ ] New-lead email alert connected (Resend/Postmark) and tested
- [ ] Domain connected with HTTPS; `NEXT_PUBLIC_SITE_URL` set
- [ ] Uptime check on `/api/health`
- [ ] Error tracking chosen (privacy-respecting; logger already redacts PII)
- [ ] Google Business Profile verified (only after the above)
- [ ] Flip `siteMode` to `"live"` (removes preview banner, enables indexing and sitemap in robots.txt)

## Must stay OFF until separately approved
`paymentProcessingEnabled`, `membershipSalesEnabled`, `smsMarketingEnabled`, `aiReceptionistEnabled`, `outboundAutomationEnabled`, `instantBookingEnabled`, `emergencyServiceEnabled`, `reviewsEnabled`, `publicPricingApproved`.
