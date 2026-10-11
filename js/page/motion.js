/* Ambient effects run only while the hero is visible. Content is visible by
   default, including when scripts or IntersectionObserver are unavailable. */
document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('header.relative');
  if (!hero || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let settling = 0;
  function update() {
    root.classList.toggle('hero-motion-active', visible && !document.hidden && !reduced.matches);
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    update();
  }, { threshold: 0 }).observe(hero);
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      reveal.unobserve(entry.target);
    }
  }, { threshold: 0.05 });
  const targets = [...hero.querySelectorAll('[data-reveal]')];
  function revealAll() {
    targets.forEach(el => { el.classList.add('is-revealed'); reveal.unobserve(el); });
  }
  targets.forEach(el => reveal.observe(el));
  root.classList.add('motion-ready');
  if (reduced.matches) revealAll();
  document.addEventListener('visibilitychange', update);
  // Moving cards should not repeatedly trigger costly hover surfaces under a
  // stationary mouse. Resume ambient animation at its existing phase on idle.
  addEventListener('scroll', () => {
    if(!root.classList.contains('is-scrolling'))root.classList.add('is-scrolling');
    clearTimeout(settling);
    settling=setTimeout(()=>root.classList.remove('is-scrolling'),160);
  }, {passive:true});
  reduced.addEventListener('change', () => { if (reduced.matches) revealAll(); update(); });
});
