/**
 * STATS COUNTER (page script, non-module)
 * ======================================================
 * Animates the hero KPI numbers from 0 → target when they scroll into
 * view. Elements opt in with [data-count-to] and optional [data-suffix].
 * Runs once per element. Respects prefers-reduced-motion.
 */
(function () {
  function runCountUp(el) {
    const target = parseFloat(el.getAttribute('data-count-to')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      el.textContent = target + suffix;
      return;
    }

    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }

  function init() {
    const nums = Array.from(document.querySelectorAll('[data-count-to]'));
    if (!nums.length) return;

    if (!('IntersectionObserver' in window)) {
      nums.forEach(runCountUp);
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          runCountUp(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    nums.forEach(el => io.observe(el));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
