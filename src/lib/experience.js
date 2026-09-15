// Fixed start dates for combined "years of experience in the outdoor leisure
// vehicle market" claims used across the site. Update these only if a team
// member's start date needs correcting - the year counts themselves are
// computed automatically from today's date, both at build time (for SEO/
// no-JS fallback text) and client-side (see public/js/experience-years.js,
// which must be kept in sync with the logic below).
export const WILL_START = new Date(Date.UTC(2016, 10, 1)); // November 2016
export const LYNNE_START = new Date(Date.UTC(2021, 2, 1)); // March 2021

// Full completed years between `start` and `now` (anniversary-based, not a
// simple calendar-year subtraction) so the figure only increments once the
// person has actually passed that year's anniversary.
export function fullYearsSince(start, now = new Date()) {
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - start.getUTCMonth();
  const dayDiff = now.getUTCDate() - start.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }
  return years;
}

export function getExperienceYears(now = new Date()) {
  const will = fullYearsSince(WILL_START, now);
  const lynne = fullYearsSince(LYNNE_START, now);
  return { will, lynne, combined: will + lynne };
}
