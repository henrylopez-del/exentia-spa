/* ============================================================
   EXENTIA TRACKER v1
   Captura eventos del usuario y los envia a:
   - n8n webhook (siempre)
   - GA4 gtag (si esta cargado)
   - Meta Pixel fbq (si esta cargado, con event_id dedup vs CAPI)

   Adaptado del tracker canonico Arqalum (exentia-vic-refs/01-arqalum-tracking/03-tracking.js)
   con: fbclid/msclkid, first+last UTM dual, eventos especificos Exentia.
   ============================================================ */
(function () {
  'use strict';

  // === CONFIG ===
  var TRACK_URL = 'https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-track';
  var RESERVA_URL = 'https://n8n-ntcue-clone-u59578.vm.elestio.app/webhook/exentia-reserva';
  var LANDING_VERSION = window.EX_LANDING_VERSION || 'v1-2026-04-25';
  var FIRST_UTM_DAYS = 30;

  // === UTILS ===
  function uid(len) {
    var s = '';
    var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (var i = 0; i < (len || 8); i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  function detectDevice() {
    var ua = navigator.userAgent;
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function getParam(n) {
    return new URLSearchParams(location.search).get(n);
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  function ymd() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  // === SESSION + LEAD REF ===
  var SESSION_KEY = 'ex_sid';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) {}
  var now = Date.now();
  if (!session || (now - session.last) > SESSION_TIMEOUT_MS) {
    session = { id: uid(10) + '-' + now, started: now, last: now };
  } else {
    session.last = now;
  }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}

  var LEAD_REF = null;
  try { LEAD_REF = localStorage.getItem('ex_lead_ref'); } catch (e) {}

  // === CLICK IDS ===
  var clickIds = {
    gclid: getParam('gclid'),
    gbraid: getParam('gbraid'),
    wbraid: getParam('wbraid'),
    fbclid: getParam('fbclid'),
    msclkid: getParam('msclkid')
  };

  // === UTM LAST-CLICK (cada visita) ===
  var utmLast = {
    utm_source: getParam('utm_source'),
    utm_medium: getParam('utm_medium'),
    utm_campaign: getParam('utm_campaign'),
    utm_content: getParam('utm_content'),
    utm_term: getParam('utm_term')
  };

  // === UTM FIRST-CLICK (cookie 30d, inmutable primera visita) ===
  var FIRST_KEY = 'ex_first_attr';
  var firstStr = getCookie(FIRST_KEY);
  var utmFirst = {};
  if (firstStr) {
    try { utmFirst = JSON.parse(firstStr); } catch (e) { utmFirst = {}; }
  }
  if (!firstStr && (utmLast.utm_source || clickIds.gclid || clickIds.fbclid || clickIds.msclkid)) {
    utmFirst = Object.assign({}, utmLast, clickIds, { captured_at: now });
    setCookie(FIRST_KEY, JSON.stringify(utmFirst), FIRST_UTM_DAYS);
  }

  // === STATE ===
  var PAGE_LOAD_TS = Date.now();
  var MAX_SCROLL = 0;
  var SCROLL_FIRED = {};

  // === CORE SEND ===
  function send(eventType, extra) {
    var body = {
      event_type: eventType,
      lead_ref: LEAD_REF,
      session_id: session.id,
      page_path: location.pathname,
      landing_version: LANDING_VERSION,
      gclid: clickIds.gclid,
      gbraid: clickIds.gbraid,
      wbraid: clickIds.wbraid,
      fbclid: clickIds.fbclid,
      msclkid: clickIds.msclkid,
      utm_source: utmLast.utm_source,
      utm_medium: utmLast.utm_medium,
      utm_campaign: utmLast.utm_campaign,
      utm_content: utmLast.utm_content,
      utm_term: utmLast.utm_term,
      utm_source_first: utmFirst.utm_source || null,
      utm_medium_first: utmFirst.utm_medium || null,
      utm_campaign_first: utmFirst.utm_campaign || null,
      utm_content_first: utmFirst.utm_content || null,
      utm_term_first: utmFirst.utm_term || null,
      referrer: document.referrer || null,
      time_on_page_ms: Date.now() - PAGE_LOAD_TS,
      scroll_depth_pct: MAX_SCROLL,
      user_agent: navigator.userAgent,
      device_type: detectDevice(),
      screen_size: window.innerWidth + 'x' + window.innerHeight,
      language: navigator.language || 'es',
      timezone_offset: new Date().getTimezoneOffset(),
      extra: extra || {}
    };

    var json = JSON.stringify(body);

    // Webhook n8n: fetch SIN Content-Type → text/plain → simple request → sin preflight CORS.
    // sendBeacon con Blob de tipo application/json fuerza preflight (que sendBeacon no puede manejar) → falla.
    try {
      fetch(TRACK_URL, {
        method: 'POST',
        body: json,
        keepalive: true,
        credentials: 'omit',
        mode: 'cors'
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.lead_ref && !LEAD_REF) {
            LEAD_REF = j.lead_ref;
            try { localStorage.setItem('ex_lead_ref', LEAD_REF); } catch (e) {}
          }
        })
        .catch(function () {});
    } catch (e) {}

    // GA4 (si esta cargado)
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventType, Object.assign({
          lead_ref: LEAD_REF,
          session_id: session.id,
          landing_version: LANDING_VERSION
        }, extra || {}));
      } catch (e) {}
    }

    // Meta Pixel (si esta cargado, con event_id dedup vs CAPI)
    if (typeof window.fbq === 'function') {
      var pixelEvent = mapToPixelEvent(eventType);
      if (pixelEvent) {
        var eventId = 'exentia_' + (LEAD_REF || 'anon') + '_' + eventType + '_' + ymd();
        try {
          window.fbq('track', pixelEvent, extra || {}, { eventID: eventId });
        } catch (e) {}
      }
    }

    try { console.log('[ex-track]', eventType, LEAD_REF || '(no-ref)'); } catch (e) {}
  }

  function mapToPixelEvent(t) {
    if (t === 'page_view') return 'PageView';
    if (t === 'service_card_view' || t === 'service_select' || t === 'service_detail_view') return 'ViewContent';
    if (t === 'form_start') return null;
    if (t === 'form_submit_whatsapp' || t === 'whatsapp_direct_click') return 'Contact';
    if (t === 'calendar_time_slot_click') return 'Schedule';
    return null;
  }

  // Expose globally
  window.exentiaTrack = send;
  window.ExentiaTrack = { send: send, ref: function () { return LEAD_REF; }, sid: session.id };

  // === INITIAL PAGEVIEW ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { send('page_view'); });
  } else {
    send('page_view');
  }

  // === SCROLL DEPTH (25/50/75/100) ===
  function updateScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 0;
    if (pct > MAX_SCROLL) {
      MAX_SCROLL = pct;
      [25, 50, 75, 100].forEach(function (m) {
        if (pct >= m && !SCROLL_FIRED[m]) {
          SCROLL_FIRED[m] = true;
          send('scroll_' + m, { scroll_depth_pct: pct });
        }
      });
    }
  }
  window.addEventListener('scroll', function () {
    window.requestAnimationFrame(updateScroll);
  }, { passive: true });

  // === BIND HELPERS ===
  function bindClick(selector, eventType, extraFn) {
    document.querySelectorAll(selector).forEach(function (el) {
      if (el.dataset.exTracked === '1') return;
      el.dataset.exTracked = '1';
      el.addEventListener('click', function () {
        var extra = extraFn ? extraFn(el) : {};
        send(eventType, extra);
      });
    });
  }

  function bindWhatsAppLinks() {
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
      if (a.dataset.exTracked === '1') return;
      a.dataset.exTracked = '1';
      // Inyectar lead_ref al texto del WA (para que Yaz lo vea aunque no haya CRM conectado)
      try {
        var url = new URL(a.href);
        var existing = url.searchParams.get('text') || '';
        if (LEAD_REF && existing.indexOf('Ref ' + LEAD_REF) === -1) {
          url.searchParams.set('text', existing + ' [Ref ' + LEAD_REF + ']');
          a.href = url.toString();
        }
      } catch (e) {}
      a.addEventListener('click', function () {
        send('whatsapp_direct_click', {
          href: a.href,
          location: a.id || a.dataset.location || a.className || 'unknown'
        });
      });
    });
  }

  function bindCallLinks() {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      if (a.dataset.exTracked === '1') return;
      a.dataset.exTracked = '1';
      a.addEventListener('click', function () {
        send('call_click', { href: a.href });
      });
    });
  }

  function bindServiceCards() {
    // service_card_view via IntersectionObserver
    var cards = document.querySelectorAll('[data-service-slug]');
    if (cards.length && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            send('service_card_view', { servicio_slug: e.target.dataset.serviceSlug });
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.5 });
      cards.forEach(function (c) { io.observe(c); });
    }
    // service_select on click
    bindClick('[data-event="service_select"]', 'service_select', function (el) {
      return { servicio_slug: el.dataset.serviceSlug };
    });
    bindClick('[data-event="service_detail_view"]', 'service_detail_view', function (el) {
      return { servicio_slug: el.dataset.serviceSlug };
    });
  }

  function bindForm() {
    var form = document.getElementById('reserva-form') || document.getElementById('lead-form');
    if (!form || form.dataset.exTracked === '1') return;
    form.dataset.exTracked = '1';

    var started = false;
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('focus', function () {
        if (!started) {
          started = true;
          send('form_start');
        }
      });
      // form_field_complete (en blur con valor)
      el.addEventListener('blur', function () {
        if (el.value && el.value.length > 0) {
          send('form_field_complete', { field: el.name || el.id || 'unknown' });
        }
      });
    });

    form.addEventListener('submit', function () {
      send('form_submit_intent');
    });

    // maps_link_paste
    var mapsField = form.querySelector('[name="direccion_maps_url"], [name="maps_url"]');
    if (mapsField) {
      mapsField.addEventListener('paste', function (e) {
        var pasted = (e.clipboardData || window.clipboardData).getData('text');
        if (pasted && /maps\.app\.goo\.gl|google\.com\/maps/i.test(pasted)) {
          send('maps_link_paste');
        }
      });
    }

    // photo_upload_start / complete
    var photoField = form.querySelector('input[type="file"]');
    if (photoField) {
      photoField.addEventListener('change', function () {
        var n = photoField.files ? photoField.files.length : 0;
        send('photo_upload_complete', { count: n });
      });
      photoField.addEventListener('click', function () {
        send('photo_upload_start');
      });
    }
  }

  function bindCalendarHooks() {
    bindClick('[data-event="calendar_view"]', 'calendar_view');
    bindClick('[data-event="calendar_time_slot_click"]', 'calendar_time_slot_click', function (el) {
      return { slot: el.dataset.slot || null };
    });
  }

  // === HELPER PUBLICO PARA SUBMIT DE FORMULARIO RESERVA ===
  // window.exentiaSubmitReserva({cliente_nombre, cliente_telefono, servicios, ...})
  // POST a webhook exentia-reserva, dispara form_submit_whatsapp y abre wa_link.
  window.exentiaSubmitReserva = function (data) {
    var payload = Object.assign({ lead_ref: LEAD_REF }, data || {});
    return fetch(RESERVA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        send('form_submit_whatsapp', { booking_code: j.booking_code });
        if (j.wa_link) {
          window.location.href = j.wa_link;
        }
        return j;
      });
  };

  function bindAll() {
    bindWhatsAppLinks();
    bindCallLinks();
    bindServiceCards();
    bindForm();
    bindCalendarHooks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll);
  } else {
    bindAll();
  }
  // Re-bind defensivo (modales/contenido dinamico)
  setTimeout(bindAll, 2000);
  setTimeout(bindAll, 5000);

  // === SESSION END (pagehide es mas confiable que beforeunload en mobile) ===
  window.addEventListener('pagehide', function () {
    send('session_end', {
      time_on_page_ms: Date.now() - PAGE_LOAD_TS,
      max_scroll_depth_pct: MAX_SCROLL
    });
  });
})();
