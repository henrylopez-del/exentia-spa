# Plan · entrar al panel con correo y contraseña

Cambiar el acceso del panel: en vez del código de un solo uso que llega por correo, cada
persona entra con su correo y una contraseña propia, con opción de recuperarla.

**Pedido por:** Henry, que no quiere doble autenticación
**Fecha:** 2026-08-28

---

## Cómo entra hoy y cómo entraría

**Hoy:** escribe su correo, le llega un código de 6 dígitos, lo teclea. Dos pasos y depende
de que el correo llegue rápido.

**Después:** escribe su correo y su contraseña. Un paso.

Al principio **todas tienen la misma contraseña, `exentiaterapeuta`**, y el sistema les pide
cambiarla la primera vez que entran.

---

## Dónde viven las contraseñas

En `exentia.terapeutas`, que es la tabla que ya identifica a cada quien. Tres columnas
nuevas para la contraseña (más otras tres para la recuperación, ver la revisión de abajo):

| Columna | Para qué |
|---|---|
| `password_hash` | La contraseña cifrada. Nunca se guarda tal cual |
| `password_actualizada_at` | Cuándo la cambió por última vez |
| `debe_cambiar_password` | Si sigue con la de arranque, la obliga a cambiarla |

**La contraseña nunca se guarda legible.** Se cifra con bcrypt, el mismo método que usa la
banca, mediante `pgcrypto`, que ya está instalado en la base. Ya lo probé contra el proyecto
real: cifra y verifica correctamente.

Ni nosotros podemos ver la contraseña de alguien. Si la olvida, no se le puede "consultar",
solo se le permite poner una nueva. Eso es lo correcto.

---

## Un beneficio que viene de regalo

Esto resuelve de paso el problema del que hablamos antes: **que una reserva desde la página
pública le cambie el correo a alguien del equipo y le tumbe el acceso.**

Hoy el acceso depende del contacto del CRM, que es justo lo que se sobrescribe. Con este
cambio la identidad pasa a vivir en `exentia.terapeutas`, donde la página no escribe.

Es la propuesta 2 de ese otro plan, que llega sola por este camino.

---

## Las tres piezas

### 1. Entrar

```
correo + contraseña  →  ¿coinciden?  →  sesión de 30 días
                                     →  si trae la de arranque, primero cámbiala
```

Un flujo nuevo en n8n, `exentia-panel-login`, que llama a una función de la base
`exentia_panel_login(correo, contraseña)`. La función busca a la persona por correo, compara
el cifrado y devuelve quién es y con qué rol, igual que hoy.

La comparación pasa **dentro de la base**. La contraseña no anda dando vueltas entre pasos.

**Si la respuesta trae `debe_cambiar_password`**, el panel no la deja pasar al calendario:
le muestra primero la pantalla de cambiar contraseña.

### 2. Olvidé mi contraseña

```
Escribe tu correo
      ↓
Le llega un correo con un botón
      ↓
El botón la lleva al panel con un enlace de un solo uso
      ↓
Escribe su nueva contraseña dos veces
      ↓
Lista, ya puede entrar
```

El enlace se ve así:

```
https://exentiaspabeauty.com/panel/?recuperar=TOKEN
```

El token es un identificador aleatorio que **vive 30 minutos y sirve una sola vez**. Se
guarda en la propia fila de la persona, junto con cuándo vence y cuándo se usó, igual que
`bookings` guarda hoy sus enlaces de cancelar y de preparación. Al usarlo se marca como
consumido.

Dos detalles de seguridad que conviene respetar:

- **La pantalla siempre dice lo mismo**, exista o no ese correo: "si esa cuenta existe, te
  mandamos las instrucciones". Si dijera "ese correo no existe", cualquiera podría averiguar
  quién trabaja ahí probando direcciones.
- **Cambiar la contraseña cierra las sesiones abiertas.** Si alguien se metió a su cuenta,
  cambiarla lo saca.

### 3. Cambiar la contraseña

Una vista nueva en el panel, que se abre en dos casos: cuando llega por el enlace del correo,
y cuando entra con la contraseña de arranque.

Pide la nueva dos veces y valida lo mínimo: **al menos 8 caracteres y que no sea
`exentiaterapeuta`**. Sin exigencias raras de símbolos y mayúsculas, que solo logran que la
gente la apunte en un papel.

---

## Revisado contra lo que ya existe (2026-08-28)

Antes de construir nada revisé el esquema actual. **Buena parte del trabajo ya está hecho**
y el plan original creaba cosas de más. Esto es lo que cambia.

### Lo que ya está y se reusa tal cual

| Ya existe | Para qué sirve aquí |
|---|---|
| `exentia.terapeutas` con `email`, `activo`, `sexo`, rol por contacto | Es la tabla de identidad. No hay que crear una de usuarios |
| Índice único sobre `lower(email)` | Ya garantiza que no haya dos cuentas con el mismo correo. Es justo lo que necesita un login por correo |
| `exentia.terapeutas_auditoria` y su trigger | Registro de cambios. Se le agrega la contraseña a los campos vigilados |
| Los nodos de firma HMAC del código actual | Firman la sesión igual que hoy. No hay que inventar nada |
| La plantilla del correo del código | Se reusa cambiando el número grande por el botón |
| `exentia.config` (clave y valor) | Ahí van los minutos de vigencia del enlace y el máximo de intentos, en vez de quemarlos en el código |
| `exentia.cancel_attempts` | Es el patrón de freno de intentos ya construido y probado para las cancelaciones. Se replica igual para el login |
| `bookings.cancel_token` y `prep_token` | El patrón de enlace de un solo uso ya se usa así en el proyecto: una columna, no una tabla |

### Lo que ya no hace falta crear

**La tabla `exentia.password_resets` se elimina del plan.** El proyecto ya resuelve los
enlaces de un solo uso con columnas en la propia fila, como hace `bookings` con
`cancel_token` y `prep_token`. Meter una tabla aparte sería una forma nueva de hacer lo
mismo.

Quedan **tres columnas más** en `exentia.terapeutas`, con el mismo nombre y forma que las de
bookings:

```
password_reset_token   uuid
password_reset_vence   timestamptz
password_reset_usado   timestamptz
```

Total: seis columnas nuevas en una tabla que ya existe, y ninguna tabla nueva.

### Lo que hay que cuidar, no romper

**`exentia_ensure_terapeuta` se queda como está.** Busca por `ghl_contact_id` y crea la fila
si no existe. La usa el acceso con Google, que no se retira. Si se toca, se rompe ese camino.

**El trigger de auditoría corre `BEFORE UPDATE`** y solo vigila `activo` y los dos contactos.
Hay que agregarle la contraseña, registrando únicamente que cambió, **nunca el valor**.

**El rol sigue saliendo del tag del CRM.** Este plan cambia cómo se comprueba quién es, no
quién es administradora. Eso se resolvió ayer con el tag `admin` y no se toca.

---

## Lo que hay que construir

### En la base

| Qué | Detalle |
|---|---|
| 6 columnas en `exentia.terapeutas` | `password_hash`, `password_actualizada_at`, `debe_cambiar_password`, y las tres de recuperación |
| Ampliar el trigger de auditoría | Que registre el cambio de contraseña, sin el valor |
| Tabla `exentia.login_attempts` | Copia de `cancel_attempts`: correo, resultado y momento. Es lo único nuevo |
| `exentia_panel_login(correo, contraseña)` | Verifica y devuelve identidad y rol |
| `exentia_password_reset_solicitar(correo)` | Crea el token y devuelve a quién mandárselo |
| `exentia_password_reset_aplicar(token, contraseña)` | Valida el token y guarda la nueva |
| 2 renglones en `exentia.config` | Minutos de vigencia del enlace y máximo de intentos |
| Semilla | Poner `exentiaterapeuta` cifrada a todas, con `debe_cambiar_password = true` |

Las tres funciones van con permisos propios, como las que ya existen, para que la tabla siga
sin poder escribirse directo desde fuera.

### En n8n

| Flujo | Qué hace |
|---|---|
| `exentia-panel-login` | Verifica y firma la sesión |
| `exentia-panel-password-reset` | Pide el correo, crea el token, manda el correo por GHL |
| `exentia-panel-password-cambiar` | Recibe token y contraseña nueva, o la sesión actual |

El correo se manda igual que el código de hoy, con la misma plantilla, cambiando el número
grande por un botón.

### En el panel

- Campo de contraseña en la pantalla de acceso, y el enlace "¿olvidaste tu contraseña?"
- Vista de cambiar contraseña
- Leer `?recuperar=TOKEN` de la dirección, como ya se lee `?b=` para abrir una cita

---

## Qué pasa con lo que ya existe

| Acceso | Qué hacemos |
|---|---|
| Código por correo | Se retira. Es lo que Henry pidió quitar |
| Código por SMS | Se retira con el anterior |
| Entrar con Google | **Se queda.** Es de un solo paso y no estorba |
| Contraseña `ExentiaAdmin2026` | Se retira: Yaz ya entra con su propio correo |

Los flujos viejos no se borran, se dejan apagados una o dos semanas por si hay que volver.

---

## Lo que hay que decir en voz alta

**Una contraseña compartida al arranque es débil.** Mientras las ocho tengan
`exentiaterapeuta`, cualquiera que sepa un correo del equipo entra. Por eso el cambio
obligatorio en el primer acceso no es un adorno: es lo que hace aceptable arrancar así.

**Sin doble autenticación, la contraseña es lo único que protege.** Si alguien la adivina o
la comparte, entra. El panel muestra datos de clientes, así que conviene:

- Frenar los intentos: tras 5 fallos seguidos, esperar unos minutos
- Que la sesión no dure para siempre en un equipo compartido

Ninguna de las dos es indispensable para arrancar, pero sí antes de que el panel tenga uso
diario con clientes reales.

---

## Orden sugerido

1. Columnas, tabla de recuperación y las tres funciones en la base
2. Semilla con la contraseña de arranque a las cuentas que existen
3. Flujo de entrar, y el campo de contraseña en el panel
4. Recuperación completa: correo, enlace y pantalla de cambio
5. Probar con las dos cuentas de prueba antes de tocar las reales
6. Apagar el código por correo y por SMS
7. Avisar al equipo, con la contraseña de arranque y qué hacer si se les olvida

Del 1 al 3 ya se puede entrar. Del 4 en adelante es lo que evita que nos hablen cada vez que
alguien olvide su contraseña.

---

## Cómo probarlo

| Prueba | Qué debe pasar |
|---|---|
| Contraseña correcta | Entra |
| Contraseña equivocada | No entra, y el mensaje no dice si el correo existe |
| Primera vez con la de arranque | Lo manda a cambiarla antes de ver el calendario |
| Enlace de recuperación | Abre la pantalla de cambio |
| El mismo enlace dos veces | La segunda ya no sirve |
| Enlace de más de 30 minutos | Vencido |
| Correo que no existe | Mismo mensaje que si existiera |
| Yaz con su correo | Entra al panel de administración |

Usar las cuentas de prueba, `vrodriguezpoot98@gmail.com` y `ceprintdo@gmail.com`, antes de
tocar a las ocho reales.
