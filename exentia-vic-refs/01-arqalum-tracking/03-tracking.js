/* ============================================================
   ARQALUM CLICK TRACKER v1
   Captures every click with full attribution to Supabase.
   Independent of gtag. Survives lazy-load and adblockers as
   backup. Uses navigator.sendBeacon for reliability on unload.
   ============================================================ */
(function(){
  'use strict';

  var TRACK_URL = 'https://n8n-ntcue-u59578.vm.elestio.app/webhook/arqalum-track';
  var LANDING_VERSION = 'v1-2026-04-16';
  var PAGE_PATH = window.location.pathname;

  // ---------- Utils ----------
  function uid(len){
    var s = '';
    var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for(var i=0;i<(len||8);i++){ s += c[Math.floor(Math.random()*c.length)]; }
    return s;
  }

  function detectDevice(){
    var ua = navigator.userAgent;
    if(/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    if(/iPad|Tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function getOrCreateSessionId(){
    var key = 'arq_sid';
    var sid = sessionStorage.getItem(key);
    if(!sid){
      sid = uid(10) + '-' + Date.now();
      sessionStorage.setItem(key, sid);
    }
    return sid;
  }

  function getOrCreateLeadRef(){
    var key = 'arq_ref';
    var ref = sessionStorage.getItem(key);
    if(!ref){
      ref = uid(8);
      sessionStorage.setItem(key, ref);
    }
    return ref;
  }

  // Capture attribution on first load, persist in sessionStorage
  function captureAttribution(){
    var qs = new URLSearchParams(window.location.search);
    var keys = ['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
    var attr = {};
    keys.forEach(function(k){
      var v = qs.get(k);
      if(v){
        sessionStorage.setItem('arq_'+k, v);
      }
      attr[k] = sessionStorage.getItem('arq_'+k) || null;
    });
    return attr;
  }

  var SESSION_ID = getOrCreateSessionId();
  var LEAD_REF = getOrCreateLeadRef();
  var PAGE_LOAD_TS = Date.now();
  var MAX_SCROLL = 0;

  // ---------- Core send ----------
  function send(clickType, extra){
    var attr = captureAttribution();
    var payload = {
      lead_ref: LEAD_REF,
      click_type: clickType,
      page_path: PAGE_PATH,
      landing_version: LANDING_VERSION,
      session_id: SESSION_ID,
      time_on_page_ms: Date.now() - PAGE_LOAD_TS,
      scroll_depth_pct: MAX_SCROLL,
      gclid: attr.gclid,
      gbraid: attr.gbraid,
      wbraid: attr.wbraid,
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      utm_term: attr.utm_term,
      utm_content: attr.utm_content,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      device_type: detectDevice(),
      screen_size: window.innerWidth + 'x' + window.innerHeight,
      language: navigator.language || 'es',
      extra: extra || null
    };
    var body = JSON.stringify(payload);

    // sendBeacon survives page unload (critical for WhatsApp click)
    var sent = false;
    if(navigator.sendBeacon){
      try{
        sent = navigator.sendBeacon(TRACK_URL, new Blob([body], {type:'application/json'}));
      }catch(e){}
    }
    if(!sent){
      try{
        fetch(TRACK_URL, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: body,
          keepalive: true
        }).catch(function(){});
      }catch(e){}
    }
    // console log for debugging (remove in production if noisy)
    try{ console.log('[arq-track]', clickType, LEAD_REF, payload.utm_term || ''); }catch(e){}
  }

  // Expose so the inline form handler can call it
  window.ArqTrack = { send: send, ref: LEAD_REF, sid: SESSION_ID };

  // ---------- Initial pageview ----------
  captureAttribution(); // persist on first load
  // Fire pageview shortly after load (give other scripts a beat)
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ send('pageview'); });
  } else {
    send('pageview');
  }

  // ---------- Scroll depth ----------
  var scrollTarget = document.getElementById('scroller') || window;
  function updateScroll(){
    var pct;
    if(scrollTarget === window){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      pct = h > 0 ? Math.round((window.scrollY / h) * 100) : 0;
    } else {
      var sh = scrollTarget.scrollHeight - scrollTarget.clientHeight;
      var sw = scrollTarget.scrollWidth - scrollTarget.clientWidth;
      // horizontal-snap on desktop uses scrollLeft
      var useHoriz = sw > sh;
      pct = useHoriz
        ? (sw > 0 ? Math.round((scrollTarget.scrollLeft / sw) * 100) : 0)
        : (sh > 0 ? Math.round((scrollTarget.scrollTop / sh) * 100) : 0);
    }
    if(pct > MAX_SCROLL){
      MAX_SCROLL = pct;
      [25,50,75,100].forEach(function(milestone){
        var flag = 'arq_scroll_'+milestone;
        if(pct >= milestone && !sessionStorage.getItem(flag)){
          sessionStorage.setItem(flag, '1');
          send('scroll_'+milestone);
        }
      });
    }
  }
  (scrollTarget === window ? window : scrollTarget).addEventListener('scroll', function(){
    window.requestAnimationFrame(updateScroll);
  }, { passive: true });

  // ---------- WhatsApp clicks (with lead_ref injection) ----------
  function interceptWhatsAppLinks(){
    document.querySelectorAll('a[href*="wa.me"]').forEach(function(a){
      if(a.dataset.arqTracked === '1') return;
      a.dataset.arqTracked = '1';

      // Append lead_ref to WhatsApp message so Gerardo sees it
      try{
        var url = new URL(a.href);
        var existing = url.searchParams.get('text') || '';
        if(existing.indexOf('#') === -1){
          url.searchParams.set('text', existing + ' [Ref ' + LEAD_REF + ']');
          a.href = url.toString();
        }
      }catch(e){}

      a.addEventListener('click', function(){
        send('whatsapp_click', { href: a.href, link_location: a.id || a.className || 'unknown' });
      });
    });
  }

  // ---------- Call clicks ----------
  function interceptCallLinks(){
    document.querySelectorAll('a[href^="tel:"]').forEach(function(a){
      if(a.dataset.arqTracked === '1') return;
      a.dataset.arqTracked = '1';
      a.addEventListener('click', function(){
        send('call_click', { href: a.href, link_location: a.id || a.className || 'unknown' });
      });
    });
  }

  // ---------- Form events ----------
  function interceptForm(){
    var form = document.getElementById('lead-form');
    if(!form || form.dataset.arqTracked === '1') return;
    form.dataset.arqTracked = '1';

    var started = false;
    form.querySelectorAll('input, select, textarea').forEach(function(el){
      el.addEventListener('focus', function(){
        if(!started){
          started = true;
          send('form_start');
        }
      });
    });
    form.addEventListener('submit', function(){
      send('form_submit_intent');
    });
  }

  // ---------- Gallery & proof CTAs ----------
  function interceptGallery(){
    document.querySelectorAll('.rail__item').forEach(function(el){
      if(el.dataset.arqTracked === '1') return;
      el.dataset.arqTracked = '1';
      el.addEventListener('click', function(){ send('gallery_click'); });
    });
    var p = document.getElementById('proof-cta');
    if(p && p.dataset.arqTracked !== '1'){
      p.dataset.arqTracked = '1';
      p.addEventListener('click', function(){ send('proof_cta'); });
    }
  }

  // Bind after DOM ready
  function bindAll(){
    interceptWhatsAppLinks();
    interceptCallLinks();
    interceptForm();
    interceptGallery();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindAll);
  } else {
    bindAll();
  }
  // Re-bind if page adds links later (defensive)
  setTimeout(bindAll, 2000);
  setTimeout(bindAll, 5000);

  // ---------- Final ping on unload (session duration) ----------
  window.addEventListener('beforeunload', function(){
    send('session_end');
  });
})();
