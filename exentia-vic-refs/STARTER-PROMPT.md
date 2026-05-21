# Starter Prompt — Vic empezando un thread con Claude/Codex

**Cómo usarlo:** este archivo cubre 3 cosas en orden:
1. **Setup inicial** — si no tienes GitHub conectado a Claude / no tienes el repo clonado, empieza aquí
2. **Bootstrap** — clonas el repo y haces la primera lectura
3. **El prompt** — copia-pega al iniciar tu thread con Claude o Codex

---

## 1 · Setup inicial (solo la primera vez)

Si nunca has conectado tu GitHub con Claude (o no tienes `gh` CLI), elige UNO de estos dos caminos. Recomendado: **Camino A** porque es más rápido y suficiente para este proyecto.

### Camino A · gh CLI (recomendado)

`gh` es la CLI oficial de GitHub. Permite clonar, push, gestionar issues y PRs sin tocar tokens manualmente. Funciona desde la terminal y desde cualquier thread de Claude/Codex que tenga acceso a Bash.

```bash
# 1. Instalar gh (macOS con Homebrew)
brew install gh

# 2. Autenticarte vía OAuth (abre el navegador, login con tu cuenta GitHub)
gh auth login
# Sigue el wizard: GitHub.com > HTTPS > Yes (Git credential helper) > Login with web browser
# Pega el código que te muestra > autoriza en el navegador > done

# 3. Verificar
gh auth status
# Debe decir: "Logged in to github.com account 0VictorRodriguez0"

# 4. Aceptar la invitación al repo (si no la has aceptado por email)
gh api -X PATCH user/repository_invitations 2>/dev/null
# O abre https://github.com/henrylopez-del/exentia-vic-refs/invitations y acepta

# 5. Clonar
gh repo clone henrylopez-del/exentia-vic-refs ~/Desktop/exentia-vic-refs
cd ~/Desktop/exentia-vic-refs
```

Listo. Saltar a sección 2.

### Camino B · Claude Code GitHub MCP (si quieres tools nativos de GitHub dentro de Claude)

Esta opción agrega herramientas de GitHub directamente al thread de Claude Code (crear issues, abrir PRs, etc). Es más potente pero más setup.

```bash
# 1. Asegúrate de tener Claude Code instalado y corriendo
claude --version
# Si no lo tienes: https://docs.anthropic.com/claude/code

# 2. Agregar el GitHub MCP server (oficial de Anthropic)
claude mcp add github

# Te va a preguntar el método de auth:
#   - "OAuth" (recomendado, abre navegador) — más seguro, no manejas tokens
#   - "Personal Access Token" (PAT) — útil en CI o si no quieres OAuth flow
```

#### Si elegiste OAuth
- Se abre tu navegador
- Login a GitHub
- Autoriza la aplicación de Claude (scopes: `repo`, `read:org`, `read:user`)
- Vuelve a la terminal, ya está conectado
- Verifica con `claude mcp list` — debe aparecer `github` con status `connected`

#### Si elegiste PAT (Personal Access Token)
1. Ve a https://github.com/settings/tokens/new
2. Note: `Claude Code Vic` · Expiration: 90 days · Scopes: marca `repo` (todo el bloque) y `read:org`
3. Copia el token (`ghp_xxxxxxxxxxxx`)
4. Pégalo cuando Claude lo pida
5. Guarda el token en un password manager (no se vuelve a mostrar)

#### Después de conectar
```bash
# Verificar
claude mcp list
# debe mostrar: github · status: connected

# Aceptar invitación al repo (desde Claude o desde browser)
# https://github.com/henrylopez-del/exentia-vic-refs/invitations

# Clonar
git clone https://github.com/henrylopez-del/exentia-vic-refs.git ~/Desktop/exentia-vic-refs
cd ~/Desktop/exentia-vic-refs
```

---

## 2 · Bootstrap del proyecto

Una vez clonado, lee los archivos en este orden ANTES de tocar código (~100 min total, lo ahorras 10× en errores evitados):

```bash
cd ~/Desktop/exentia-vic-refs

# 1. README de navegación (5 min)
cat README.md

# 2. Ficha del cliente (5 min)
cat 00-plan/05-exentia-ficha.md

# 3. Playbook técnico — el más importante (30 min)
cat 00-plan/01-playbook.md

# 4. Tu hoja de ruta concreta — las 9 tareas (15 min)
cat 00-plan/04-pre-brand-tasks.md

# 5. Patterns clave
cat 03-patterns/ghl-dashboard-pattern.md
cat 03-patterns/n8n-best-practices.md

# 6. Código canónico de Arqalum que vas a clonar y adaptar
cat 01-arqalum-tracking/INSTALL.md
ls -la 01-arqalum-tracking/
```

Crea tu working folder separado del repo de referencia:

```bash
mkdir -p ~/Desktop/exentia/{brand,backend,n8n,landing/assets,landing/css,dashboard,docs}
cd ~/Desktop/exentia
```

(Este folder es donde TÚ construyes. El repo de referencia es de solo lectura para consultar.)

---

## 3 · El prompt (copia-pega al iniciar thread con Claude/Codex)

### ▶ Versión completa (al iniciar thread nuevo)

```
Eres mi co-dev en el proyecto Exentia de Ainnovation. Soy Victor, dev. Necesito tu apoyo
para construir la Fase 1 (web funcional + CRM + data analytics). Las Fases 2 y 3 (Meta
Pixel/CAPI y Google Ads tracking) se hacen despues cuando el cliente nos de credenciales,
ignoralas por ahora.

CLIENTE: Exentia — masajes a domicilio en Cancun (NO CDMX). Duena: Yazmin Agis.
Agencia Meta: Guene (contacto Jocelyn Hernandez).

DECISIONES FORZADAS (no renegociar):
- Asignacion de terapeutas: modelo C (grupo WhatsApp). La pagina NO muestra roster individual.
- En la pagina el cliente solo elige sexo + tipo de masaje.
- Variante B srcdoc privado para el dashboard (PII: direcciones + fotos casa).
- Supabase proyecto NUEVO `exentia-prod` (no reusar Arqalum).
- Construir landing desde cero aplicando patterns Arqalum + Sarahi (NO reusar el preview
  GHL `vAzECdU6YS7JC1VmdeJI`, era spa fisico obsoleto).
- Modelo Meta tracking espera Fase 2; Google Ads espera Fase 3.

REGLAS CRITICAS DEL PLAYBOOK:
- Pre-crear TODAS las tags GHL antes de cualquier workflow (sino se droppean silently).
- Naming Supabase: `exentia_*` (clonar schema arqalum_leads + adaptaciones).
- Naming n8n: `exentia-{track,reserva,checkin,pago,resena,upload-conversions,meta-spend-pull}`.
- Lead ref: 8-char alfanum UPPERCASE.
- event_id dedup: `exentia_{lead_ref}_{event_name}_{yyyymmdd}`.
- wa.me links ASCII puro (sin acentos, sin emojis — iOS mojibake fix).
- Single vertical scroll en landing — NO sliders (Arqalum: slider = 0% form conv).
- Form 3 campos maximo.
- service_role JWT solo server-side en n8n; nunca en browser.
- Texto espanol en HTML del dashboard: usar escapes `\u00e9` (no pegar directo).

ANTIPATTERNS (NO repetir):
- Token Meta CAPI con scope `read_ads_dataset_quality` (Sarahi rota — usar
  ads_management + ads_read + business_management).
- App Google OAuth en estado "Testing" (refresh tokens mueren a los 7 dias — publicar app).

REPOS / CARPETAS:
- Repo de referencia (solo lectura): ~/Desktop/exentia-vic-refs/
  - 00-plan/ tiene el playbook, action plan, ralph loop, mis 9 tareas pre-brand, y la
    ficha del cliente.
  - 01-arqalum-tracking/ tiene el codigo canonico que voy a clonar y adaptar
    (schema SQL, n8n workflow JSON, tracker.js IIFE, INSTALL.md, dashboard).
  - 02-sarahi-utm-dashboard/ tiene el dashboard hosted referencia.
  - 03-patterns/ tiene GHL dashboard pattern y n8n best practices.
- Working folder (donde construyo): ~/Desktop/exentia/
  - backend/ n8n/ landing/ dashboard/ docs/ brand/

MI HOJA DE RUTA (~9 dias utiles, paralelo a esperar el doc de marca de Jocelyn):
1. Supabase setup + DDL completo + RLS + Storage buckets
2. n8n workflows base (5 de los 7 — sin el de pago)
3. GHL location + 27 custom fields exentia_* + tags canonicas + pipeline 9-stage
4. GA4 property + Microsoft Clarity project
5. tracker.js IIFE completo con 20 eventos canonicos
6. Landing HTML estructura semantica + tracker integrado (placeholders visuales)
7. Dashboard structure + queries + realtime WebSocket (sin estilos finales)
8. Workflow exentia-pago (build only, NO activar — espera credenciales Henry)
9. Docs + Ralph Loop maintenance

EMPEZAR CON: Tarea 1 (Supabase setup). El DDL detallado esta en
~/Desktop/exentia-vic-refs/00-plan/02-action-plan.md seccion Fase 2. El schema base
para clonar y adaptar esta en ~/Desktop/exentia-vic-refs/01-arqalum-tracking/
01-supabase-schema.sql.

CUANDO TERMINE UNA TAREA: actualiza el ralph loop en
~/Desktop/exentia-vic-refs/00-plan/03-ralph-loop.md cambiando el estado y haz commit
con `cd ~/Desktop/exentia-vic-refs && git add -A && git commit -m "feat: complete task X"
&& git push`.

CUANDO ME ATORE: pregunta consultando primero el playbook
(~/Desktop/exentia-vic-refs/00-plan/01-playbook.md) y los patterns en 03-patterns/.

LISTO? Empecemos por la Tarea 1: arrancar el proyecto Supabase nuevo `exentia-prod` y
ejecutar el DDL de las 7 tablas + 4 vistas + RLS policies. Leeme el schema canonico de
Arqalum primero y dime que adaptaciones hace falta para Exentia (basandote en el playbook
y la ficha del cliente).
```

### ▶ Versión corta (refrescar contexto en thread existente)

```
Recuerda: estoy en Exentia (masajes a domicilio Cancun), Fase 1 base (web + CRM +
analytics). Refs en ~/Desktop/exentia-vic-refs/. Working en ~/Desktop/exentia/.
Modelo C grupo WA, Variante B srcdoc, Supabase nuevo. Mi hoja de ruta esta en
00-plan/04-pre-brand-tasks.md.
```

---

## Tips para usar Claude/Codex en este proyecto

1. **Siempre apuntar a archivos**, no copiar/pegar. "Lee X, hazme Y basado en Z" es mejor que pegar contenido grande.
2. **Cuando pidas código**, dile primero "consulta el patrón en 01-arqalum-tracking/03-tracking.js" — para que clone, no improvise.
3. **Valida con SQL real** después de cada DDL. No marques ✅ sin probar.
4. **Cuando un workflow falle**, mira primero `03-patterns/n8n-best-practices.md` antes de buscar en Google.
5. **Anti-overengineering:** si Arqalum lo hizo de una manera y funciona en producción, clona eso. No reinventes.

---

## Si nada de esto funciona — fallback

Si por alguna razón GitHub falla (red, auth, etc), Henry te puede mandar un `tar.gz` del repo. Pero la versión en GitHub siempre será el source of truth. Trata de hacer funcionar GitHub primero.

```bash
# Fallback descargar como ZIP via gh
gh repo clone henrylopez-del/exentia-vic-refs --depth 1
# o
gh api repos/henrylopez-del/exentia-vic-refs/tarball/main > exentia-refs.tar.gz
```

---

*Última actualización: 2026-04-25*
