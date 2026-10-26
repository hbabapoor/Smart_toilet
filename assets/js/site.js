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

  // ---- home collection: expanding-card accordion, pinned to the scroll ----
  // The section sticks while K1 → K31 → K4 → K68 → K73 expand in turn with the page scroll, then the page carries on.
  // Mouse hover or keyboard focus expands a card; a tap on a collapsed card expands it, a tap on the expanded one opens it.
  // Off (static grid) for reduced motion, no JS, or screens too short for the row.
  const acc = $('[data-acc]');
  if (acc) {
    const row = $('.acc-row', acc), cards = $$('.ac', acc), bar = $('.acc-bar span', acc), N = cards.length;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    let on = false, step = 1, tick = 0, lastW = 0, scrollIdx = -1;
    const set = (i) => cards.forEach((c, k) => c.classList.toggle('on', k === i));
    const top = () => acc.getBoundingClientRect().top + scrollY;
    const idxAt = (y) => Math.min(N - 1, Math.max(0, Math.floor(y / step)));
    const paint = () => {
      tick = 0; if (!on) return;
      const y = -acc.getBoundingClientRect().top, i = idxAt(y);
      if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / (step * N))).toFixed(4)})`;
      if (i !== scrollIdx) { scrollIdx = i; set(i); }
    };
    const off = () => { on = false; acc.classList.remove('on'); acc.style.height = ''; };
    const measure = () => {
      lastW = innerWidth;
      if (mq.matches || innerHeight < 500) return off();
      acc.classList.add('on');
      step = Math.round(innerHeight * 0.45);
      acc.style.height = (innerHeight + step * N) + 'px'; // one step of scroll per card, then the page carries on
      on = true; scrollIdx = -1; paint();
    };
    const req = () => { if (!tick) { tick = 1; requestAnimationFrame(paint); } };
    addEventListener('scroll', req, { passive: true });
    addEventListener('resize', () => { if (innerWidth !== lastW) measure(); else req(); }); // height-only resizes (mobile address bar) don't re-measure
    addEventListener('orientationchange', () => setTimeout(measure, 120));
    addEventListener('load', measure);
    if (mq.addEventListener) mq.addEventListener('change', measure);
    cards.forEach((c, i) => c.addEventListener('pointerenter', (e) => { if (on && e.pointerType === 'mouse') set(i); }));
    // Keyboard: focusing a card expands it and scrolls the page to that card's step, so the pin is in view; Enter opens it.
    row.addEventListener('focusin', (e) => {
      const c = e.target.closest('.ac'); if (!c || !on) return;
      if (e.target.matches && !e.target.matches(':focus-visible')) return; // a tap or click, not the keyboard
      const i = +c.dataset.i, y = scrollY - top();
      set(i); scrollIdx = i;
      if (y < 0 || y > step * N || idxAt(y) !== i) scrollTo({ top: top() + i * step + Math.round(step / 2), behavior: 'auto' });
    });
    // Touch: the first tap on a collapsed card expands it instead of opening it.
    row.addEventListener('click', (e) => {
      const a = e.target.closest('.ac-cover'); if (!a || !on) return;
      const c = a.closest('.ac'); if (!c.classList.contains('on')) { e.preventDefault(); set(+c.dataset.i); }
    });
    measure();
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
    const want = (params.get('model') || '').toUpperCase();
    if (sel && MODELS.includes(want)) sel.value = want;
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
    const done = () => thanks(form, `<b>Thank you, we have your photos.</b>Our team will look at your photos and contact you about the install cost and method. If it is urgent, call ${PHONE}.`);
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
    const load = () => { try { const c = JSON.parse(localStorage.getItem(CK) || '{}'); return Array.isArray(c.items) ? c : { items: [] }; } catch { return { items: [] }; } };
    let cart = load(), CAT = null;
    const save = () => { try { localStorage.setItem(CK, JSON.stringify(cart)); } catch { /* storage off */ } paint(); };
    const money = (n) => '$' + Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const count = () => cart.items.reduce((a, x) => a + x.qty, 0);
    const find = (id) => cart.items.find((x) => x.id === id);
    const add = (id) => {
      const it = find(id);
      if (it) it.qty = Math.min(5, it.qty + 1);
      else cart.items.push(CAT && CAT.models.some((m) => m.id === id) ? { id, qty: 1, install: true } : { id, qty: 1 });
      save();
    };
    const img = (m) => `<picture><source type="image/webp" srcset="${BP}/assets/img/${m.image}.webp"><img src="${BP}/assets/img/${m.image}.webp" alt="" width="80" height="120" loading="lazy"></picture>`;
    function linesHtml() {
      const inst = CAT.addons.find((a) => a.id === 'install'), pw = CAT.addons.find((a) => a.id === 'power');
      let known = 0, tbc = 0, html = '', instOpts = '';
      const nModels = cart.items.filter((x) => CAT.models.some((m) => m.id === x.id)).length;
      const card = (attr, on, label) => `<label class="opt addon"><input type="checkbox" ${attr}${on ? ' checked' : ''}> <span>${esc(label)}</span></label>`;
      cart.items.forEach((it, i) => {
        const m = CAT.models.find((x) => x.id === it.id), a = CAT.addons.find((x) => x.id === it.id);
        if (!m && !a) return;
        const unit = m ? m.price : a.price;
        if (a && a.id === 'power') return; // a requested add-on (tick box below), not charged now
        if (unit == null) tbc++; else known += unit * it.qty; // toilets only
        let opt = '';
        if (m && inst) {
          instOpts += card(`data-inst="${i}"`, it.install, (inst.label || inst.name) + (nModels > 1 ? ` · ${m.name}` : ''));
        }
        html += `<li class="line">${m ? `<span class="th">${img(m)}</span>` : `<span class="th ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9.5 9.5v3M14.5 9.5v3M12 15v1.5"/></svg></span>`}
          <div class="ld"><h3>${m ? 'LORENTIS ' + esc(m.name) : esc(a.name)}</h3><p class="lp">${unit == null ? '<span class="tbc-tag">Price TBC</span>' : (a && a.from ? 'from ' : '') + money(unit) + (a && a.from ? '*' : '') + (m ? ' inc. GST' : '')}</p>
          ${a && a.note ? `<p class="ln">${esc(a.note)}</p>` : ''}${opt}
          <div class="qty"><button type="button" data-dec="${i}" aria-label="One fewer">−</button><span aria-live="polite">${it.qty}</span><button type="button" data-inc="${i}" aria-label="One more">+</button><button type="button" class="rm" data-rm="${i}">Remove</button></div></div></li>`;
      });
      const hasPower = !!find('power');
      const pwOpt = pw ? card('data-pw', hasPower, pw.label || pw.name) : '';
      const notes = [inst && instOpts ? inst.note : '', pw ? pw.note : ''].filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');
      const extra = instOpts || pwOpt ? `<div class="addons" role="group" aria-label="Add-ons, paid after your free assessment">${instOpts}${pwOpt}</div>${notes ? `<div class="addon-notes">${notes}</div>` : ''}` : '';
      // the add-ons are requests: paid after the free assessment, never part of this total
      const later = instOpts || pwOpt ? `<p class="ln req">${esc(CAT.charge_note || "Install isn't charged now. We'll confirm the price after your free assessment.")}</p>` : '';
      const total = tbc ? `<div class="tot"><span>Total</span><b>To be confirmed</b></div><p class="ln">${known ? `Priced items: ${money(known)}. ` : ''}Model prices are to be confirmed.</p>${later}` : `<div class="tot"><span>Total</span><b>${money(known)}</b></div>${later}`;
      return { html, extra, total, inst };
    }
    function paint() {
      const n = count();
      counters.forEach((c) => { c.textContent = n; c.hidden = !n; });
      $$('[data-cart-open]').forEach((a) => a.setAttribute('aria-label', `Cart, ${n} item${n === 1 ? '' : 's'}`));
      if (!CAT) return;
      views.forEach((v) => {
        if (!cart.items.length) { v.innerHTML = `<div class="empty"><p>Your cart is empty.</p><p><a class="ulink" href="${BP}/#collection">See the collection</a></p></div>`; return; }
        const L = linesHtml();
        v.innerHTML = `<ul class="lines">${L.html}</ul>${L.extra}${L.total}
          <p class="fn">${esc(L.inst ? L.inst.behind : '')}</p>
          <div class="co"><button type="button" class="btn" data-checkout>Checkout</button>${v.dataset.cartView === 'drawer' ? `<a class="ulink" href="${BP}/cart/">View cart</a>` : ''}</div>
          <div class="status co-status" role="status" aria-live="polite"></div>`;
      });
    }
    // event delegation for cart views
    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-inc],[data-dec],[data-rm],[data-add-pw],[data-checkout]'); if (!t) return;
      if (t.dataset.inc) { const it = cart.items[+t.dataset.inc]; it.qty = Math.min(5, it.qty + 1); save(); }
      else if (t.dataset.dec) { const it = cart.items[+t.dataset.dec]; it.qty = Math.max(1, it.qty - 1); save(); }
      else if (t.dataset.rm !== undefined && t.hasAttribute('data-rm')) { cart.items.splice(+t.dataset.rm, 1); save(); }
      else if (t.hasAttribute('data-add-pw')) add('power');
      else if (t.hasAttribute('data-checkout')) {
        const st = t.closest('[data-cart-view]').querySelector('.co-status');
        t.disabled = true; st.className = 'status co-status'; st.textContent = 'Checking…';
        let msg = 'Checkout not yet enabled.';
        try {
          const r = await fetch((API || BP) + '/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ items: cart.items, utm: TAGS.reduce((o, k) => (tags[k] ? { ...o, [k]: tags[k] } : o), {}) }) });
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
    paint();
    fetch(BP + '/data/products.json', { cache: 'no-cache' }).then((r) => r.json()).then((c) => {
      CAT = c;
      cart.items = cart.items.filter((x) => c.models.some((m) => m.id === x.id) || c.addons.some((a) => a.id === x.id && a.standalone));
      $$('[data-price]').forEach((el) => { const m = c.models.find((x) => x.id === el.dataset.price); if (m) el.textContent = m.price == null ? 'Price TBC' : money(m.price) + ' inc. GST'; });
      $$('[data-amt]').forEach((el) => { const m = c.models.find((x) => x.id === el.dataset.amt); if (m && m.price != null) el.textContent = money(m.price); });
      const want = params.get('add'); // no-JS fallback links: /cart/?add=k1
      if (want && (c.models.some((m) => m.id === want) || c.addons.some((a) => a.id === want && a.standalone))) { add(want); history.replaceState(null, '', location.pathname); } else paint();
      if (params.get('paid') === '1') { cart.items = []; save(); }
    }).catch(() => { views.forEach((v) => { v.innerHTML = `<p>The cart could not load. Please call <a href="tel:1300709100">${PHONE}</a>.</p>`; }); });
  }

  // ---- order confirmation (/order-confirmed/?order=...): show the number and carry it to /register/ and /book-installation/ ----
  if ($('[data-order-confirmed]')) {
    const o = orderParam();
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
