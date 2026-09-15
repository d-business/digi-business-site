// Recalculates "years of experience" figures on every page load, using the
// visitor's current date, so the numbers never need a redeploy to stay
// accurate. Mirrors the logic in src/lib/experience.js (keep both in sync if
// the start dates ever change).
(function () {
  var WILL_START = new Date(2016, 10, 1); // November 2016
  var LYNNE_START = new Date(2021, 2, 1); // March 2021

  function fullYearsSince(start, now) {
    var years = now.getFullYear() - start.getFullYear();
    var monthDiff = now.getMonth() - start.getMonth();
    var dayDiff = now.getDate() - start.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years -= 1;
    }
    return years;
  }

  function updateExperienceYears() {
    var now = new Date();
    var will = fullYearsSince(WILL_START, now);
    var lynne = fullYearsSince(LYNNE_START, now);
    var combined = will + lynne;

    document.querySelectorAll('[data-experience="combined"]').forEach(function (el) {
      el.textContent = combined;
    });
    document.querySelectorAll('[data-experience="will"]').forEach(function (el) {
      el.textContent = will;
    });
    document.querySelectorAll('[data-experience="lynne"]').forEach(function (el) {
      el.textContent = lynne;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateExperienceYears);
  } else {
    updateExperienceYears();
  }
})();
