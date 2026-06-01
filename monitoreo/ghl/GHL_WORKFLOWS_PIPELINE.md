# GHL Workflows para mover contactos en pipeline Reservas

Estos workflows se configuran en la UI de GHL (no requieren n8n). Cuando el dashboard de Exentia hace una acción, el webhook n8n añade un tag o crea un invoice — GHL detecta eso y mueve la opportunity en el pipeline automáticamente.

## Pipeline objetivo

**Pipeline:** `Reservas` (ID: `0yWVmwR1YLLZfwjPXRcw`)

| Stage | ID |
|---|---|
| Lead entró | `9aff0e61-5b5f-4651-9c21-8d0fb969962c` |
| Cotizo | `d995fc73-4a35-4c2d-b317-19e4949f43f9` |
| Reservó | `adcfdc94-7ca1-4fa2-a12f-1594ad095c9d` |
| Agendado | `30b56a7b-5f63-4557-a4fd-268d62afc4c3` |
| Confirmado | `07dd0bbd-add2-40b1-889a-45fe7bee8247` |
| **Asistio** | `738c9d16-daa7-4040-a538-d7e9b732ccfd` |
| **No asistio** | `a302f71d-5cf9-4b4b-ab74-113eaae18ba0` |
| **Pago** | `53fbeac3-0d2a-4407-b59a-513a959f9365` |
| Reseña | `91da7d27-4b42-4012-a3a8-31af7695d6b2` |
| Recurrente | `59351f92-1d0f-458a-adaa-fdf5a95c36ff` |

---

## Workflow 1: Tag Added asistio → Stage Asistió

**Cuándo se dispara:** cuando dashboard clic "Asistió" en una fila → webhook añade tag `asistio` al contact

**Configuración:**
1. GHL → Automation → Workflows → **Create new**
2. Nombre: `EX - Tag asistio → Stage Asistió`
3. Trigger: **Contact Tag** → Tag Added: `asistio`
4. Action 1: **Update Opportunity**
   - Pipeline: `Reservas`
   - Stage: `Asistio`
   - Status: `Open`
5. (Opcional) Action 2: **Create Opportunity** (si no existe)
   - Pipeline: `Reservas`
   - Stage: `Asistio`
   - Name: `{{contact.full_name}} - Cita`
   - Monetary Value: `0`
6. **Publish**

---

## Workflow 2: Tag Added no_asistio → Stage No asistió

Mismo patrón que arriba, cambiando:
- Trigger: Tag Added `no_asistio`
- Stage: `No asistio`
- Nombre del workflow: `EX - Tag no_asistio → Stage No asistio`

---

## Workflow 3: Invoice Paid → Stage Pago + Monto

**Cuándo se dispara:** cuando dashboard clic "Pago" → webhook crea invoice GHL + marca como Paid Manually

**Por qué este trigger (en vez del tag):** el invoice tiene el monto del pago, lo necesitamos como `monetaryValue` en la opportunity.

**Configuración:**
1. GHL → Automation → Workflows → Create new
2. Nombre: `EX - Invoice Paid → Stage Pago`
3. Trigger: **Payments** → **Invoice Status Changed**
   - Status: `paid`
4. Action 1: **Update Opportunity**
   - Pipeline: `Reservas`
   - Stage: `Pago`
   - Status: `Won`
   - **Monetary Value: `{{invoice.totalAmount}}`** ← lee el monto del invoice
5. (Opcional) Action 2: **Add Note** al contact
   - "Pago registrado desde dashboard: ${{invoice.totalAmount}} ({{invoice.payment.method}})"
6. **Publish**

**Importante:** Si "Update Opportunity" no permite cambiar `Monetary Value`, usar workflow alternativo "Pago via API" via n8n. Avisar a Henry si esto pasa.

---

## Workflow 4 (Opcional): Tag pago → Stage Pago (fallback)

Si por alguna razón el invoice no se crea (ej. dashboard falla, pago manual sin invoice), el tag `pago` también debe mover la opp aunque sin monto.

- Trigger: Tag Added `pago`
- Action: Update Opportunity → Stage `Pago` (sin tocar Monetary Value)

---

## Test cómo verificar

Después de configurar:

1. **Test desde dashboard:**
   - Buscar cualquier cita
   - Clic "Asistió" → verificar en GHL → contact debería tener tag `asistio` Y opportunity en stage `Asistio`
   - Repetir con "No vino" y "Pagó"

2. **Test directo via webhook (opcional):**
   ```bash
   curl -X POST https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-tag \
     -H 'Content-Type: application/json' \
     -d '{"contact_id":"CONTACT_ID","tag":"asistio","action":"add"}'
   ```

3. **Verificar en GHL UI:**
   - Contacts → buscar el contacto → ver Tags + Opportunities
   - Opportunities → Pipeline Reservas → ver la card en el stage correcto
