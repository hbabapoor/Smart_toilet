/* LORENTIS booking rules: which days can be booked. No dependencies, no network.
 * Days are plain 'YYYY-MM-DD' strings for the calendar day in Sydney (Australia/Sydney), whatever the visitor's own time zone.
 * Rules: weekdays only; earliest 2 business days after today; latest 6 weeks (42 days) after today. */
(function (root) {
  const TZ = 'Australia/Sydney', MIN_BUSINESS_DAYS = 2, MAX_DAYS = 42;
  const SLOTS = [{ id: 'am', label: 'Morning', time: '8am–12pm' }, { id: 'pm', label: 'Afternoon', time: '12pm–4pm' }];
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const sydneyToday = (now = new Date()) => ymd.format(now); // e.g. 2026-10-26
  const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = toUTC(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const isWeekday = (s) => { const w = toUTC(s).getUTCDay(); return w >= 1 && w <= 5; };
  const addBusinessDays = (s, n) => { let d = s; while (n > 0) { d = addDays(d, 1); if (isWeekday(d)) n--; } return d; };
  const bookingWindow = (now) => { const today = sydneyToday(now); return { today, first: addBusinessDays(today, MIN_BUSINESS_DAYS), last: addDays(today, MAX_DAYS) }; };
  const isBookable = (s, now) => { const w = bookingWindow(now); return /^\d{4}-\d{2}-\d{2}$/.test(s) && isWeekday(s) && s >= w.first && s <= w.last; };
  // Monday-to-Friday rows from the week of the first bookable day to the week of the last one
  const weeks = (now) => {
    const w = bookingWindow(now), out = [];
    let mon = addDays(w.first, -((toUTC(w.first).getUTCDay() + 6) % 7));
    while (mon <= w.last) { out.push([0, 1, 2, 3, 4].map((k) => addDays(mon, k))); mon = addDays(mon, 7); }
    return out;
  };
  const label = (s, opts = {}) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...opts }).format(toUTC(s));
  const api = { TZ, SLOTS, MIN_BUSINESS_DAYS, MAX_DAYS, sydneyToday, addDays, addBusinessDays, isWeekday, bookingWindow, isBookable, weeks, label };
  root.LorentisBookingRules = api;
})(typeof window !== 'undefined' ? window : globalThis);
