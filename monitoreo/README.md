# Exentia · Monitoreo (Backend tracking)

Toda la infraestructura **NO incrustada en la página web**: schema Supabase + workflows n8n.

## Estructura

```
monitoreo/
├── sql/
│   └── 01_schema_init.sql          ← schema exentia ya aplicado en proyecto n8n
└── n8n/
    ├── exentia-track.json          ← ingress tracking (browser → leads)
    ├── exentia-reserva.json        ← form submit → bookings + wa.me
    ├── exentia-checkin.json        ← terapeuta marca llegada
    ├── exentia-resena.json         ← cliente responde reseña
    └── exentia-upload-conversions.json  ← cron 1h retry Google/Meta (pendiente creds)
```

## Supabase

- Proyecto: **n8n** (`fneppfjeywhayknrgahe`)
- Schema: **`exentia`**
- Tablas: `leads`, `servicios`, `terapeutas`, `bookings`, `disponibilidad`, `eventos_atribucion`, `mensajes_wa`
- Views: `dashboard_kpis_today`, `revenue_by_channel_7d`, `terapeuta_utilization`, `sessions`
- Storage: `exentia-public` (público), `exentia-private` (service_role only)

## Workflows n8n

**Instancia:** `https://n8n-ntcue-clone-u59578.vm.elestio.app/`

### Antes de importar
1. En n8n → Credentials → crear/verificar credencial **Postgres** apuntando al proyecto Supabase `n8n`. Usar connection string Postgres directo (port 5432, host `db.fneppfjeywhayknrgahe.supabase.co`).
2. Tras importar cada workflow, abrir cada nodo Postgres y reasignar la credencial (los JSON traen el placeholder `REPLACE_WITH_SUPABASE_CRED_ID`).

### Webhooks que expone
| Workflow | Endpoint |
|---|---|
| `exentia-track` | `POST /webhook/exentia-track` |
| `exentia-reserva` | `POST /webhook/exentia-reserva` |
| `exentia-checkin` | `POST /webhook/exentia-checkin` |
| `exentia-resena` | `POST /webhook/exentia-resena` |
| `exentia-upload-conversions` | cron cada 1h (sin webhook) |

### Pendientes para activar
- **`exentia-reserva`**: reemplazar `telYaz = '529982XXXXXXX'` con el WhatsApp real de Yaz en el Code node `Normalize`.
- **`exentia-upload-conversions`**: completar credenciales Google Ads (customerId + OAuth + developer-token) y Meta CAPI (pixel_id + access_token con scopes `ads_management + ads_read + business_management`). NO activar hasta Fase 7.
- **GHL upsert** (en `exentia-reserva`): no incluido todavía. Se agrega cuando esté la location GHL Exentia + 27 custom fields creados (Tarea 3).

## AEC pattern aplicado
- `continueOnFail: true` en todos los nodos Postgres y HTTP
- `executeQuery` con parámetros `$1, $2...` para evitar injection
- Schema `exentia.<tabla>` en cada query
- `Webhook responseMode: responseNode` para controlar respuesta
- CORS headers en todos los Respond
- Code node parsea body si llega como string (text/plain bypass preflight)
