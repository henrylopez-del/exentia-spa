# Plan · citas que empiezan de noche y terminan de madrugada

Qué pasa hoy y cómo debería verse una cita que arranca a las 10 de la noche y termina
después de las 12.

**Fecha:** 2026-08-28

---

## Primero, un dato importante

**Hoy la página no puede generar una cita así.** El horario de domicilio cierra a las 23:00,
y el cierre es la hora en que el servicio **termina**, no en la que empieza:

```
último inicio = 23:00 menos la duración del servicio
```

| Duración | Último inicio que ofrece | Termina |
|---|---|---|
| 1 hora | 10:00 pm | 11:00 pm |
| 2 horas | 9:00 pm | 11:00 pm |
| 3 horas | 8:00 pm | 11:00 pm |

De ahí sale el "hasta las 10 de la noche": es el último inicio de un servicio de una hora,
no un tope general.

Entonces una cita que cruce la medianoche solo puede aparecer por tres caminos:

1. Que se suba el cierre más allá de las 23:00
2. Que la administradora cree la cita a mano con una hora tardía
3. Por un error del sistema en citas de grupo por turnos (ver más abajo)

Vale la pena decidir si se quiere permitir. Si la respuesta es sí, hay que arreglar cuatro
cosas antes, porque **hoy el sistema no lo soporta**: no es solo cuestión de cómo se ve.

---

## Qué se rompe hoy si pasa

### 1. En el calendario de administración, la cita desaparece

La rejilla va de **7:00 a 22:00**, y cada cita se recorta al borde:

```js
const clampEnd = Math.min(inicio + duracion, UCAL_END_MIN);   // UCAL_END_MIN = 22:00
```

Una cita que empieza a las 22:00 tiene inicio igual al borde, así que su altura calculada es
**cero**. No se ve. Y lo que pase de medianoche no existe para esa vista.

### 2. En el panel de la masajista se ve, pero engaña

Ahí las citas son fichas en una lista por día, no una rejilla, así que sí aparece. El
problema es lo que dice: solo muestra la hora de inicio y los minutos.

```
10:00 pm · 180m
```

Nada indica que termina al día siguiente. Quien la toma no ve que se va a la 1 de la mañana.

### 3. Los choques de horario dejan de detectarse

Esto es lo más delicado, y falla en los dos lugares donde se revisa:

**En la base**, la consulta compara bien las horas, pero solo entre citas **del mismo día**:

```sql
AND s.fecha = v_slot.fecha
```

**En el panel**, lo mismo:

```js
if (m.fecha !== fecha) continue;
```

O sea: una cita del 29 a las 10 pm que termina el 30 a la 1 am **no se compara** con nada
del día 30. La misma masajista podría quedar con dos citas encimadas y el sistema la dejaría
tomar las dos.

### 4. En citas de grupo por turnos, la hora se voltea

Cuando varias personas van una tras otra, el sistema calcula la hora de cada una sumando la
duración de la anterior. Esa hora se guarda en un campo que **solo sabe de horas, no de
fechas**: al pasar de las 23:59 no avanza al día siguiente, da la vuelta al mismo día.

```
Persona 1 · 29 de agosto, 10:00 pm
Persona 2 · 29 de agosto, 1:00 am   ← debería ser el 30
```

La segunda queda agendada 21 horas **antes** que la primera. Es un error real que ya existe
hoy, aunque nadie lo haya visto porque el horario todavía no llega tan lejos.

---

## Resuelto el 2026-08-28 · la vista llega hasta las 23:00

Revisando el horario quedó claro que **nada puede terminar después de las 23:00**, ni
siquiera un grupo por turnos: el calendario de la página calcula el último inicio restando
la duración **completa del carrito** al cierre. Entonces la vista no necesita llegar a la
medianoche, le basta con llegar a las 11.

Se movió el borde del calendario de administración de 22:00 a 23:00.

Con eso se corrigió un problema que **ya existía**: una cita de una hora que arranca a las
22:00, que la página sí ofrece, quedaba con altura cero y no se veía en el calendario.

Lo de abajo queda como referencia por si algún día se sube el cierre más allá de las 23:00.

---

## Cómo debería verse

### Opción A · La cita completa en su día, con la hora de fin visible

La más barata y la que resuelve lo importante.

- La rejilla del administrador se extiende de **7:00 a 24:00**
- La cita se dibuja completa hasta la medianoche
- En la ficha se muestra el fin con el día, para que no haya duda

```
┌─────────────────────────┐
│ 10:00 pm → 1:00 am (+1) │
│ Ana López · 180 min     │
│ Termina el sábado 30    │
└─────────────────────────┘
```

La parte de madrugada no se dibuja en el día siguiente. Se entiende porque la ficha lo dice.

**A favor:** no hay que tocar cómo se acomodan las citas, que es la parte delicada del
calendario. Un cambio de texto y un límite.
**En contra:** al abrir el sábado, esa cita no aparece, aunque parte de ella ocurra ese día.

### Opción B · Partirla en dos, una pieza en cada día

Cómo lo hacen Google Calendar y los sistemas de hotelería.

```
Viernes 29                    Sábado 30
┌──────────────────┐          ┌──────────────────┐
│ 10:00 pm         │          │ ┄┄ viene del 29  │
│ Ana López        │          │ hasta la 1:00 am │
│ ...hasta 12:00   │          │ Ana López        │
└──────────────────┘          └──────────────────┘
```

La segunda pieza va marcada con borde punteado y la leyenda de que viene del día anterior.
Sigue siendo **una sola cita**: se toma, se libera y se cancela como cualquier otra.

**A favor:** al abrir el sábado a las 8 de la mañana se ve que hay alguien ocupada desde la
madrugada. Es lo correcto para repartir trabajo.
**En contra:** hay que meter mano en el acomodo de las citas, que es la parte con más
riesgo de romper algo.

### Mi recomendación

**Empezar por la A.** Resuelve que la cita se vea y que se entienda a qué hora termina, que
es el problema inmediato, sin tocar la parte frágil.

Pasar a la B cuando las citas nocturnas sean algo normal y estorbe no verlas en el día
siguiente.

---

## Lo que hay que arreglar sí o sí, antes que la vista

La vista es lo de menos. Estos tres son los que pueden causar un problema real con un
cliente:

| # | Qué | Dónde |
|---|---|---|
| 1 | Comparar choques entre días, no solo dentro del mismo día | `exentia_claim_slot` en la base y `findTimeConflict` en el panel |
| 2 | Que la hora de los turnos avance de día en vez de dar la vuelta | `fn_autocreate_slots` en la base |
| 3 | Guardar o calcular la hora de fin como fecha y hora completa, no solo hora | los dos anteriores |

El tercero es la raíz de los otros dos: hoy se guarda la fecha por un lado y la hora por
otro, y la duración por otro. Mientras el fin no se calcule como un momento completo, cada
lugar que necesite saber "cuándo termina" va a tener que resolverlo por su cuenta, y alguno
se va a equivocar.

---

## Orden sugerido

1. **Decidir** si se permiten citas que crucen la medianoche, y hasta qué hora
2. **Arreglar los choques** entre días, en los dos lugares
3. **Arreglar la hora de los turnos** en el trigger
4. **Ampliar la rejilla** a las 24:00 y mostrar la hora de fin con el día (opción A)
5. Más adelante, partir la cita en dos piezas (opción B)

Los pasos 2 y 3 son bugs que **ya existen hoy**, aunque el horario actual los mantenga
dormidos. Conviene arreglarlos aunque se decida no permitir el cruce.

---

## Archivos

- Rejilla del administrador: `panel/web/index.html`, constantes `UCAL_START_MIN` y
  `UCAL_END_MIN` (~línea 6354), recorte en `clampEnd` (~6545)
- Choques en el panel: `findTimeConflict` (~7091)
- Horario de la página: `_cal2GenSlots` en `exentia-pagina.html` (~13872)
- Choques y turnos en la base: `exentia_claim_slot` y `exentia.fn_autocreate_slots`
