# Problema · Citas de más de 240 min por masajista

**Fecha detección:** 2026-08-11
**Cita ejemplo:** EX-JPSBJQ99 · 360 min · Vez Test · 2026-08-12 09:00

## Qué pasa

Cuando una masajista toma un cupo cuya duración por persona supera 240 min, el sistema queda en un **estado inconsistente**:

- Supabase: slot `claimed`, booking completo, comisiones se calcularán normal.
- GHL / Google Calendar: **no existe la cita**. `ghl_appointment_id` queda `null`.

El corte lo hace el nodo "Validar input" del workflow `exentia-crear-cita-ghl`:

```js
if (duracion > 240) errs.push('duración excede 240 min · escalar a admin');
```

Devuelve `_error: too_long` y **no llama a GHL**. El slot ya está tomado, pero sin cita en el calendario del staff.

## Consecuencias

- La agenda de Google de la masajista **no está bloqueada** — cualquier otra fuente puede meterle cita encima.
- El cliente **no recibe** el recordatorio automático de GHL.
- Al cancelar/reasignar desde admin, el paso "borrar de GHL" falla silenciosamente (no hay ID).
- El panel de la masajista y el de admin no muestran ninguna advertencia — la cita se ve normal.

## Por qué existe el tope

La industria (Massage Envy, spas 5 estrellas, MINDBODY, Fresha) topa en 180–240 min por servicio individual. Arriba de eso son paquetes multi-servicio con **rotación de personal** — una sola masajista trabajando 6 h seguidas no es viable físicamente.

## Opciones para resolver

| Opción | Comportamiento | Complejidad |
|---|---|---|
| **A) Bloquear en el origen** | La página no deja armar carrito >240 min para 1 persona. Cliente ve "esta combinación necesita 2 masajistas o agendarse manualmente". | Baja · sólo página cliente |
| **B) Auto-partir en GHL** | `crear-cita-ghl` detecta >240, crea 2-3 citas GHL consecutivas al mismo `userId`, guarda ambos IDs. Google queda bloqueado completo. | Media · workflow + guardar múltiples IDs |
| **C) Forzar 2 masajistas** | Si suma >240, la página obliga a marcar "grupo" con mínimo 2 masajistas — se resuelve solo con la lógica actual de multi-slot. | Baja · reusa flujo existente |

## Recomendación

**Combinar A + C**: la página valida la suma por persona; si pasa de 240 min, sólo se puede continuar cambiando a "más de una persona". Alinea con la industria, evita las inconsistencias GHL/Supabase, y no requiere lógica nueva de partido de citas.

## Casos ya afectados

- **EX-JPSBJQ99** (360 min, Vez Test, 2026-08-12) — resolver a mano: cancelar y volver a agendar partida, o admin la crea en GHL manualmente.
