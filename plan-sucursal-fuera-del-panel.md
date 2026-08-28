# Plan · sacar las citas de sucursal del panel de terapeutas

Yaz pidió que las citas en sucursal dejen de aparecerle a las terapeutas y que tampoco les
lleguen sus avisos. Esas citas las gestiona el equipo de Exentia en la sucursal.

En cambio, **el aviso sí debe llegar al número de Exentia**, con el nombre del cliente, lo
que pidió, el anticipo y el total, porque ese mensaje es la única forma de saber si pagó.

**Fecha:** 2026-08-28

---

## Lo que hay hoy

| | Citas | Slots | Ya tomadas por alguien |
|---|---|---|---|
| Domicilio | 9 | 12 | 2 |
| **Sucursal** | **6** | **6** | **2** |

Las citas de sucursal ya representan cerca de la mitad, así que el cambio se nota de
inmediato en el panel.

---

## Dónde se corta, y dónde NO

El panel de terapeutas y el de administración **leen exactamente las mismas dos vistas**:

```
exentia_panel_pool_slots   ← lo disponible
exentia_panel_mis_slots    ← lo ya tomado
```

Eso significa que **filtrar las vistas sería un error**: escondería las citas de sucursal
también para Yaz, que es justamente quien tiene que gestionarlas.

El corte va en `exentia-panel-citas`, en el nodo **`Ensamblar respuesta`**, que es el mismo
punto donde ayer se puso el filtro de datos del cliente por rol. Ahí ya se decide qué ve una
terapeuta y qué no.

```js
const ES_SUCURSAL = r => String(r.tipo_cita || '').toLowerCase() === 'sucursal';

const pool = poolRows.filter(r => !ES_SUCURSAL(r)) ... ;
const mias = miasRows.filter(r => !ES_SUCURSAL(r)) ... ;
const ocupadas_ajenas = busyRows.filter(r => !ES_SUCURSAL(r)) ... ;
```

Tres líneas, en un solo archivo, junto al filtro que ya existe. El panel de administración
no se toca y sigue viendo todo.

**`tipo_cita` ya viaja en las dos vistas**, así que no hay que agregar nada a la base.

---

## Los avisos

### Los que se apagan para sucursal

Seis flujos avisan hoy a las terapeutas. Todos tienen que preguntar por el tipo de cita
antes de mandar:

| Flujo | Qué avisa | ¿Conoce el tipo hoy? |
|---|---|---|
| `exentia-reserva` | reserva nueva pagada | sí |
| `exentia-page-agendar-cita` | cita agendada en la página | sí |
| `exentia-panel-assignment-sequence` | los 4 recordatorios | sí |
| `exentia-panel-release` | alguien soltó un lugar | sí |
| `exentia-panel-claim` | alguien tomó un lugar | sí |
| `exentia-cita-creada` | cita creada desde el CRM | **no, hay que traerlo** |

En cinco el dato ya está a la mano. En `cita-creada` hay que agregarlo a la consulta.

### El que se enciende: aviso a Exentia

Cuando la cita es de sucursal, en vez de repartirse entre terapeutas, **sale un solo mensaje
al contacto de Exentia**.

El texto que pidió Yaz:

```
Cita en sucursal · vie 29 ago 9:00 am
Ana López

Masaje relajante · 60 min

Anticipo pagado: $270
Total: $900 · faltan $630 al llegar
```

Y cuando no hubo anticipo:

```
Sin anticipo · cobrar $900 completos en sucursal
```

De dónde sale cada dato:

| En el mensaje | En la base |
|---|---|
| Nombre | `cliente_nombre` |
| Lo que pidió | `servicios` |
| Anticipo pagado | `precio_pagado_mxn` |
| Total | `precio_total_mxn` |
| Cómo pagó | `payment_method` |

El porcentaje de anticipo está en `exentia.config` como `anticipo_pct_sucursal = 30`, así que
el mensaje puede decir el faltante sin cálculos a mano.

**No lleva teléfono ni correo del cliente**, por la misma regla que ya aplica a los avisos del
equipo. El nombre alcanza para identificar la cita.

---

## Un riesgo que hay que resolver antes

**El número de Exentia es el mismo desde el que el CRM envía.** Mandarle un aviso significa
que Exentia se escribe a sí misma, y eso pasando por Wazzap no está comprobado: puede
quedarse en "enviado" sin llegar nunca, igual que pasó ayer con el número secundario.

Además, si algún flujo responde a los mensajes que entran, existe el riesgo de un ida y
vuelta consigo mismo.

**Antes de construir esto hay que mandar un mensaje de prueba a ese contacto y confirmar que
pasa de `enviado` a `entregado`.** Son dos minutos y define el resto: si no llega, el aviso
tiene que ir al número personal de Yaz, que sí es un destino distinto.

---

## Dos decisiones que hay que tomar

### 1. Las citas de sucursal que ya tiene alguien

Hay **2 slots de sucursal ya tomados** por una terapeuta. Al aplicar el filtro le desaparecen
del panel, sin aviso.

- **Opción A:** desaparecen todas, incluidas las tomadas. Es lo más limpio y coincide con que
  la sucursal la gestiona el equipo, pero conviene avisarle a quien las tenía.
- **Opción B:** se ocultan solo las que nadie ha tomado, y las ya asignadas se respetan hasta
  que pasen. Nadie pierde trabajo comprometido; a cambio, el panel muestra sucursal unos días.

Recomiendo la **B**, y aplicar la A cuando ya no queden citas de sucursal pendientes.

### 2. Las comisiones

Hoy una cita de sucursal genera comisión para la terapeuta que la toma. Si dejan de tomarlas,
esas comisiones dejan de existir.

Si el equipo de la sucursal cobra de otra forma, no hay nada que hacer. Si alguien de ese
equipo debería seguir cobrando comisión, hay que decidir cómo se registra, porque hoy sale de
que alguien tome la cita en el panel.

Vale la pena preguntárselo a Yaz antes, no después.

---

## Orden sugerido

1. **Probar el envío al número de Exentia.** Si no llega, definir destino antes de seguir
2. Filtrar sucursal en `exentia-panel-citas` (opción A o B, según lo que se decida)
3. Apagar el aviso a terapeutas en los cinco flujos que ya conocen el tipo
4. Traer el tipo de cita en `exentia-cita-creada` y apagarlo también
5. Armar el mensaje a Exentia y engancharlo donde hoy sale el aviso al equipo
6. Probar con una cita de sucursal y una de domicilio, en el mismo rato

## Cómo probarlo

| Prueba | Qué debe pasar |
|---|---|
| Cita de sucursal nueva | no aparece en el panel de terapeutas, no les llega mensaje |
| La misma cita | llega **un** mensaje al número de Exentia, con nombre, servicio, anticipo y total |
| Cita de domicilio nueva | todo igual que hoy: aparece y se reparte entre terapeutas |
| Panel de administración | sigue viendo las dos, sucursal y domicilio |
| Cita de sucursal con anticipo | el mensaje dice cuánto se pagó y cuánto falta |
| Cita de sucursal sin anticipo | el mensaje dice que se cobra completo al llegar |

---

## Archivos

- Filtro del panel: `exentia-panel-citas`, nodo `Ensamblar respuesta`
- Avisos: `exentia-reserva`, `exentia-page-agendar-cita`, `exentia-panel-assignment-sequence`,
  `exentia-panel-release`, `exentia-panel-claim`, `exentia-cita-creada`
- Contacto de Exentia: `wgSwi1qeNRhw5Kd3jrJt`, +52 998 480 3595
- Respaldos previos: `exentia/respaldos/avisos-multiples-2026-08-27/`
