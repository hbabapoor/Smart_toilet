/* LORENTIS booking adapter: the ONLY place /book-installation/ talks to a backend.
 * The page calls exactly these, and nothing else:
 *   getAvailability({ from, to })  -> Promise<{ days: { 'YYYY-MM-DD': { am: 'open'|'booked', pm: 'open'|'booked' } } }>
 *   getQuote({ order, power })     -> Promise<{ lines: [{ name, amount }], total }>   the install amount we confirmed after the assessment
 *   submitRequest(data)            -> Promise<{ ok, id, error? }>                      holds the chosen day and slot
 *   pay({ id, amount })            -> Promise<{ ok, id, amount, error? }>              takes payment; the booking is confirmed only after this
 *   preview                        -> true while this is the mock (the page then shows its preview notice)
 * Today this is a mock: dummy availability, and requests are kept only in this browser (localStorage). Nothing is sent or charged.
 * To go live, swap this file for one with the same five members (Cal.com availability/bookings, Stripe for pay(), or
 * fetch() calls to /api/book-installation, see functions/api/book-installation.js) and set preview: false. The page UI does not change. */
(function (root) {
  const KEY = 'lorentis_booking_requests', PRICES = { install: 990, power: 1100 };
  const R = root.LorentisBookingRules;
  const read = () => { try { return JSON.parse(root.localStorage.getItem(KEY) || '[]') || []; } catch { return []; } };
  const write = (list) => { try { root.localStorage.setItem(KEY, JSON.stringify(list.slice(-20))); } catch { /* storage off */ } };
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rid = (p) => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const later = (v) => new Promise((res) => setTimeout(() => res(v), 120));
  // dummy availability: some slots booked, a few days fully booked, plus anything requested in this browser
  function getAvailability({ from, to } = {}) {
    const w = R.bookingWindow(); from = from || w.first; to = to || w.last;
    const mine = read().filter((x) => x.status !== 'cancelled');
    const days = {};
    for (let d = from; d <= to; d = R.addDays(d, 1)) {
      if (!R.isBookable(d)) continue;
      const h = hash(d), full = h % 9 === 4;
      const st = (slot, busy) => (full || busy || mine.some((x) => x.date === d && x.slot === slot) ? 'booked' : 'open');
      days[d] = { am: st('am', h % 4 === 0), pm: st('pm', h % 5 === 1) };
    }
    return later({ days });
  }
  function getQuote({ power } = {}) {
    const lines = [{ name: 'Installation by licensed plumber', amount: PRICES.install }];
    if (power === 'yes') lines.push({ name: 'Power point by licensed electrician', amount: PRICES.power });
    return later({ lines, total: lines.reduce((s, l) => s + l.amount, 0) });
  }
  function submitRequest(data = {}) {
    if (!R.isBookable(String(data.date || '')) || !['am', 'pm'].includes(data.slot)) return later({ ok: false, error: 'Please choose an available day and time.' });
    const rec = { id: rid('BK'), status: 'held', created: new Date().toISOString(), ...data };
    write([...read(), rec]);
    return later({ ok: true, id: rec.id });
  }
  function pay({ id, amount } = {}) {
    const list = read(), rec = list.find((x) => x.id === id);
    if (!rec || !(amount > 0)) return later({ ok: false, error: 'We could not find that booking. Please call 1300 709 100.' });
    rec.status = 'paid'; rec.paid = amount; rec.paid_at = new Date().toISOString(); write(list);
    return later({ ok: true, id, amount });
  }
  root.LorentisBooking = { preview: true, getAvailability, getQuote, submitRequest, pay };
})(typeof window !== 'undefined' ? window : globalThis);
