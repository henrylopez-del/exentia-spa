# Arqalum Tracking v1 — Install Guide

Complete visibility: every click, scroll, session, with full attribution.
Estimated total install time: ~12 minutes.

---

## Step 1 — Supabase table (2 min)

1. Open https://supabase.com/dashboard/project/fneppfjeywhayknrgahe/sql/new
2. Paste the entire contents of `01-supabase-schema.sql`
3. Click **Run**. Should return "Success. No rows returned."
4. Verify: go to Table Editor → `arqalum_leads` should exist with 0 rows.

---

## Step 2 — n8n workflow (3 min)

1. Open https://n8n-ntcue-clone-u59578.vm.elestio.app
2. Click **Workflows** → **Import from File**
3. Select `02-n8n-workflow.json`
4. Open the imported workflow "Arqalum Click Tracker"
5. Click **Active** toggle (top right) to enable it
6. Copy the production webhook URL — should be `https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/arqalum-track`
7. Test in terminal:
   ```bash
   curl -X POST https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/arqalum-track \
     -H "Content-Type: application/json" \
     -d '{"click_type":"test","session_id":"test-sid-123","page_path":"/test"}'
   ```
   Should return `{"ok":true,"lead_ref":"XXXXXXXX"}`.
8. Verify in Supabase: `SELECT * FROM arqalum_leads WHERE click_type='test';` should have one row.

---

## Step 3 — Microsoft Clarity (3 min)

1. Go to https://clarity.microsoft.com → **Sign in with Microsoft**
2. Click **Add new project**
3. Name: `Arqalum` · Website URL: `arqalum.com` · Category: `Business Services`
4. After creation, copy the **Project ID** (10-char alphanumeric shown in the install snippet)
5. In the new landing HTML, find the line:
   ```
   })(window, document, "clarity", "script", "CLARITY_PROJECT_ID");
   ```
   Replace `CLARITY_PROJECT_ID` with your actual project ID.

---

## Step 4 — Deploy landing to OctoberCMS (3 min)

1. The updated landing is at `/Users/henrylopez/Desktop/Claude/CLIENTES/arqalum/cotizacion-residencial.html`
2. Open the file in a text editor
3. Copy the ENTIRE contents (Cmd+A, Cmd+C)
4. Go to https://arqalum.com/backend → CMS → Pages → `cotizacion-residencial`
5. Click **Markup** tab → Select all → Paste → **Save**
6. Repeat for `cotizacion-comercial.html` if applicable (needs same changes, see Step 6)

---

## Step 5 — Verify end-to-end (2 min)

1. Visit https://arqalum.com/cotizacion-residencial?gclid=test123&utm_source=manual&utm_term=verification
2. Scroll down, click the WhatsApp button (cancel the WhatsApp app if it opens)
3. In Supabase Studio SQL Editor, run:
   ```sql
   SELECT created_at, click_type, lead_ref, utm_term, gclid, device_type
   FROM arqalum_leads
   ORDER BY created_at DESC
   LIMIT 10;
   ```
4. You should see:
   - `pageview` row with `gclid=test123`, `utm_term=verification`
   - One or more `scroll_25`/`scroll_50` rows
   - `whatsapp_click` row with the same `lead_ref`
5. Visit https://clarity.microsoft.com/projects/view/YOUR_PROJECT_ID/dashboard → session should appear within 2 minutes.

---

## Step 6 — Apply to comercial landing (optional, 3 min)

The same tracking block (three `<script>` tags added to `<head>`) also needs to go into `cotizacion-comercial.html`. Only change `LANDING_VERSION` from `residencial-v1-2026-04-16` to `comercial-v1-2026-04-16`.

---

## What you get

- **Every click logged** with gclid, utm_term, device, session_id, lead_ref
- **Session recordings + heatmaps** via Clarity (free, unlimited)
- **WhatsApp messages arrive with `[Ref XXXXXXXX]`** so Gerardo sees the source
- **Scroll depth milestones** (25/50/75/100) to measure engagement quality
- **Independent of gtag** — survives adblockers and lazy-load bugs
- **`navigator.sendBeacon`** ensures the click fires even when redirecting to WhatsApp

## Dashboard query examples

```sql
-- All clicks today
SELECT * FROM arqalum_leads_today;

-- Sessions that clicked WhatsApp
SELECT * FROM arqalum_sessions WHERE clicked_whatsapp LIMIT 50;

-- Top converting keywords (last 7 days)
SELECT utm_term, COUNT(DISTINCT session_id) AS clickers
FROM arqalum_leads
WHERE click_type='whatsapp_click' AND created_at > now() - interval '7 days'
GROUP BY utm_term ORDER BY clickers DESC;

-- Dead sessions (no engagement)
SELECT session_id, MAX(scroll_depth_pct), COUNT(*) AS events
FROM arqalum_leads
WHERE created_at::date = CURRENT_DATE
GROUP BY session_id
HAVING MAX(scroll_depth_pct) < 25
ORDER BY events DESC;
```

## Next (future work, not today)

- Notification to Henry on every `whatsapp_click` (Supabase DB webhook → Slack/email)
- Offline conversion upload to Google Ads (send Gerardo-closed deals back with gclid for Smart Bidding)
- Reconnect Gerardo's WhatsApp number to a CRM (GHL LC Phone or WhatsApp Business API)
