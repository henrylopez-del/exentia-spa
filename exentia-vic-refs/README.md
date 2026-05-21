# Exentia · Repo de referencia para Víctor

**Para:** Víctor (dev Ainnovation)
**De:** Henry
**Status:** Repo de SOLO LECTURA con materiales para arrancar Fase 1 de Exentia

---

## Qué es esto

Este repo no es donde construyes tu trabajo de Exentia. Es la **biblioteca de referencia** que vas a consultar mientras construyes en `~/Desktop/exentia/`.

Contiene los planes acordados, el código canónico de Arqalum (la base que vamos a clonar y adaptar), el dashboard de Sarahi (referencia de UTM tracking), y los patterns conceptuales del vault.

## Tu trabajo

**Fase 1 — La base completa (web funcional + CRM + data analytics).** Es lo que vas a entregar antes de meter Meta Pixel/CAPI o Google Ads.

- **Fase 2 (Meta tracking)** y **Fase 3 (Google Ads tracking)** se hacen DESPUÉS, cuando el cliente nos dé sus credenciales. Ignóralas por ahora.

Mira `00-plan/04-pre-brand-tasks.md` para la lista ordenada de 9 tareas con outputs y validaciones. Esa es tu hoja de ruta.

## Cómo navegar este repo

```
exentia-vic-refs/
├── README.md                       ← estás aquí
├── STARTER-PROMPT.md               ← copia-pega esto al iniciar un thread con Claude/Codex
├── 00-plan/                        ← qué construir, cómo, en qué orden
│   ├── 01-playbook.md              ← pattern combinado Arqalum+Sarahi (LEE ESTO PRIMERO)
│   ├── 02-action-plan.md           ← plan 0→100 detallado de Exentia
│   ├── 03-ralph-loop.md            ← checklist iterable (marca ✅ cuando cierres tareas)
│   ├── 04-pre-brand-tasks.md       ← TUS 9 TAREAS ORDENADAS con outputs y validaciones
│   └── 05-exentia-ficha.md         ← contexto del cliente, decisiones tomadas
├── 01-arqalum-tracking/            ← código canónico que vamos a clonar y adaptar
│   ├── 01-supabase-schema.sql      ← schema de la tabla arqalum_leads (clonar para exentia_leads)
│   ├── 02-n8n-workflow-v2.json     ← workflow ingress canónico (clonar 7 veces para Exentia)
│   ├── 03-tracking.js              ← tracker.js IIFE en producción (base para tracker de Exentia)
│   ├── INSTALL.md                  ← cómo se instaló esto en Arqalum
│   └── dashboard-local.html        ← dashboard local de Arqalum (referencia de queries)
├── 02-sarahi-utm-dashboard/        ← referencia de UTM dashboard hosted (variante A)
│   └── sarahi-dashboard.html       ← HTML completo del dashboard de Sarahi
└── 03-patterns/                    ← conceptos transversales del vault
    ├── ghl-dashboard-pattern.md    ← Variante A vs B (Exentia usa B por PII)
    ├── n8n-best-practices.md       ← AEC pattern, errores comunes
    └── arqalum-capa1-tracking-rationale.md ← por qué se hicieron las decisiones de Arqalum
```

## Orden de lectura recomendado (primer día)

1. `README.md` — este archivo (5 min)
2. `STARTER-PROMPT.md` — el prompt para empezar tu thread con Claude (5 min)
3. `00-plan/05-exentia-ficha.md` — quién es Exentia, qué decidimos (5 min)
4. `00-plan/01-playbook.md` — el pattern combinado, antipatterns, decisiones forzadas (30 min)
5. `00-plan/04-pre-brand-tasks.md` — tu hoja de ruta concreta (15 min)
6. `01-arqalum-tracking/INSTALL.md` + ojear `01-supabase-schema.sql` y `03-tracking.js` (20 min)
7. `03-patterns/ghl-dashboard-pattern.md` + `n8n-best-practices.md` (20 min)

Total: ~100 min de lectura antes de tocar código. Lo ahorras 10× evitando errores.

## Donde construyes tu trabajo (NO en este repo)

`~/Desktop/exentia/` ya tiene la estructura preparada:

```
exentia/
├── README.md · CLAUDE.md
├── brand/              ← bloqueado hasta que llegue de Jocelyn
├── backend/            ← Tarea 1: schema SQL + RLS + seeds
├── n8n/                ← Tarea 2: 5 workflows base (NO el de pago todavía)
├── landing/            ← Tareas 5+6: tracker.js + HTML estructura
├── dashboard/          ← Tarea 7: HTML + queries + realtime
└── docs/               ← Tarea 9: taxonomías, IDs, etc.
```

## Reglas críticas (del playbook)

✅ Pre-crear TODAS las tags GHL antes de cualquier workflow (Arqalum las droppea silently si no existen)
✅ Naming Supabase: `exentia_*` (clonar schema arqalum_leads + adaptaciones)
✅ Naming n8n: `exentia-{track,reserva,checkin,pago,resena,upload-conversions,meta-spend-pull}`
✅ Lead ref: 8-char alfanum UPPERCASE (ej: `K7M2P9X4`)
✅ event_id dedup: `exentia_{lead_ref}_{event_name}_{yyyymmdd}`
✅ wa.me ASCII puro — sin acentos ni emojis (iOS mojibake fix)
✅ Variante B srcdoc para dashboard (PII sensible: direcciones + fotos casa)
✅ Single vertical scroll en landing — NO sliders
✅ Form 3 campos máximo

❌ NO uses Meta CAPI scope `read_ads_dataset_quality` (token Sarahi roto)
❌ NO expongas service_role JWT en browser
❌ NO pegues texto español directo en dashboard HTML — usa `\u00e9` escapes
❌ NO actives el workflow `exentia-pago` ni configures Meta Pixel/CAPI sin que Henry te dé luz verde (Fase 2/3, esperan credenciales)

## Cuándo preguntarle a Henry

**Antes de preguntarme:**
1. Consulta `00-plan/01-playbook.md`
2. Consulta `03-patterns/n8n-best-practices.md` para n8n
3. Consulta `03-patterns/arqalum-capa1-tracking-rationale.md` para entender el "por qué"

**Cuando preguntes:** sé específico. "El INSERT a Supabase devuelve undefined" es accionable. "n8n no funciona" no lo es.

---

*Última actualización: 2026-04-25*
