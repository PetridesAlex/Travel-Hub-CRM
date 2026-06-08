# n8n Automation Guide

This CRM is designed to work with n8n automations via **Supabase Database Webhooks**. The frontend never contains service role keys — all automations run server-side in n8n.

## Prerequisites

1. A running n8n instance (cloud or self-hosted)
2. Supabase project with the CRM schema applied
3. Supabase **service role key** stored securely in n8n credentials (never in the frontend)

## Setup Overview

1. In Supabase Dashboard → **Database** → **Webhooks** → Create webhook
2. Point webhook URL to your n8n Webhook trigger node
3. In n8n, use the **Supabase** node with service role key for read/write operations

---

## Automation 1: New Lead

**Trigger:** Supabase webhook on `INSERT` to `leads` table

**n8n workflow:**
1. Webhook receives new lead payload
2. Create a follow-up task in `tasks` table (due in 2 days)
3. Create an email draft in `email_drafts` table (type: follow_up)
4. Send notification (email, Slack, etc.)

**Payload fields:** `id`, `user_id`, `client_id`, `destination`, `travel_type`, `budget`, `follow_up_date`

**Note:** Set `automation_processed = true` on the lead after processing to avoid duplicate runs.

---

## Automation 2: Quotation Sent

**Trigger:** Supabase webhook on `UPDATE` to `quotations` where `status` changes to `sent`

**n8n workflow:**
1. Webhook receives quotation payload
2. Fetch client email from `clients` table
3. Send email via **Outlook** node with quotation details
4. Update or create `email_drafts` record with `status = sent`

---

## Automation 3: Payment Reminder (Daily)

**Trigger:** n8n **Cron** node — runs daily at 9:00 AM

**n8n workflow:**
1. Query `bookings` where `balance_due > 0` AND `due_date` is within 7 days
2. For each booking, fetch client details
3. Create `email_drafts` record (type: payment_reminder)
4. Optionally send via Outlook immediately

**Example Supabase query filter:**
```
balance_due > 0
due_date <= (today + 7 days)
status IN (pending, confirmed)
```

---

## Automation 4: Voice Note Processing

**Trigger:** Supabase webhook on `INSERT` to `voice_notes` table

**n8n workflow (current):**
1. Webhook receives transcript
2. Log the note for review

**n8n workflow (future with OpenAI):**
1. Send transcript to OpenAI for parsing
2. Extract: client name, destination, budget, follow-up date
3. Create or link client in `clients`
4. Create lead in `leads`
5. Create follow-up task in `tasks`
6. Set `processing_status = 'processed'` on the voice note

---

## Automation 5: Marketing Campaign

**Trigger:** Supabase webhook on `UPDATE` to `marketing_campaigns` where `status` changes to `scheduled`

**n8n workflow:**
1. Webhook receives campaign payload
2. Parse `audience` field to determine client list
3. Query matching clients from `clients` table
4. Send client list to **Brevo** API for campaign delivery
5. Update campaign `status = sent` after Brevo confirms

---

## Security Notes

- Use Supabase **service role key** only in n8n (server-side)
- Frontend uses **anon key** with RLS — users only see their own data
- Webhook payloads include `user_id` — scope all n8n database writes to that user
- Never expose service role key in React code or `.env` files committed to git

## Webhook Payload Example

```json
{
  "type": "INSERT",
  "table": "leads",
  "record": {
    "id": "uuid",
    "user_id": "uuid",
    "client_id": "uuid",
    "destination": "MSC Cruise Mediterranean",
    "travel_type": "cruise",
    "budget": 4000,
    "status": "new",
    "automation_processed": false
  }
}
```

## Testing

1. Create a test lead in the CRM
2. Check n8n execution log for the webhook trigger
3. Verify task and email draft were created in Supabase
4. Check `automation_processed` flag on the lead
