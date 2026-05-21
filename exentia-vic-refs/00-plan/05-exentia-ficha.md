---
aliases: ["Exentia"]
type: client
updated: 2026-04-24
status: EARLY · data-first build in progress
location: Cancún (NO CDMX)
---
# Exentia

**Negocio:** Masajes a domicilio, **Cancún**.
**Dueña / contacto principal:** Yazmin Agis (Yaz).
**Agencia de marketing actual:** Gueñe — maneja Meta/Instagram/Facebook de Exentia. Contacto: **Jocelyn Hernandez**. Especialidad: Meta (IG fuerte).
**Google Ads specialist (va a entrar):** ex-Carem (recomendación Yaz).
**Ainnovation:** Luis (lead comercial), Víctor (dev), Henry (orquesta).

## Documentos clave de este proyecto

- [[ainnovation-landing-playbook]] — **Playbook interno reusable** para toda landing futura de Ainnovation (Deliverable A)
- [[exentia-action-plan]] — **Plan de acción 0→100 específico Exentia** (aplica el playbook)
- [[exentia-ralph-loop]] — **Checklist iterable** de estados por tarea

## 🔥 Pivote clave (2026-04-24)

La página web se enfoca **exclusivamente en masajes a domicilio** en **Cancún**. No mezclar con concepto de spa fijo, no reusar preview viejo (`vAzECdU6YS7JC1VmdeJI` está hecho para spa completo). Landing nueva desde cero aplicando pattern combinado [[Arqalum]] (Google tracking pro) + [[Sarahi]] (Meta + UTM dashboard) según [[ainnovation-landing-playbook]].

## Modelo operativo confirmado

**Asignación de terapeutas = Modelo C (grupo WhatsApp).** Yaz postea las reservas al grupo de terapeutas; el primero en aceptar se queda con el servicio. La página NO muestra roster individual de terapeutas — solo pregunta **sexo + tipo de masaje**.

**Decisión dashboard:** Variante B (srcdoc privado, repo `henrylopez-del/exentia-dashboard`). Justificación: PII sensible (direcciones domiciliarias + fotos interior de casa).

## Reunión 2026-04-24 — Kick-off

Asistentes: Luis, Víctor, Yazmin, Jocelyn. Henry NO asistió — se le puso al corriente después.

### Decisiones y alcance

**Flujo de reserva (página web):**
1. Usuario selecciona tipo de masaje + sexo preferido
2. Submit form → se arma mensaje pre-llenado (ASCII puro)
3. Redirect a wa.me con folio + contexto
4. Yaz postea reserva al grupo WA de terapeutas
5. Primero en aceptar se queda con el servicio
6. Terapeuta asignado → Yaz confirma a cliente por WA

**Propuesta Luis en reunión:** campo libre en form para link de Google Maps del cliente + opcional subir fotos de la casa. Esa info solo la ve el negocio (no va al calendar). Objetivo: que terapeuta llegue sin problema.

**Canales de venta:** web + WhatsApp + Meta (IG/FB) + Google (cuando ex-Carem entre).

**Automatización de recordatorios:** WA + correo, 24h antes y 2h antes.

**Analytics y tracking:**
- Google Analytics + Google Ads Enhanced Conversions → sesión con ex-Carem para alinear
- Meta Pixel + CAPI → coordinación con Jocelyn/Gueñe (token nuevo con scope correcto, NO reusar el roto de Sarahi)
- Ainnovation orquesta end-to-end

### Material disponible (Gueñe / Jocelyn)

- ⚠️ Manual de marca: **Jocelyn tiene el doc de "características de la marca" que le mandaron** — Henry debe pedirlo
- ⚠️ Fotos de instalaciones SÍ existen pero son de campañas específicas con ángulos distintos — pidieron lista concreta de qué necesitamos para coordinar UNA sola sesión nueva
- Lista de fotos específicas (corregida post-pivote):
  - Camilla profesional armada en domicilio (toallas, aceites, ambiente)
  - Detalle de aceites, cremas, difusores
  - Manos del terapeuta en técnica (sin rostro del cliente)
  - Terapeuta en uniforme/kit profesional
  - Terapeuta llegando a casa (con maletín/equipo)
  - Ambiente recreado (home setting)
  - **NO aplican:** fachada, recepción, lobby (no hay spa físico)

### Bloqueos para arrancar

**NO bloquea** arrancar prototipo:
- Fotos finales (se usan placeholders, se reemplazan)
- Multimedia de servicios

**SÍ bloquea** arranque:
- Manual de marca + logos (crítico) — Jocelyn envía

**Bloquea pre-launch:**
- Todas las fotos reales
- Precios y lista final de tipos de masaje (Yaz manda)
- Orden de servicios por volumen de venta (Yaz manda — top sellers arriba)
- FAQs frecuentes
- Testimonios / reseñas autorizadas

## Timeline y compromisos

| # | Qué | Quién | Cuándo |
|---|-----|-------|--------|
| 1 | Enviar checklist v2 por correo a Yazmin + Jocelyn | Luis | **sábado 2026-04-25** |
| 2 | Agregar al checklist la lista específica de fotos | Luis/Henry | antes de envío |
| 3 | Responder checklist (sobre todo Jocelyn con data que ya tiene) | Yaz + Jocelyn | **viernes 2026-05-01** |
| 4 | Compartir precios + orden por volumen | Yazmin | en el checklist |
| 5 | Confirmar tipos de masaje | Yazmin | en el checklist |
| 6 | Whitelist zonas Cancún | Yazmin | en el checklist |
| 7 | Contactar a ex-Carem (Google Ads) + agendar sesión conjunta | Yazmin | esta semana |
| 8 | Revisar propuesta antigua artifact 2026-03-27 | Henry | pendiente |
| 9 | Pedir a Jocelyn doc de características de marca | Henry | esta semana |
| 10 | Verificar correo de Yaz 2026-04-12 (3 inbox) | Henry | esta semana |

Ver [[exentia-ralph-loop]] para checklist completo con estados.

## Pendientes de alineación

- Tipos de masaje disponibles (define catálogo + tags `servicio_*`)
- Whitelist zonas Cancún (define tags `zona_*`)
- Política de reprogramación/cancelación
- Método de pago Fase 1 (recomendado manual Yaz, Stripe Fase 9)
- Nivel de compromiso (N1/N2/N3) que elige Exentia tras recibir PDF

## Stack propuesto

Aplica [[ainnovation-landing-playbook]] — ver ese doc para detalle del pattern combinado Arqalum + Sarahi.

**Resumen:**
- Supabase proyecto nuevo `exentia-prod` (RLS boundary limpio)
- 7 n8n workflows: track, reserva, checkin, pago, resena, upload-conversions (cron), meta-spend-pull (cron)
- GHL location nueva + 27 custom fields `exentia_*` + tags canónicas pre-creadas + pipeline 9-stage + calendario consolidado
- Landing nueva desde cero (NO reusar preview `vAzECdU6YS7JC1VmdeJI`)
- Tracking: GA4 + Clarity + Google Ads Enhanced Conv + Meta Pixel NUEVO + CAPI token con scope correcto
- Dashboard Variante B srcdoc privado en repo `henrylopez-del/exentia-dashboard`
- Closed loop: Google Ads uploadClickConversions + Meta CAPI Purchase + audit retry

## Previews antiguas (NO reusar)

- Preview GHL 2026-04-10: `https://access.ainnovation.com.mx/v2/preview/vAzECdU6YS7JC1VmdeJI?notrack=true` (diseñado para spa físico — obsoleto post-pivote)
- Propuesta funnel 2026-03-27: `https://claude.ai/public/artifacts/bf92eb92-9937-4cb6-bf3a-24bf9c4b62e3`

## See Also
- [[Ainnovation]] · [[GHL]] · [[Gueñe]] · [[Jocelyn Hernandez]]
- [[ainnovation-landing-playbook]]
- [[exentia-action-plan]]
- [[exentia-ralph-loop]]
- [[Arqalum]] · [[Sarahi Jaramillo]] — fuentes del pattern combinado
