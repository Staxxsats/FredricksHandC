# Operations: how the office uses the system (Phase 1)

## Daily
1. Sign in at `/admin`. The top cards show new today, not yet contacted, awaiting confirmation, confirmed for today and follow-ups due.
2. Red **SAFETY** tags mean the customer mentioned gas, CO, smoke or sparks. Call those first. The customer was already told to leave and call 911 / the gas utility.
3. **POSSIBLE DUP** means the same phone sent another open request in the last 14 days. Open both, then use **Duplicate? → Merge** on the extra one.

## Working a lead
1. Open the lead. Call the customer (tap the phone number).
2. **Log contact** with a one-line summary (call, text, voicemail, etc.).
3. **Mark contacted**. When you've confirmed the address, problem and that it's work we do, **Mark qualified**.
4. Agree a date and time with the customer, then **Confirm appointment** and enter that exact time. Only do this after the customer agrees. The system won't send any calendar invite or text; tell the customer yourself.
5. If you can't help: **Mark not eligible** (reason required) or **Mark closed** (reason required).
6. Use **Next step** to set a reminder ("Call back after 5pm", due time). Overdue follow-ups show in the top cards.
7. **Assigned to** lets a technician see that lead when they sign in. Technicians see only leads assigned to them and cannot change status.

If a customer cancels a confirmed visit, use **Undo confirmation** (goes back to qualified) and log the contact.

## Consent and opt-outs
- The lead shows service-contact and marketing consent with version and date.
- If someone asks to stop marketing, click **Record opt-out** next to Marketing. This is permanent history and suppresses the customer for marketing.

## Service area and categories
Admin → Settings: add or deactivate ZIPs; disable a category to remove it from the request form (the server also rejects it).

## When something fails
- If the website can't save a request, the customer sees "Not sent" and can retry; nothing is half-saved and retrying never creates duplicates.
- The **Automation queue** in Settings shows every notification event. "skipped" means no provider is connected yet (expected today). "failed"/"dead" need attention.
- `/api/health` reports database status.

## Not in Phase 1
Estimates, invoices, payments, work orders, technician job notes/photos, calendar sync, SMS. Track those outside the system for now and log key contacts on the lead.
