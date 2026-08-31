# Captura manual de Stripe — para revisión

**Qué resuelve:** hoy Exentia cobra al reservar. Si después no hay terapeuta y se
devuelve el dinero, Stripe se queda su comisión y el negocio la pone de su bolsa.
Con captura manual el dinero se **retiene** y solo se cobra cuando alguien acepta
la cita. Si nadie la toma, se **cancela** la retención, que no cuesta nada.

**Estado:** aplicado en base de datos y flujos, pero **apagado**. No cambia nada
del comportamiento actual hasta que alguien lo prenda a propósito.

**Fecha:** 2026-08-31 · Modo Stripe: **test**

---

## Los números, medidos en Stripe test

Tres cobros reales de $1,550 MXN en el sandbox:

| Camino | Comisión | Queda en la cuenta |
|---|---|---|
| Aceptan la cita → capturar | $77.20 | $1,472.80 |
| Nadie acepta → **cancelar** | **$0.00** | $0.00 |
| Hoy: cobrar y luego reembolsar | $77.20 | **−$77.20** |

El movimiento de saldo lo confirma: el cargo entra `+$1,472.80` y el reembolso
sale `−$1,550.00`. Cada cancelación cuesta hoy **$77.20**.

Stripe recomienda esto explícitamente en su documentación de reembolsos, para
negocios que devuelven dinero seguido.

---

## ⚠️ El riesgo principal a revisar

**Una retención no se puede reembolsar.** Si el pago está retenido y alguien le
da a "Reembolsar" en el panel, Stripe devuelve error. Textual de su documentación:

> "el cargo adjunto al PaymentIntent no se capturó y no se puede reembolsar
> directamente. Debes cancelar el PaymentIntent."

Por eso **esto está apagado**. Si se prende sin tocar el panel, el botón de
reembolso deja de servir para las citas nuevas.

El otro riesgo, igual de serio: **la retención vence a los 7 días**. Si nadie
captura, el dinero se libera solo y Exentia no cobra nada. Peor que hoy.

---

## Qué se cambió

### Base de datos

Cinco columnas nuevas en `exentia.bookings`, todas opcionales y en `null` para
todo lo existente:

| Columna | Para qué |
|---|---|
| `stripe_payment_intent_id` | Necesario para capturar o cancelar después |
| `pago_estado` | `autorizado` · `capturado` · `cancelado` · `expirado` |
| `monto_autorizado_mxn` | Lo retenido. **No** es lo cobrado |
| `autorizado_at` | Cuándo se retuvo |
| `autorizacion_expira_at` | Cuándo muere sola (7 días) |

Más el RPC `public.exentia_registrar_captura(payment_intent, resultado, monto)`,
que mueve el estado de forma atómica. Es idempotente: repetir la misma operación
no duplica ni rompe.

**`precio_pagado_mxn` conserva su significado de siempre: dinero realmente
cobrado.** Mientras esté retenido vale 0, para que el ingreso del dashboard no
cuente dinero que todavía puede liberarse.

### Flujos

| Flujo | Cambio |
|---|---|
| `exentia-stripe-checkout` | Manda `capture_method=manual` **solo si** el body trae `captura_manual: true` |
| `exentia-stripe-webhook` | Distingue retenido de cobrado y guarda el PaymentIntent |
| `exentia-reserva` | El `INSERT` ahora sí persiste las columnas de pago (ver abajo) |

### Dos endpoints nuevos, activos

```
POST /webhook/exentia-stripe-capturar    {booking_code}  ó  {payment_intent}
POST /webhook/exentia-stripe-cancelar    {booking_code}  ó  {payment_intent}
```

Capturar acepta `monto_mxn` opcional para cobrar menos de lo retenido; el resto
se libera solo. Ojo: **solo se puede capturar una vez**, no hay segunda vuelta
por la diferencia.

Ninguno de los dos pide JWT todavía. **Hay que agregárselo antes de exponerlos
al panel**, que es como está protegido `exentia-panel-refund`.

---

## Un bug preexistente que se arregló de paso

El `INSERT` de `exentia-reserva` listaba 29 columnas y **ninguna era de pago**,
aunque el `RETURNING` sí devolvía `precio_pagado_mxn` y `pago_metodo`. El webhook
de Stripe los escribía en el payload y se descartaban en silencio.

Consecuencia: `precio_pagado_mxn` quedaba siempre en 0, incluso en citas pagadas
a domicilio. El mensaje de "recibimos tu pago" nunca se disparaba.

**Esto cambia el comportamiento actual**, así que conviene revisarlo:

- Se agregaron 7 columnas al `INSERT`
- `precio_pagado_mxn` va con `COALESCE(..., 0)` para conservar el default —
  sin eso, una reserva sin pago insertaría `NULL` explícito
- A partir de ahora las citas pagadas por Stripe **sí** van a traer
  `precio_pagado_mxn` con monto

**Qué revisar:** si el dashboard o el panel asumían que ese campo siempre era 0,
ahora van a ver números donde antes veían ceros. Debería ser lo correcto, pero
vale confirmarlo.

---

## Lo que falta para poder prenderlo

### 1. El panel: cancelar en vez de reembolsar

Hoy `exentia-panel-refund` hace: valida JWT → `exentia_admin_refund_prepare` →
`POST /v1/refunds` → `exentia_admin_refund_record`.

Falta bifurcar según el estado del pago:

- `pago_estado = 'autorizado'` → llamar a **cancelar** (no reembolsar)
- cualquier otro caso → el reembolso de siempre, sin cambios

Conviene que el panel muestre en qué estado está, porque para el negocio no es
lo mismo "retenido" que "cobrado".

### 2. Capturar cuando aceptan

Cuando una terapeuta toma la cita hay que llamar a capturar. Ese enganche todavía
no existe y es el que evita que la retención venza.

### 3. Un cron de seguridad

Barrer a los 6 días las retenciones sin resolver y decidir: capturar o cancelar.
Sin esto, cualquier cita olvidada se pierde. La columna
`autorizacion_expira_at` y su índice ya están puestos para eso.

### 4. El tope del calendario

La retención dura 7 días, pero hoy se puede reservar meses adelante — el botón de
mes siguiente no tiene límite. Para fechas lejanas hay que decidir: cobrar
completo como ahora, o solo anticipo.

### 5. Apagar `sepa_debit`

La cuenta tiene activos `card`, `apple_pay`, `google_pay`, `ideal`, `bancontact`,
`sepa_debit` y `mb_way`. **`sepa_debit` no soporta captura manual.** Los europeos
no aplican para Cancún y conviene apagarlos de todos modos.

---

## Cómo probarlo sin arriesgar nada

Estamos en modo test, así que se puede recorrer completo con la tarjeta
`4242 4242 4242 4242`.

1. Mandar `captura_manual: true` en el body del checkout
2. Pagar con la tarjeta de prueba
3. En Supabase: la cita debe quedar con `pago_estado = 'autorizado'`,
   `monto_autorizado_mxn` con el monto y **`precio_pagado_mxn` en 0**
4. `POST /webhook/exentia-stripe-capturar {booking_code}` → pasa a `capturado`
   y `precio_pagado_mxn` toma el monto
5. Repetir con otra cita y `exentia-stripe-cancelar` → pasa a `cancelado`

---

## Cómo revertir

Nada está prendido, así que revertir es no hacer nada. Si aun así se quiere
deshacer:

- Las columnas nuevas son opcionales; se pueden dejar sin usar
- Los dos endpoints nuevos se pueden desactivar sin afectar nada
- El `capture_method` solo se activa con la bandera, que nadie manda hoy
- **Lo único que sí cambia el comportamiento actual es el arreglo del `INSERT`.**
  Respaldo en `respaldos/n8n_reserva_ANTES-cols-pago.json`

Respaldos de los tres flujos tocados, en `exentia/respaldos/`:
`n8n_stripe-checkout_ANTES-captura-manual.json`,
`n8n_stripe-webhook_ANTES-captura-manual.json`,
`n8n_reserva_ANTES-cols-pago.json`

---

## Preguntas para quien revise

1. ¿El arreglo del `INSERT` rompe algo que dependiera de `precio_pagado_mxn = 0`?
2. ¿Dónde vive hoy el momento en que una terapeuta acepta? Ahí va la captura.
3. ¿El panel debe poder capturar a mano, o solo automático al aceptar?
4. Con reservas a más de 7 días, ¿cobrar completo o solo anticipo?

---

# Anexo · respuestas recibidas y lo que cambió

Fecha: 2026-08-31, después de la revisión.

## Lo que se aplicó con las respuestas

**Regla de los 7 días (respuesta 4), ya implementada.** El checkout ahora decide
solo: si la cita cae dentro de los próximos 6 días usa retención; más lejos,
cobra completo como siempre. Se calcula desde `body.fecha`, que la página ya
mandaba. Se usa 6 y no 7 a propósito — una cita al día 7 exacto dejaría cero
horas de margen para capturar.

Con esto el vencimiento deja de ser un riesgo: ninguna retención puede alcanzar
su fecha límite.

**La respuesta 2 corrige un error de mi diseño.** Enganchar la captura a la
primera aceptación cobraría con un solo cupo cubierto en citas de varias
personas. Va en `fully_claimed`, no en el primer claim. No lo había visto.

---

## Aviso en el panel antes de cancelar o reembolsar

Idea de Victor, con una precisión importante.

**Lo que manda no son los días, es el estado del pago.** Son dos cosas distintas
que conviene no mezclar:

| Estado | Qué botón toca | Qué cuesta |
|---|---|---|
| `autorizado` | **Cancelar** | $0 — el cargo pendiente desaparece del estado de cuenta |
| `capturado` | **Reembolsar** | La comisión (~3.6% + $3) no se recupera |
| `expirado` | nada que hacer | el dinero ya se liberó solo |

Una cita puede capturarse el mismo día si la terapeuta acepta rápido. En ese
momento reembolsar ya cuesta, aunque falten seis días para la cita. Por eso el
aviso debe leer `pago_estado`, no la fecha.

**Los días sí importan, pero para otra advertencia:** mientras el pago siga
`autorizado`, la retención va a vencer. Ahí conviene avisar *"esta retención
vence en X horas — si no se captura, se pierde el cobro"*.

### Lo que el panel podría mostrar

Con `pago_estado = 'autorizado'`:

> El dinero está **retenido, no cobrado**. Cancelar no cuesta nada y el cargo
> pendiente le desaparece al cliente.
> La retención vence el **{autorizacion_expira_at}**.

Con `pago_estado = 'capturado'`:

> El dinero **ya se cobró**. Reembolsar devuelve ${monto} al cliente, pero la
> comisión de **${comision}** no se recupera.

Los tres datos ya están en `exentia.bookings` — `pago_estado`,
`monto_autorizado_mxn` y `autorizacion_expira_at` — así que el panel solo tiene
que leerlos. No hace falta endpoint nuevo.

La comisión se puede estimar con `monto * 0.036 + 3`. Si se quiere el número
exacto, sale de `balance_transaction.fee` en Stripe, pero para avisar basta la
estimación.

### Lo mínimo que evita perder dinero

Que el botón **cambie de nombre según el estado**: "Cancelar (sin costo)" cuando
está retenido, "Reembolsar (no recupera comisión)" cuando ya se cobró. Con eso
el administrador no puede equivocarse sin darse cuenta.

---

## Reparto sugerido para no chocar

Dos sesiones editando los mismos flujos ya provocó un revert hoy. Propuesta:

**Lado Stripe (ya hecho aquí):** checkout, webhook, los dos endpoints, la regla
de los 7 días, las columnas y el RPC.

**Lado panel (para quien tenga ese contexto):** el enganche en
`exentia-panel-claim` sobre `fully_claimed`, el JWT de los dos endpoints, el
aviso de arriba, el botón manual de respaldo y el cron.

Lo único a coordinar es el JWT de `exentia-stripe-capturar` y
`exentia-stripe-cancelar`: conviene copiar el mismo esquema de
`exentia-panel-refund` para que no queden dos formas distintas de autenticar.
