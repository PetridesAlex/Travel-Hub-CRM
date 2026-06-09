# Website & Outlook → Auto Lead

Automatically create CRM leads when clients submit a form on your website or when you receive the notification email in Outlook.

## How it works

```
Website form  ──POST──►  /api/leads/inbound  ──►  Client + Lead in CRM  ──►  Slack alert
     │
     └── (optional) sends email to Outlook
              │
Power Automate reads inbox ──POST──►  /api/leads/inbound (same endpoint)
```

The endpoint accepts either **structured JSON** (best) or **raw email text** (for Outlook automation).

---

## Honeywell Travel website (wired)

The website at [honeywelltravel.com.cy](https://www.honeywelltravel.com.cy/) syncs automatically via `api/crm-lead.js` on every public form submission (`createLead` in `src/lib/leads.js`).

**Vercel env on the website project:**

| Variable | Value |
|----------|--------|
| `CRM_AGENCY_API_KEY` | API key from Travel Hub CRM → Settings |
| `CRM_INBOUND_URL` | `https://travel-hub-crm.vercel.app/api/leads/inbound` |

**Vercel env on Travel Hub CRM:**

| Variable | Value |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

Forms synced: Contact, Package reservation, Build Your Trip, Cruises, Honeymoon, DMC, Flights, and any other page using `src/lib/leads.js`.

---

## Step 1 — Vercel environment variable

Add to Vercel → **Settings → Environment Variables** (Production):

| Variable | Where to find it |
|----------|------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key |

Redeploy after adding.

---

## Step 2 — Get your credentials

In CRM → **Settings**:

1. Copy your **API Key**
2. Copy the **Webhook URL**: `https://travel-hub-crm.vercel.app/api/leads/inbound`

---

## Option A — Direct from website (recommended)

If you control the website form, POST directly to the CRM — no Outlook step needed.

**Request:**

```http
POST https://travel-hub-crm.vercel.app/api/leads/inbound
Content-Type: application/json
X-Agency-Api-Key: YOUR_API_KEY
```

**Body:**

```json
{
  "full_name": "Maria Papadou",
  "email": "maria@example.com",
  "phone": "+357 99 123 456",
  "destination": "Maldives",
  "package": "Honeymoon Package 7 nights",
  "travel_dates": "July 2026",
  "budget": "8500",
  "number_of_adults": 2,
  "message": "Looking for all-inclusive honeymoon with seaplane transfer",
  "source": "honeywelltravel.com contact form"
}
```

**Response:**

```json
{
  "success": true,
  "lead_id": "uuid",
  "client_id": "uuid",
  "client_created": true,
  "parsed": {
    "destination": "Maldives",
    "travel_type": "honeymoon",
    "budget": 8500,
    "source": "honeywelltravel.com contact form",
    "package_name": "Honeymoon Package 7 nights"
  }
}
```

### WordPress / Contact Form 7

Use a plugin like **CF7 to Webhook** or **WP Webhooks** to POST form fields to the URL above with the API key header.

Map fields: `your-name` → `full_name`, `your-email` → `email`, etc.

---

## Option B — Outlook via Power Automate

Use this when your website only sends you an email (no direct webhook).

### Flow setup (Microsoft Power Automate)

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. **Create** → **Automated cloud flow**
3. Trigger: **When a new email arrives (V3)** — Outlook
   - Folder: Inbox
   - Subject filter: e.g. `contains "New contact"` or your form subject line
   - Only with attachments: No
4. Action: **HTTP** — POST
   - URI: `https://travel-hub-crm.vercel.app/api/leads/inbound`
   - Headers:
     - `Content-Type`: `application/json`
     - `X-Agency-Api-Key`: your API key
   - Body:

```json
{
  "raw_email": "@{triggerOutputs()?['body/body']}",
  "source": "outlook - website form"
}
```

5. Save and test by submitting a form on your website.

The CRM parser reads common patterns from the email body:

```
Name: Maria Papadou
Email: maria@example.com
Phone: +357 99 123 456
Destination: Maldives
Package: Honeymoon 7 nights
Message: We want all-inclusive...
```

It also infers **travel type** from keywords (cruise, honeymoon, flight, hotel, package, etc.).

---

## Option C — n8n

1. **Outlook trigger** or **Webhook trigger** (if website posts to n8n first)
2. **HTTP Request** node → POST to `/api/leads/inbound` with API key header
3. Pass structured fields or `raw_email`

---

## What gets created

| CRM record | Details |
|------------|---------|
| **Client** | Created if email is new; linked if client already exists |
| **Lead** | Destination, travel type, budget, dates, notes with full message |
| **Slack** | Same 🔥 New Lead alert as manual leads |

Lead notes include the source and original message for your team.

---

## Testing with curl

```bash
curl -X POST https://travel-hub-crm.vercel.app/api/leads/inbound \
  -H "Content-Type: application/json" \
  -H "X-Agency-Api-Key: YOUR_API_KEY" \
  -d '{
    "full_name": "Test Website Lead",
    "email": "test.website@example.com",
    "destination": "Dubai Package",
    "package": "Dubai City Break",
    "message": "Family of 4, looking for flights and hotel in August",
    "source": "manual test"
  }'
```

Check **Leads** in the CRM and your Slack channel.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Invalid agency API key` | Copy key from Settings → Agency Profile |
| `SUPABASE_SERVICE_ROLE_KEY is not configured` | Add to Vercel env and redeploy |
| Lead created but fields wrong | Send structured JSON instead of raw email, or adjust Power Automate to map fields |
| Duplicate leads | Add a filter in Power Automate (e.g. only emails from your form sender address) |
