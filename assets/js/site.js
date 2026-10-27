/* LORENTIS site script: motion, mobile menu, gallery lightbox, campaign tags, forms (question + registration with photos), analytics beacon. No dependencies. */
(() => {
  const R = document.documentElement, $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  if (params.has('shot')) R.classList.add('shot');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- reveal on scroll ----
  requestAnimationFrame(() => setTimeout(() => document.body.classList.add('loaded'), 80));
  if ('IntersectionObserver' in window && !RM) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.rv').forEach((el) => io.observe(el));
  } else $$('.rv').forEach((el) => el.classList.add('in'));

  // ---- trust grid: one-time staggered fade-in (cards show at once with no JS or reduced motion) ----
  const tg = $('[data-tg]');
  if (tg && !RM && 'IntersectionObserver' in window && !R.classList.contains('shot')) {
    tg.classList.add('tg-wait');
    const tio = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { tg.classList.add('tg-in'); tio.disconnect(); } }, { threshold: 0.2 });
    tio.observe(tg);
  }

  // ---- home collection: expanding-card accordion, step-by-step ----
  // The section locks on K1 when it reaches the top of the screen (whatever the scroll speed). Each separate gesture (one swipe,
  // one wheel or trackpad flick, one key press) moves exactly one card with a ~0.5s transition; input is ignored until that has
  // finished plus a short cooldown. On K1 an upward gesture, and on K73 a downward gesture, releases the page. Dots, the counter
  // and Skip jump. Off (a static list of cards) for reduced motion, no JS, or screens too short for the row.
  // Locking: phones fix the body (this also stops scroll momentum on iOS); desktops keep the scroll position and swallow wheel and
  // key input. Safety unlocks: anchors, focus leaving, resize, other scrolling, layout shifts, page restore.
  const acc = $('[data-acc]');
  if (acc) {
    const cards = $$('.ac', acc), cnt = $('[data-acc-n]', acc), dots = $$('[data-acc-dot]', acc), live = $('[data-acc-live]', acc), N = cards.length;
    const mq = matchMedia('(prefers-reduced-motion: reduce)'), coarse = matchMedia('(pointer: coarse), (max-width: 700px)');
    const TOUCH_COOL = 750, STEP_COOL = 560, QUIET = 150;
    let on = false, locked = false, fixedOn = false, idx = 0, lockY = 0, busyUntil = 0, prevTop = null, lastW = innerWidth, watch = 0, swallow = false;
    let tDown = false, tBlock = false, tFired = false, tY = 0, wFired = true, wLast = 0, wLow = Infinity, mx = -1, my = -1;
    const now = () => performance.now(), H = () => acc.offsetHeight, topNow = () => acc.getBoundingClientRect().top;
    const absTop = () => Math.round(topNow() + (fixedOn ? lockY : scrollY));
    const nameOf = (i) => (cards[i].querySelector('h3') || {}).textContent || '';
    const set = (i, quiet) => {
      idx = i; cards.forEach((c, k) => c.classList.toggle('on', k === i));
      if (cnt) cnt.textContent = String(i + 1);
      dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
      if (live && !quiet) live.textContent = nameOf(i) + ', ' + (i + 1) + ' of ' + N;
    };
    const fix = (y) => { const b = document.body.style; b.position = 'fixed'; b.top = -y + 'px'; b.left = '0'; b.right = '0'; b.width = '100%'; };
    const unfix = () => { const b = document.body.style; b.position = b.top = b.left = b.right = b.width = ''; };
    const lock = (i) => {
      if (locked) return;
      const y = Math.max(0, absTop()); lockY = y; locked = true; fixedOn = coarse.matches;
      if (fixedOn) fix(y); else scrollTo(0, y); // snap the section to the top of the screen; on phones the fixed body also kills momentum
      R.classList.add('acc-locked'); acc.classList.add('lk');
      set(i); busyUntil = now() + 350;
      if (tDown) { tBlock = true; tFired = true; } // the swipe that ran into the section is not a card swipe
      watch = setInterval(check, 500);
    };
    const unlock = () => {
      if (!locked) return;
      locked = false; clearInterval(watch);
      if (fixedOn) { unfix(); scrollTo(0, lockY); fixedOn = false; }
      R.classList.remove('acc-locked'); acc.classList.remove('lk'); prevTop = 0;
    };
    // safety net: if the layout moved under the lock (fonts, images, resize), follow it; never leave the page stuck
    const check = () => {
      if (!locked) return;
      const t = topNow(); if (Math.abs(t) <= 2) return;
      if (fixedOn) { lockY = Math.max(0, lockY + t); document.body.style.top = -lockY + 'px'; } else scrollTo(0, scrollY + t);
    };
    const release = (dir) => {
      const y = lockY; unlock(); swallow = true;
      scrollTo({ top: Math.max(0, y + dir * Math.round(innerHeight * 0.6)), behavior: 'smooth' }); // the page carries on
    };
    const go = (dir, src) => {
      if (!locked) return false;
      const t = now(); if (t < busyUntil) return false;
      const j = idx + dir;
      if (j < 0 || j >= N) { release(dir); return true; }
      set(j); busyUntil = t + (src === 'touch' ? TOUCH_COOL : STEP_COOL); return true;
    };
    const jump = (i) => {
      if (i === idx) return;
      set(i); if (locked) busyUntil = now() + STEP_COOL;
    };
    const measure = () => {
      unlock(); lastW = innerWidth; prevTop = null;
      if (mq.matches || innerHeight < 500) { on = false; acc.classList.remove('on'); return; }
      on = true; acc.classList.add('on'); prevTop = topNow(); set(topNow() < 0 ? N - 1 : 0, true);
    };
    // entering: crossing the top of the screen going down locks on K1; coming back up from below locks on K73
    const onScroll = () => {
      if (!on) return;
      const t = topNow();
      if (locked) { if (!fixedOn && Math.abs(t) > 3) { unlock(); prevTop = t; } return; } // something else moved the page (scrollbar, find-in-page): let go
      const h = H();
      if (prevTop !== null) {
        if (prevTop > 0.5 && t <= 0.5 && t > -h * 0.5) lock(0);
        else if (prevTop < -0.5 && t >= -0.5 && t < h * 0.5) lock(N - 1);
      }
      if (!locked) { prevTop = t; if (t < -h * 0.9 && idx !== N - 1) set(N - 1, true); else if (t > innerHeight * 0.9 && idx !== 0) set(0, true); }
    };
    addEventListener('scroll', onScroll, { passive: true });
    // touch: a swipe past ~22px is one gesture = one card (or the release); further movement in the same touch is ignored
    addEventListener('touchstart', (e) => { tDown = true; tFired = false; tBlock = locked; if (e.touches[0]) tY = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (!on || !(locked || tBlock) || e.touches.length > 1) return;
      if (e.cancelable) e.preventDefault();
      if (tFired || !locked) return;
      const dy = tY - e.touches[0].clientY;
      if (Math.abs(dy) >= 22) { tFired = true; go(dy > 0 ? 1 : -1, 'touch'); }
    }, { passive: false });
    const tEnd = () => { tDown = false; tBlock = false; };
    addEventListener('touchend', tEnd, { passive: true }); addEventListener('touchcancel', tEnd, { passive: true });
    // wheel / trackpad: a stream of events is one gesture until it goes quiet for 150ms; a clear fresh flick during the tail counts again
    addEventListener('wheel', (e) => {
      if (!on || e.ctrlKey) return;
      const t = now(), quiet = t - wLast > QUIET; wLast = t;
      if (quiet) { wLow = Infinity; swallow = false; }
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      if (!locked) { wFired = true; if (swallow) e.preventDefault(); return; } // a burst already running when we lock is swallowed, not counted
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (quiet) wFired = false;
      const a = Math.abs(dy); if (a < 4) return;
      if (!wFired) { wFired = true; wLow = a; go(dy > 0 ? 1 : -1, 'wheel'); return; }
      if (a < wLow) wLow = a;
      else if (a >= Math.max(40, wLow * 3) && t >= busyUntil) { wLow = a; go(dy > 0 ? 1 : -1, 'wheel'); }
    }, { passive: false });
    // keyboard: arrows, PageUp/PageDown and Space (Shift+Space back) step one card; focus follows so it stays visible
    addEventListener('keydown', (e) => {
      if (!on || !locked || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
      let d = 0; const k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowRight' || k === 'PageDown') d = 1;
      else if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'PageUp') d = -1;
      else if (k === ' ' || k === 'Spacebar') { if (t && t.closest && t.closest('button')) return; d = e.shiftKey ? -1 : 1; }
      else return;
      e.preventDefault();
      if (go(d, 'key') && locked) { const c = cards[idx].querySelector('.ac-cover'); if (c) c.focus({ preventScroll: true }); }
    });
    // controls
    dots.forEach((d, i) => d.addEventListener('click', () => jump(i)));
    const cn = $('[data-acc-count]', acc); if (cn) cn.addEventListener('click', () => jump((idx + 1) % N));
    const skip = $('[data-acc-skip]', acc);
    if (skip) skip.addEventListener('click', (e) => {
      e.preventDefault(); const a = absTop(), h = H(); unlock(); scrollTo(0, a + h);
      const nx = document.getElementById((skip.getAttribute('href') || '').slice(1)); if (nx) nx.focus({ preventScroll: true });
    });
    cards.forEach((c, i) => c.addEventListener('pointermove', (e) => {
      const moved = Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) >= 3; mx = e.clientX; my = e.clientY;
      if (on && e.pointerType === 'mouse' && moved && i !== idx && now() > busyUntil + 300) jump(i); // real mouse movement only, never layout-driven
    }));
    // a tap on a collapsed card expands it; a tap on the open card opens it
    $('.acc-row', acc).addEventListener('click', (e) => {
      const a = e.target.closest('.ac-cover'); if (!a || !on) return;
      const c = a.closest('.ac'); if (!c.classList.contains('on')) { e.preventDefault(); jump(+c.dataset.i); }
    });
    // keyboard focus: tabbing into the section locks on that card; tabbing out lets the page go
    addEventListener('focusin', (e) => {
      if (!on) return; const t = e.target;
      if (t !== document && acc.contains(t)) {
        if (t.matches && !t.matches(':focus-visible')) return; // a tap or click, not the keyboard
        const c = t.closest('.ac'), i = c ? +c.dataset.i : (topNow() < 0 ? N - 1 : idx);
        if (!locked) { prevTop = 0; lock(i); } else if (i !== idx) { set(i); busyUntil = now() + STEP_COOL; }
      } else if (locked && t !== document && t.scrollIntoView) { unlock(); t.scrollIntoView({ block: 'center' }); }
    });
    // no traps: in-page links, the back/forward cache, a changed width, reduced motion switched on
    document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (locked && a && !a.hasAttribute('data-acc-skip')) unlock(); }, true);
    addEventListener('hashchange', () => { if (locked) unlock(); });
    addEventListener('pageshow', (e) => { if (e.persisted) { unlock(); measure(); } });
    addEventListener('resize', () => { if (innerWidth !== lastW) measure(); else check(); }); // height-only (mobile address bar): stay locked
    addEventListener('orientationchange', () => setTimeout(measure, 120));
    addEventListener('load', measure);
    if (mq.addEventListener) mq.addEventListener('change', measure);
    measure();
    // test hook (read-only state)
    acc.accState = () => ({ on, locked, fixedOn, idx, lockY, busy: Math.max(0, Math.round(busyUntil - now())) });
  }

  // ---- gentle parallax (home only, skipped for reduced motion) ----
  const prod = $('.prod'), fr = $('.frame');
  if (!RM && (prod || fr)) {
    let t = 0;
    const f = () => {
      t = 0; const y = scrollY;
      if (prod && y < innerHeight * 1.2) prod.style.setProperty('--py', (y * 0.12) + 'px');
      if (fr) { const r = fr.getBoundingClientRect(); fr.style.setProperty('--fy', Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)))); }
    };
    addEventListener('scroll', () => { if (!t) { t = 1; requestAnimationFrame(f); } }, { passive: true }); f();
  }

  // ---- mobile menu ----
  const hdr = $('header.top'), btn = $('.menu');
  if (hdr && btn) {
    const set = (open) => { hdr.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
    btn.addEventListener('click', () => set(!hdr.classList.contains('open')));
    $$('nav a', hdr).forEach((a) => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && hdr.classList.contains('open')) { set(false); btn.focus(); } });
  }

  // ---- gallery lightbox ----
  const links = $$('.gallery a[data-full]');
  if (links.length && window.HTMLDialogElement) {
    const d = document.createElement('dialog');
    d.className = 'lb'; d.setAttribute('aria-label', 'Photo viewer');
    d.innerHTML = '<div class="lb-top"><span class="lb-n"></span><button type="button" class="close" aria-label="Close photo viewer">×</button></div><div class="lb-fig"><img alt=""></div><p class="lb-cap"></p><button type="button" class="prev" aria-label="Previous photo">←</button><button type="button" class="next" aria-label="Next photo">→</button>';
    document.body.append(d);
    const img = $('img', d), cap = $('.lb-cap', d), n = $('.lb-n', d);
    let i = 0, opener = null;
    const show = (k) => { i = (k + links.length) % links.length; const a = links[i]; img.src = a.dataset.full; img.alt = a.dataset.alt || ''; cap.textContent = a.dataset.alt || ''; n.textContent = `${i + 1} / ${links.length}`; };
    links.forEach((a, k) => a.addEventListener('click', (e) => { e.preventDefault(); opener = a; show(k); d.showModal(); }));
    $('.close', d).addEventListener('click', () => d.close());
    $('.prev', d).addEventListener('click', () => show(i - 1));
    $('.next', d).addEventListener('click', () => show(i + 1));
    d.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
    d.addEventListener('click', (e) => { if (e.target === d || e.target.classList.contains('lb-fig')) d.close(); });
    d.addEventListener('close', () => { img.removeAttribute('src'); if (opener) opener.focus(); });
    let x0 = null;
    d.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    d.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  // ---- base path (GitHub Pages sub-path build) ----
  const meta = (n) => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
  const BP = meta('lorentis-base');

  // ---- campaign tags: capture on ANY page, keep for the visit (sessionStorage), pass along to /register ----
  const TAGS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid'];
  const SK = 'lorentis_utm';
  let tags = {};
  try { tags = JSON.parse(sessionStorage.getItem(SK) || '{}') || {}; } catch { tags = {}; }
  const fresh = {}; TAGS.forEach((k) => { const v = params.get(k); if (v) fresh[k] = v.slice(0, 150); });
  if (Object.keys(fresh).length) tags = fresh; // a new campaign link replaces the old tags as a set
  if (!tags._ref && document.referrer && !document.referrer.startsWith(location.origin)) tags._ref = document.referrer.slice(0, 500);
  if (!tags._landing) tags._landing = location.pathname + location.search.slice(0, 300);
  try { sessionStorage.setItem(SK, JSON.stringify(tags)); } catch { /* private mode */ }
  const withTags = (href) => {
    const u = new URL(href, location.href);
    TAGS.forEach((k) => { if (tags[k] && !u.searchParams.has(k)) u.searchParams.set(k, tags[k]); });
    return u.origin === location.origin ? u.pathname + u.search + u.hash : u.href;
  };
  const isReg = (a) => { try { const u = new URL(a.href, location.href); return u.origin === location.origin && /\/register\/?$/.test(u.pathname); } catch { return false; } };
  if (TAGS.some((k) => tags[k])) $$('a[href]').forEach((a) => { if (isReg(a)) a.setAttribute('href', withTags(a.getAttribute('href'))); });

  // ---- old coming-soon anchors (#register, #signup, #k1 ...) from social posts ----
  const h = location.hash.slice(1).toLowerCase(), here = location.pathname.replace(BP, '') || '/';
  if (here === '/' || here === '/index.html') {
    if (['register', 'signup', 'sign-up', 'thanks', 'enquire'].includes(h)) location.replace(withTags(BP + '/register/'));
    else if (['k1', 'k31', 'k4', 'k68', 'k73'].includes(h)) location.replace(withTags(BP + '/models/' + h + '/'));
    else if (h === 'models' || h === 'story') history.replaceState(null, '', '#collection'), setTimeout(() => { const c = $('#collection'); if (c) c.scrollIntoView(); }, 0);
  }

  // ---- Cloudflare Web Analytics (same token as the old site; not loaded on local test servers) ----
  const tok = meta('cf-beacon-token');
  if (/^[a-f0-9]{32}$/.test(tok) && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) && !params.has('shot')) {
    const b = document.createElement('script'); b.defer = true; b.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    b.setAttribute('data-cf-beacon', JSON.stringify({ token: tok })); document.head.append(b);
  }

  // ---- shared form helpers ----
  const orderParam = () => { const o = (params.get('order') || '').trim(); return /^[A-Za-z0-9-]{1,40}$/.test(o) ? o : ''; };
  const MODELS = ['K1', 'K31', 'K4', 'K68', 'K73'];
  const PHONE = '1300 709 100';
  const setup = (form) => {
    const sel = $('select[name=model]', form);
    const wants = (params.get('models') || params.get('model') || '').toUpperCase().split(',').map((x) => x.trim()).filter((x) => MODELS.includes(x));
    if (sel && wants.length) sel.value = wants[0];
    $$('input[name=models]', form).forEach((b) => { if (wants.includes(b.value)) b.checked = true; }); // /register/?model=K1 or ?model=K1,K4
    const fill = (k, v) => { const el = form.elements[k]; if (el && v) el.value = v; };
    fill('page', location.pathname); fill('referrer', (tags._ref || document.referrer || '').slice(0, 500));
    fill('order', orderParam()); // /register/?order=LOR-ABC123 from the order confirmation
    TAGS.forEach((k) => fill(k, tags[k]));
  };
  const errs = (form) => ({
    clear() { $$('.err', form).forEach((e) => e.remove()); $$('[aria-invalid]', form).forEach((e) => { e.removeAttribute('aria-invalid'); const d = (e.getAttribute('aria-describedby') || '').split(' ').filter((x) => !x.endsWith('-err')).join(' '); d ? e.setAttribute('aria-describedby', d) : e.removeAttribute('aria-describedby'); }); },
    show(list) {
      let first = null;
      Object.entries(list || {}).forEach(([k, msg]) => {
        const el = form.elements[k] instanceof RadioNodeList ? form.elements[k][0] : form.elements[k]; if (!el) return;
        const id = `${form.id}-${k}-err`, s = document.createElement('span');
        s.className = 'err'; s.id = id; s.textContent = msg;
        el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + id).trim());
        (el.closest('.upl') || el.closest('label')).append(s); first = first || el;
      });
      if (first) first.focus();
    },
  });
  const thanks = (form, html) => {
    const status = $('.status', form);
    status.className = 'status ok'; status.innerHTML = html;
    $$('label,.form-foot,.upl', form).forEach((el) => { el.hidden = true; });
    status.setAttribute('tabindex', '-1'); status.focus({ preventScroll: false });
  };
  const unreachable = (form) => { const st = $('.status', form); st.className = 'status bad'; st.innerHTML = `The form cannot be sent from this page right now. Please call <a href="tel:1300709100">${PHONE}</a> or email <a href="mailto:info@lorentis.com.au">info@lorentis.com.au</a>.`; };
  const emailOk = (form) => form.elements.email.checkValidity();

  // ---- question form (contact page) ----
  $$('form.enq').forEach((form) => {
    setup(form);
    const status = $('.status', form), E = errs(form);
    const done = () => thanks(form, `<b>Thank you.</b>We have your question and will be in touch. If it is urgent, call ${PHONE}.`);
    if (params.get('sent') === '1') done();
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); E.clear(); status.className = 'status'; status.textContent = '';
      const data = Object.fromEntries(new FormData(form).entries()); const list = {};
      if (!data.name.trim()) list.name = 'Please enter your name.';
      if (!data.email.trim() && !data.phone.trim()) list.email = 'Please give us an email address or a phone number so we can reply.';
      else if (data.email.trim() && !emailOk(form)) list.email = 'Please check your email address.';
      if (Object.keys(list).length) { E.show(list); return; }
      const b = $('button[type=submit]', form); b.disabled = true; const label = b.textContent; b.textContent = 'Sending…';
      try {
        const r = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(data) });
        if ([404, 405, 501].includes(r.status)) { unreachable(form); return; }
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.ok) { done(); return; }
        if (j.errors) E.show(j.errors);
        status.className = 'status bad'; status.textContent = j.error || `Something went wrong. Please call ${PHONE} or email info@lorentis.com.au.`;
      } catch { unreachable(form); } finally { b.disabled = false; b.textContent = label; }
    });
  });

  // ---- registration with photos ----
  const MAX = 8, EDGE = 2000, Q = 0.82, MB = 1024 * 1024, RAW_MAX = 40 * MB, SEND_MAX = 8 * MB, TOTAL_MAX = 28 * MB;
  const fmt = (n) => (n >= MB ? (n / MB).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const isImg = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
  async function shrink(file) {
    if (!isImg(file)) throw new Error(`${file.name} is not a photo.`);
    if (file.size > RAW_MAX) throw new Error(`${file.name} is too large (${fmt(file.size)}). Please choose a smaller photo.`);
    let bmp = null;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { try { bmp = await createImageBitmap(file); } catch { bmp = null; } }
    if (!bmp) { // e.g. HEIC on a browser that cannot decode it: send as is if small enough
      if (file.size <= SEND_MAX) return { blob: file, name: file.name, preview: false };
      throw new Error(`We could not read ${file.name}. Please choose a JPEG or PNG, or a smaller photo.`);
    }
    const k = Math.min(1, EDGE / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close();
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', Q));
    const out = blob && (blob.size < file.size || !/jpe?g$/i.test(file.type)) ? blob : file;
    if (out.size > SEND_MAX) throw new Error(`${file.name} is still too large after resizing. Please choose another photo.`);
    return { blob: out, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', preview: true };
  }
  $$('form.reg-form').forEach((form) => {
    setup(form);
    const status = $('.status', form), E = errs(form), input = form.elements.photos, list = $('.thumbs-up', form);
    const items = [];
    input.removeAttribute('required'); // JS manages the photo list
    const done = () => thanks(form, `<b>Thank you, we have your photos.</b>We will reply within 1 business day with your install method and your total installed price. If it is urgent, call ${PHONE}.`);
    if (params.get('sent') === '1') done();
    const total = () => items.reduce((a, x) => a + x.blob.size, 0);
    const render = () => {
      list.innerHTML = '';
      items.forEach((x, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="ph"></span><span class="meta"><b></b><small>${fmt(x.blob.size)}</small></span><button type="button" class="rm" aria-label="Remove photo ${i + 1}">×</button>`;
        $('b', li).textContent = `Photo ${i + 1}`;
        if (x.url) { const im = new Image(); im.alt = ''; im.src = x.url; $('.ph', li).append(im); }
        $('.rm', li).addEventListener('click', () => { if (x.url) URL.revokeObjectURL(x.url); items.splice(i, 1); render(); input.focus(); });
        list.append(li);
      });
      const n = items.length;
      const sum = document.createElement('li'); sum.className = 'sum';
      sum.textContent = n ? `${n} of ${MAX} photos added · ${fmt(total())} to send` : '';
      if (n) list.append(sum);
    };
    input.addEventListener('change', async () => {
      E.clear(); status.className = 'status'; status.textContent = '';
      const files = [...input.files]; input.value = '';
      const problems = [];
      if (items.length + files.length > MAX) problems.push(`You can send up to ${MAX} photos. We added the first ${Math.max(0, MAX - items.length)}.`);
      const take = files.slice(0, Math.max(0, MAX - items.length));
      if (take.length) { status.className = 'status'; status.textContent = `Preparing ${take.length} photo${take.length > 1 ? 's' : ''}…`; }
      for (const f of take) {
        try { const r = await shrink(f); if (total() + r.blob.size > TOTAL_MAX) { problems.push('Those photos are too large in total. Please send fewer.'); break; } items.push({ ...r, url: r.preview ? URL.createObjectURL(r.blob) : '' }); }
        catch (err) { problems.push(err.message); }
      }
      status.textContent = ''; render();
      if (problems.length) E.show({ photos: problems.join(' ') });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault(); E.clear(); status.className = 'status'; status.textContent = '';
      const el = form.elements, L = {};
      if (!el.name.value.trim()) L.name = 'Please enter your name.';
      if (!el.phone.value.trim()) L.phone = 'Please enter your phone number.';
      if (!el.email.value.trim()) L.email = 'Please enter your email address.'; else if (!emailOk(form)) L.email = 'Please check your email address.';
      if (!el.suburb.value.trim()) L.suburb = 'Please enter your suburb.';
      if (!items.length) L.photos = 'Please add at least one photo of your bathroom.';
      if (Object.keys(L).length) { E.show(L); return; }
      const fd = new FormData(form); fd.delete('photos');
      items.forEach((x) => fd.append('photos', x.blob, x.name));
      const b = $('button[type=submit]', form); b.disabled = true; const label = b.textContent; b.textContent = 'Sending…';
      const xhr = new XMLHttpRequest();
      xhr.open('POST', form.action); xhr.setRequestHeader('accept', 'application/json');
      xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) b.textContent = `Sending… ${Math.round((ev.loaded / ev.total) * 100)}%`; };
      xhr.onload = () => {
        b.disabled = false; b.textContent = label;
        if ([0, 404, 405, 501].includes(xhr.status)) { unreachable(form); return; }
        let j = {}; try { j = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
        if (xhr.status === 200 && j.ok) { items.forEach((x) => x.url && URL.revokeObjectURL(x.url)); done(); return; }
        if (j.errors) E.show(j.errors);
        status.className = 'status bad'; status.textContent = j.error || `Something went wrong. Please call ${PHONE} or email info@lorentis.com.au.`;
      };
      xhr.onerror = () => { b.disabled = false; b.textContent = label; unreachable(form); };
      xhr.send(fd);
    });
  });

  // ---- cart (client-side, localStorage) + provider-agnostic checkout stub ----
  // Catalogue and prices come from /data/products.json (one config file). Model prices are GST-inclusive; null shows "Price TBC".
  const CK = 'lorentis_cart', views = $$('[data-cart-view]'), adders = $$('[data-add]'), counters = $$('.cc');
  if (views.length || adders.length || counters.length) {
    const API = meta('lorentis-api');
    const load = () => { try { const c = JSON.parse(localStorage.getItem(CK) || '{}'); if (c.quote && !/^Q-[A-Z0-9]{4,12}$/.test(String(c.quote.id))) delete c.quote; return Array.isArray(c.items) ? c : { items: [] }; } catch { return { items: [] }; } };
    let cart = load(), CAT = null;
    const save = () => { try { localStorage.setItem(CK, JSON.stringify(cart)); } catch { /* storage off */ } paint(); };
    const money = (n) => '$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const count = () => cart.items.reduce((a, x) => a + x.qty, 0);
    const find = (id) => cart.items.find((x) => x.id === id);
    const add = (id) => {
      const it = find(id);
      if (it && cart.quote && it.id === cart.quote.model) { save(); return; } // the quoted toilet stays at 1
      if (it) it.qty = Math.min(5, it.qty + 1);
      else cart.items.push(CAT && CAT.models.some((m) => m.id === id) ? { id, qty: 1, install: !cart.noInstall } : { id, qty: 1 });
      save();
    };
    const img = (m) => `<picture><source type="image/webp" srcset="${BP}/assets/img/${m.image}.webp"><img src="${BP}/assets/img/${m.image}.webp" alt="" width="80" height="120" loading="lazy"></picture>`;
    // A quote cart (from /quote/?id=…) carries {quote:{id, model, install, power}}: its install and power point show as charged
    // lines. The server re-checks the quote id and takes every amount from its own lookup (lib/quotes.js), never from here.
    const qModel = () => cart.quote && cart.items.find((x) => x.id === cart.quote.model);
    function linesHtml() {
      const inst = CAT.addons.find((a) => a.id === 'install'), pw = CAT.addons.find((a) => a.id === 'power');
      const Q = qModel() ? cart.quote : null, noInst = !Q && !!cart.noInstall;
      let known = 0, tbc = 0, html = '', instOpts = '';
      const nModels = cart.items.filter((x) => CAT.models.some((m) => m.id === x.id)).length;
      const card = (attr, on, label) => `<label class="opt addon"><input type="checkbox" ${attr}${on ? ' checked' : ''}> <span>${esc(label)}</span></label>`;
      const qty = (i, locked) => locked ? `<div class="qty"><span class="q1">Qty 1, from your quote</span><button type="button" class="rm" data-rm="${i}">Remove</button></div>`
        : `<div class="qty"><button type="button" data-dec="${i}" aria-label="One fewer">−</button><span aria-live="polite">${cart.items[i].qty}</span><button type="button" data-inc="${i}" aria-label="One more">+</button><button type="button" class="rm" data-rm="${i}">Remove</button></div>`;
      const qline = (name, sub, amt) => `<li class="line qline"><span class="th ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div class="ld"><h3>${esc(name)}</h3><p class="lp">${money(amt)} inc. GST</p><p class="ln">${esc(sub)}</p></div></li>`;
      cart.items.forEach((it, i) => {
        const m = CAT.models.find((x) => x.id === it.id), a = CAT.addons.find((x) => x.id === it.id);
        if (!m && !a) return;
        const unit = m ? m.price : a.price;
        if (a && a.id === 'power') return; // a requested add-on (tick box below), not charged now
        if (unit == null) tbc++; else known += unit * it.qty;
        const quoted = Q && it === qModel();
        if (m && inst && !quoted && !noInst) instOpts += card(`data-inst="${i}"`, it.install, (inst.label || inst.name) + (nModels > 1 ? ` · ${m.name}` : ''));
        html += `<li class="line">${m ? `<span class="th">${img(m)}</span>` : `<span class="th ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9.5 9.5v3M14.5 9.5v3M12 15v1.5"/></svg></span>`}
          <div class="ld"><h3>${m ? 'LORENTIS ' + esc(m.name) : esc(a.name)}</h3><p class="lp">${unit == null ? '<span class="tbc-tag">Price TBC</span>' : (a && a.from ? 'from ' : '') + money(unit) + (a && a.from ? '*' : '') + (m ? ' inc. GST' : '')}</p>
          ${a && a.note ? `<p class="ln">${esc(a.note)}</p>` : ''}
          ${qty(i, quoted)}</div></li>`;
        if (quoted) {
          html += qline('Installation by licensed plumber', `Confirmed in your quote ${Q.id}`, Q.install); known += Q.install;
          if (Q.power) { html += qline('Power point', `Confirmed in your quote ${Q.id}`, Q.power); known += Q.power; }
        }
      });
      const hasPower = !!find('power');
      const pwOpt = pw && !noInst && !(Q && Q.power) ? card('data-pw', hasPower, pw.label || pw.name) : '';
      const notes = [inst && instOpts ? inst.note : '', pwOpt ? pw.note : ''].filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');
      const noInstOpt = Q ? '' : `<label class="opt noinst"><input type="checkbox" data-noinst${noInst ? ' checked' : ''}> <span>I don't need installation</span></label>`;
      const extra = (instOpts || pwOpt ? `<div class="addons" role="group" aria-label="Add-ons, paid after your free assessment">${instOpts}${pwOpt}</div>${notes ? `<div class="addon-notes">${notes}</div>` : ''}` : '') + noInstOpt;
      // without a quote the add-ons are requests: paid after the free assessment, never part of this total
      const later = instOpts || pwOpt ? `<p class="ln req">${esc(CAT.charge_note || "Install isn't charged now. We'll confirm the price after your free assessment.")}</p>` : '';
      const qnote = Q ? `<p class="ln qnote">Your quote ${esc(Q.id)}: toilet and confirmed install, paid together at checkout. All prices include GST. <button type="button" class="ulink" data-unquote>Remove quote</button></p>` : '';
      const total = tbc ? `<div class="tot"><span>Total</span><b>To be confirmed</b></div><p class="ln">${known ? `Priced items: ${money(known)}. ` : ''}Model prices are to be confirmed.</p>${later}` : `<div class="tot"><span>Total</span><b>${money(known)}</b></div>${qnote}${later}`;
      return { html, extra, total, inst, Q, noInst };
    }
    const regLink = () => withTags(BP + '/register/?model=' + cart.items.map((x) => (CAT.models.find((m) => m.id === x.id) || {}).name).filter(Boolean).join(','));
    function paint() {
      const n = count();
      counters.forEach((c) => { c.textContent = n; c.hidden = !n; });
      $$('[data-cart-open]').forEach((a) => a.setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`));
      if (!CAT) return;
      views.forEach((v) => {
        if (!cart.items.length) { v.innerHTML = `<div class="empty"><p>Your cart is empty.</p><p><a class="ulink" href="${BP}/#collection">See the collection</a></p></div>`; return; }
        const L = linesHtml();
        const hasModel = cart.items.some((x) => CAT.models.some((m) => m.id === x.id));
        // no quote and installation wanted: a gentle nudge to the free assessment, checkout still one tap away
        const co = !L.Q && !L.noInst && hasModel
          ? `<div class="as-prompt" role="note"><p><b>Haven't had your free assessment?</b> Get your exact installed price before you pay.</p>
              <div class="co"><a class="btn" href="${regLink()}">Get free assessment</a><button type="button" class="btn line" data-checkout>Continue to checkout</button></div></div>
              ${v.dataset.cartView === 'drawer' ? `<p class="dr-view"><a class="ulink" href="${BP}/cart/">View cart</a></p>` : ''}`
          : `<div class="co"><button type="button" class="btn" data-checkout>${L.Q ? 'Checkout, toilet and install' : 'Checkout'}</button>${v.dataset.cartView === 'drawer' ? `<a class="ulink" href="${BP}/cart/">View cart</a>` : ''}</div>`;
        v.innerHTML = `<ul class="lines">${L.html}</ul>${L.extra}${L.total}
          <p class="fn">${esc(L.inst && !L.noInst ? L.inst.behind : '')}</p>
          ${co}
          <div class="status co-status" role="status" aria-live="polite"></div>`;
      });
    }
    // event delegation for cart views
    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-inc],[data-dec],[data-rm],[data-add-pw],[data-checkout],[data-unquote]'); if (!t) return;
      if (t.dataset.inc) { const it = cart.items[+t.dataset.inc]; if (cart.quote && it.id === cart.quote.model) return; it.qty = Math.min(5, it.qty + 1); save(); }
      else if (t.dataset.dec) { const it = cart.items[+t.dataset.dec]; it.qty = Math.max(1, it.qty - 1); save(); }
      else if (t.dataset.rm !== undefined && t.hasAttribute('data-rm')) { const gone = cart.items.splice(+t.dataset.rm, 1)[0]; if (cart.quote && gone && gone.id === cart.quote.model) delete cart.quote; save(); }
      else if (t.hasAttribute('data-unquote')) { delete cart.quote; save(); }
      else if (t.hasAttribute('data-add-pw')) add('power');
      else if (t.hasAttribute('data-checkout')) {
        const st = t.closest('[data-cart-view]').querySelector('.co-status');
        t.disabled = true; st.className = 'status co-status'; st.textContent = 'Checking…';
        let msg = 'Checkout not yet enabled.';
        try {
          const r = await fetch((API || BP) + '/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ items: cart.items, ...(qModel() ? { quote: { id: cart.quote.id } } : {}), utm: TAGS.reduce((o, k) => (tags[k] ? { ...o, [k]: tags[k] } : o), {}) }) });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j.ok && j.url) { location.href = j.url; return; }
          if (j.error) msg = j.error;
        } catch { /* static host without functions: same message */ }
        t.disabled = false; st.className = 'status co-status bad';
        st.innerHTML = `<b>${esc(msg)}</b> To order now, <a href="${withTags(BP + '/register/')}">start a free assessment</a> or call <a href="tel:1300709100">${PHONE}</a>.`;
      }
    });
    document.addEventListener('change', (e) => {
      const t = e.target.closest('[data-inst]'); if (t) { cart.items[+t.dataset.inst].install = t.checked; save(); return; }
      const ni = e.target.closest('[data-noinst]');
      if (ni) { // "I don't need installation": hide and drop the install and power point requests; unticking brings install back
        cart.noInstall = ni.checked;
        cart.items = cart.items.filter((x) => !(ni.checked && x.id === 'power')).map((x) => (CAT.models.some((m) => m.id === x.id) ? { ...x, install: !ni.checked } : x));
        const view = ni.closest('[data-cart-view]'); save(); const again = view && $('[data-noinst]', view); if (again) again.focus(); return;
      }
      const p = e.target.closest('[data-pw]'); if (p) { if (p.checked) { if (!find('power')) add('power'); } else { cart.items = cart.items.filter((x) => x.id !== 'power'); save(); } }
    });
    // drawer
    const dr = $('#cart-drawer');
    const openDrawer = () => { if (!dr || !dr.showModal) return false; dr.showModal(); requestAnimationFrame(() => dr.classList.add('open')); return true; };
    if (dr) {
      const close = () => { dr.classList.remove('open'); setTimeout(() => dr.close(), RM ? 0 : 320); };
      $('.dr-x', dr).addEventListener('click', close);
      dr.addEventListener('click', (e) => { if (e.target === dr) close(); });
      dr.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
      $$('[data-cart-open]').forEach((a) => a.addEventListener('click', (e) => { if (location.pathname.replace(BP, '') === '/cart/') return; if (openDrawer()) e.preventDefault(); }));
    }
    adders.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); if (!CAT) return; add(b.dataset.add); openDrawer(); }));
    addEventListener('storage', (e) => { if (e.key === CK) { cart = load(); paint(); } });
    // ---- /quote/?id=Q-…: PREVIEW sample quote from /data/quotes-sample.json; "Buy now" fills the cart with the model and the quote ----
    function renderQuote(c) {
      const qv = $('[data-q-view]'); if (!qv) return;
      const id = (params.get('id') || '').trim().toUpperCase();
      const fail = () => { qv.innerHTML = `<h2>We couldn't find that quote.</h2><p>Please check the link in your email, or call <a href="tel:1300709100">${PHONE}</a>.</p><p><a class="btn" href="${withTags(BP + '/register/')}">Get my free assessment</a></p>`; };
      if (!/^Q-[A-Z0-9]{4,12}$/.test(id)) { fail(); return; }
      fetch(BP + '/data/quotes-sample.json', { cache: 'no-cache' }).then((r) => r.json()).then((d) => {
        const q = (d.quotes || []).find((x) => x.id === id), m = q && c.models.find((x) => x.id === q.model);
        if (!q || !m || m.price == null) { fail(); return; }
        $$('[data-q-id]').forEach((el) => { el.textContent = '· ' + q.id; });
        const row = (t, sub, amt) => `<li><span><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="qa">${money(amt)}</span></li>`;
        const total = m.price + q.install + (q.power || 0);
        qv.innerHTML = `${q.sample ? '<p class="q-preview" role="note"><b>Sample</b> This is a sample quote to show how a quote will look. It is not a real quote.</p>' : ''}
          <div class="q-head">${img(m)}<div><p class="q-meta">Quote ${esc(q.id)}${q.issued ? ' · ' + esc(q.issued) : ''}</p><h2>LORENTIS ${esc(m.name)}</h2><p>${q.first_name ? 'For ' + esc(q.first_name) + (q.suburb ? ', ' + esc(q.suburb) : '') : ''}</p></div></div>
          <h3 class="q-h">Your install method</h3><p class="q-method">${esc(q.method || '')}${q.power ? ' ' + esc(q.power_line || '') : ''}</p>
          <ul class="q-lines">${row('LORENTIS ' + m.name, 'Smart toilet', m.price)}${row('Installation by licensed plumber', 'Confirmed from your photos', q.install)}${q.power ? row('Power point', 'Confirmed from your photos', q.power) : ''}</ul>
          <div class="tot"><span>Total installed price</span><b>${money(total)}</b></div><p class="ln">All prices include GST.</p>
          <div class="ctas"><button type="button" class="btn" data-q-buy>Buy now</button><a class="btn line" href="tel:1300709100">Call ${PHONE}</a></div>
          <p class="buy-note">No obligation. Pay for the toilet and the install together at checkout, then pick your install day once your toilet arrives.</p>`;
        $('[data-q-buy]', qv).addEventListener('click', () => {
          cart = { items: [{ id: m.id, qty: 1, install: true }], quote: { id: q.id, model: m.id, install: q.install, power: q.power || 0 } };
          save(); location.href = withTags(BP + '/cart/');
        });
      }).catch(fail);
    }
    paint();
    fetch(BP + '/data/products.json', { cache: 'no-cache' }).then((r) => r.json()).then((c) => {
      CAT = c;
      cart.items = cart.items.filter((x) => c.models.some((m) => m.id === x.id) || c.addons.some((a) => a.id === x.id && a.standalone));
      $$('[data-price]').forEach((el) => { const m = c.models.find((x) => x.id === el.dataset.price); if (m) el.textContent = m.price == null ? 'Price TBC' : money(m.price) + ' inc. GST'; });
      $$('[data-amt]').forEach((el) => { const m = c.models.find((x) => x.id === el.dataset.amt); if (m && m.price != null) el.textContent = money(m.price); });
      const want = params.get('add'); // no-JS fallback links: /cart/?add=k1
      if (want && (c.models.some((m) => m.id === want) || c.addons.some((a) => a.id === want && a.standalone))) { add(want); history.replaceState(null, '', location.pathname); } else paint();
      if (params.get('paid') === '1') { cart = { items: [] }; save(); }
      renderQuote(c);
    }).catch(() => { views.forEach((v) => { v.innerHTML = `<p>The cart could not load. Please call <a href="tel:1300709100">${PHONE}</a>.</p>`; }); });
  }

  // ---- model pages: sticky buy bar on phones once the hero buttons scroll away (hidden again near the closing section) ----
  const mbar = $('[data-mbar]'), heroCtas = $('[data-hero-ctas]');
  if (mbar && heroCtas && 'IntersectionObserver' in window) {
    let past = false, near = false;
    const set = () => { const on = past && !near; mbar.classList.toggle('show', on); mbar.inert = !on; document.body.classList.toggle('has-mbar', on); };
    new IntersectionObserver(([en]) => { past = !en.isIntersecting && en.boundingClientRect.top < 0; set(); }).observe(heroCtas);
    const end = $('#enquire') || $('footer');
    if (end) new IntersectionObserver(([en]) => { near = en.isIntersecting; set(); }).observe(end);
    set();
  }

  // ---- order confirmation (/order-confirmed/?order=...): show the number and carry it to /register/ and /book-installation/ ----
  if ($('[data-order-confirmed]')) {
    const o = orderParam(), qn = (params.get('quote') || '').toUpperCase();
    if (/^Q-[A-Z0-9]{4,12}$/.test(qn)) { // quote buyers: toilet and install already paid, nothing to send
      $$('[data-oc]').forEach((el) => { el.hidden = el.dataset.oc !== 'quote'; });
      $$('[data-quote-no]').forEach((el) => { el.textContent = qn; });
    }
    if (o) {
      $$('[data-order-no]').forEach((el) => { el.textContent = o; const w = el.closest('[hidden]'); if (w) w.hidden = false; });
      $$('a[data-order-link]').forEach((a) => { const u = new URL(a.getAttribute('href'), location.href); u.searchParams.set('order', o); a.setAttribute('href', withTags(u.pathname + u.search + u.hash)); });
    }
  }

  // ---- book your installation (/book-installation/): gate → day and time → details → pay → confirmed ----
  // Every backend call goes through window.LorentisBooking (assets/js/booking-adapter.js, a mock for now); the date rules
  // (weekdays, 2 business days to 6 weeks out, Sydney time) live in assets/js/booking-rules.js.
  const bk = $('form[data-book]');
  if (bk) {
    const startBooking = () => {
      const A = window.LorentisBooking, RU = window.LorentisBookingRules; if (!A || !RU) return;
      const el = bk.elements, E = errs(bk), status = $('.status', bk);
      const locked = $('[data-locked]', bk), gate = $$('[data-gate]', bk), note = $('.bk-gate-note', bk);
      const cal = $('[data-cal]', bk), slotsBox = $('[data-slots]', bk), calErr = $('[data-cal-err]', bk), payBody = $('[data-pay-body]', bk), done = $('[data-done]');
      const money = (n) => '$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
      const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const PV = A.preview ? '<p class="bk-pv">Preview: this request isn\'t sent anywhere yet. Nothing is charged.</p>' : '';
      let avail = {}, day = '', slot = '', held = null, quote = null;
      const open = () => gate.every((g) => g.checked);
      const lock = () => {
        const off = !open();
        if (off) { locked.setAttribute('inert', ''); locked.setAttribute('aria-disabled', 'true'); } else { locked.removeAttribute('inert'); locked.removeAttribute('aria-disabled'); }
        locked.classList.toggle('off', off); note.hidden = !off;
      };
      gate.forEach((g) => g.addEventListener('change', lock)); lock();
      // a corrected field drops its own error
      const fix = (e) => { const n = e.target.name, x = n && document.getElementById(`book-form-${n}-err`); if (!x) return; x.remove(); $$(`[name="${n}"]`, bk).forEach((f) => { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }); };
      bk.addEventListener('input', fix); bk.addEventListener('change', fix);
      if (orderParam()) el.order.value = orderParam();
      // calendar: Monday-to-Friday rows, one button per day; arrow keys move between open days
      const weeks = RU.weeks(), all = weeks.flat();
      const short = (d) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', month: 'short' }).format(new Date(d + 'T00:00:00Z'));
      const free = (d) => RU.isBookable(d) && avail[d] && (avail[d].am === 'open' || avail[d].pm === 'open');
      const renderCal = () => {
        const focusDay = day && free(day) ? day : all.find(free);
        cal.innerHTML = `<div class="cal-head" aria-hidden="true"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div><div class="cal-grid" role="group" aria-label="Weekdays you can book">${all.map((d, k) => {
          const ok = RU.isBookable(d), f = free(d), n = +d.slice(8), mon = n === 1 || k === 0 || (k % 5 === 0 && n <= 7) ? short(d) : '';
          return `<button type="button" class="day${d === day ? ' sel' : ''}${ok && !f ? ' is-full' : ''}" data-day="${d}" aria-pressed="${d === day}"${f ? '' : ' disabled'} tabindex="${d === focusDay ? 0 : -1}" aria-label="${esc(RU.label(d))}${f ? '' : ok ? ', fully booked' : ', not available'}"><small>${mon}</small><b>${n}</b></button>`;
        }).join('')}</div><p class="cal-key"><span class="k-open">Open</span><span class="k-full">Fully booked</span></p>`;
      };
      const renderSlots = () => {
        if (!day) { slotsBox.innerHTML = '<p class="hint">Choose a day to see the times.</p>'; return; }
        const a = avail[day] || {};
        slotsBox.innerHTML = `<fieldset class="slots"><legend>Times on ${esc(RU.label(day, { year: undefined }))}</legend>${RU.SLOTS.map((t) => { const o = a[t.id] === 'open';
          return `<label class="opt slot${o ? '' : ' booked'}"><input type="radio" name="slot" value="${t.id}"${slot === t.id ? ' checked' : ''}${o ? '' : ' disabled'}> <span><b>${t.label}</b> ${t.time}${o ? '' : ' · Booked'}</span></label>`; }).join('')}</fieldset>`;
      };
      const pick = (d) => { day = d; if (!avail[d] || avail[d][slot] !== 'open') slot = ''; calErr.hidden = true; renderCal(); renderSlots(); const b = $(`[data-day="${d}"]`, cal); if (b) b.focus(); };
      cal.addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b && !b.disabled) pick(b.dataset.day); });
      cal.addEventListener('keydown', (e) => {
        const b = e.target.closest('[data-day]'); if (!b) return;
        const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[e.key]; if (!mv) return;
        e.preventDefault(); let k = all.indexOf(b.dataset.day) + mv;
        while (k >= 0 && k < all.length && !free(all[k])) k += Math.sign(mv);
        if (k >= 0 && k < all.length) { $$('[data-day]', cal).forEach((x) => { x.tabIndex = -1; }); const n = $(`[data-day="${all[k]}"]`, cal); n.tabIndex = 0; n.focus(); }
      });
      slotsBox.addEventListener('change', (e) => { if (e.target.name === 'slot') { slot = e.target.value; calErr.hidden = true; } });
      A.getAvailability({ from: all[0], to: all[all.length - 1] }).then((r) => { avail = (r && r.days) || {}; renderCal(); renderSlots(); })
        .catch(() => { cal.innerHTML = `<p>The calendar could not load. Please call <a href="tel:1300709100">${PHONE}</a>.</p>`; });
      // the amount: ?amount= (a confirmed amount in a link we send), otherwise the order's requested add-ons from the adapter
      const linkAmount = () => { const n = Number(params.get('amount')); return Number.isInteger(n) && n > 0 && n <= 20000 ? n : 0; };
      const renderPay = () => {
        const lines = quote.lines.map((l) => `<li><span>${esc(l.name)}</span><b>${money(l.amount)}</b></li>`).join('');
        const mock = A.preview && !linkAmount() ? `<details class="bk-mock"><summary>Preview: change the mock amount</summary><label class="opt"><input type="checkbox" data-mock="install"${quote.lines.some((l) => /plumber/.test(l.name)) ? ' checked' : ''}> <span>Installation by licensed plumber ($990)</span></label><label class="opt"><input type="checkbox" data-mock="power"${quote.lines.some((l) => /electrician/.test(l.name)) ? ' checked' : ''}> <span>Power point by licensed electrician ($1,100)</span></label></details>` : '';
        const t = RU.SLOTS.find((x) => x.id === held.slot);
        payBody.innerHTML = `<p class="bk-hold">Request received. We're holding <b>${esc(RU.label(held.date, { year: undefined }))}, ${t.label.toLowerCase()} (${t.time})</b> for you. Pay to confirm your booking.</p><p class="hint">The amount we confirmed after your free assessment.</p><ul class="bk-lines">${lines}</ul><div class="tot"><span>To pay</span><b data-pay-total>${money(quote.total)}</b></div>${mock}${PV}<div class="form-foot"><button type="button" class="btn" data-pay-now${quote.total > 0 ? '' : ' disabled'}>Pay ${money(quote.total)}</button></div>`;
      };
      payBody.addEventListener('change', (e) => {
        const m = e.target.closest('[data-mock]'); if (!m) return;
        const on = (k) => $(`[data-mock="${k}"]`, payBody).checked, L = [];
        if (on('install')) L.push({ name: 'Installation by licensed plumber', amount: 990 });
        if (on('power')) L.push({ name: 'Power point by licensed electrician', amount: 1100 });
        quote = { lines: L, total: L.reduce((t, l) => t + l.amount, 0) }; renderPay(); const f = $(`[data-mock="${m.dataset.mock}"]`, payBody); f.closest('details').open = true; f.focus();
      });
      bk.addEventListener('submit', async (e) => {
        e.preventDefault(); E.clear(); status.className = 'status'; status.textContent = ''; calErr.hidden = true;
        if (!open()) { lock(); gate.find((g) => !g.checked).focus(); return; }
        const L = {}, v = (k) => el[k].value.trim();
        if (!/^[A-Za-z0-9-]{4,40}$/.test(v('order'))) L.order = 'Please enter your order number. It is on your order confirmation.';
        if (!v('name')) L.name = 'Please enter your name.';
        const ph = v('phone'), dg = ph.replace(/\D/g, '');
        if (!ph) L.phone = 'Please enter your phone number.'; else if (!/^[+0-9 ()-]{8,20}$/.test(ph) || dg.length < 8 || dg.length > 15) L.phone = 'Please check your phone number.';
        if (!v('email')) L.email = 'Please enter your email address.'; else if (!el.email.checkValidity()) L.email = 'Please check your email address.';
        if (!v('suburb')) L.suburb = 'Please enter your suburb.';
        if (!el.power.value) L.power = 'Please choose Yes, No or Not sure.';
        const noTime = !day ? 'Please choose a day.' : !slot ? 'Please choose a morning or afternoon.' : '';
        if (noTime) { calErr.textContent = noTime; calErr.hidden = false; }
        if (Object.keys(L).length) { E.show(L); const pe = document.getElementById('book-form-power-err'); if (pe) $('.bk-pw', bk).append(pe); return; }
        if (noTime) { const f = day ? $('input[name=slot]:not(:disabled)', slotsBox) : $('[data-day][tabindex="0"]', cal); if (f) f.focus(); return; }
        const b = $('[data-continue]', bk); b.disabled = true;
        const data = { order: v('order'), name: v('name'), phone: ph, email: v('email'), suburb: v('suburb'), power: el.power.value, date: day, slot };
        try {
          const r = await A.submitRequest(data);
          if (!r || !r.ok) { status.className = 'status bad'; status.textContent = (r && r.error) || `Something went wrong. Please call ${PHONE}.`; return; }
          held = { ...data, id: r.id };
          quote = linkAmount() ? { lines: [{ name: 'Your confirmed install amount', amount: linkAmount() }], total: linkAmount() } : await A.getQuote({ order: data.order, power: data.power });
          renderPay(); const h = $('[data-pay] legend', bk); h.setAttribute('tabindex', '-1'); h.focus();
          $('[data-pay]', bk).scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
        } catch { status.className = 'status bad'; status.textContent = `Something went wrong. Please call ${PHONE}.`; } finally { b.disabled = false; }
      });
      payBody.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-pay-now]'); if (!b || !held || !quote) return;
        b.disabled = true; b.textContent = 'Paying…';
        try {
          const r = await A.pay({ id: held.id, amount: quote.total });
          if (!r || !r.ok) { b.disabled = false; b.textContent = `Pay ${money(quote.total)}`; status.className = 'status bad'; status.textContent = (r && r.error) || `Payment did not go through. Please call ${PHONE}.`; return; }
          const t = RU.SLOTS.find((x) => x.id === held.slot);
          done.innerHTML = `<p class="eyebrow">Booking confirmed</p><h2>Booking <i>confirmed.</i></h2><dl class="bk-dl"><div><dt>Date</dt><dd>${esc(RU.label(held.date))}</dd></div><div><dt>Time</dt><dd>${t.label}, ${t.time}</dd></div><div><dt>Amount paid</dt><dd>${money(r.amount)}</dd></div><div><dt>Order number</dt><dd>${esc(held.order)}</dd></div><div><dt>Booking reference</dt><dd>${esc(r.id)}</dd></div></dl><p>Your install is booked for ${esc(held.suburb)}. We'll send your confirmation to ${esc(held.email)}. Questions? Call <a href="tel:1300709100">${PHONE}</a>.</p>${A.preview ? '<p class="bk-pv">Preview: this request isn\'t sent anywhere yet. Nothing has been charged.</p>' : ''}`;
          bk.hidden = true; done.hidden = false; done.focus(); done.scrollIntoView({ block: 'start', behavior: 'auto' });
        } catch { b.disabled = false; b.textContent = `Pay ${money(quote.total)}`; status.className = 'status bad'; status.textContent = `Payment did not go through. Please call ${PHONE}.`; }
      });
    };
    if (window.LorentisBooking) startBooking(); else addEventListener('DOMContentLoaded', startBooking);
  }

  // ---- unsubscribe (legacy list) ----
  $$('form.unsub').forEach((form) => {
    const pe = params.get('e'); if (pe) form.elements.email.value = pe;
  });
})();
