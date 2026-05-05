const SELECTORS = [
  '.poster-card',
  '.latest-card:not(.latest-card--skeleton)',
  '.genre-card',
  '.rank-card',
  '.related-card',
  '.homePanel',
  '.sectionHead',
  '.latest-hero',
  '.genre-hero__content',
  '.rank-hero__content',
  '.movie-info-card',
  '.movie-recommend-card',
  '.movie-side-card',
  '.cmt-section',
  '.star-rating',
].join(',');

let _observer = null;

export function initScrollReveal() {
  if (_observer) _observer.disconnect();

  _observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        _observer.unobserve(entry.target);
      });
    },
    { threshold: 0.06, rootMargin: '0px 0px -28px 0px' }
  );

  setTimeout(() => {
    document.querySelectorAll(SELECTORS).forEach((el, i) => {
      if (el.classList.contains('is-revealed')) return;
      el.style.setProperty('--reveal-delay', `${Math.min(i % 6, 5) * 65}ms`);
      el.classList.add('reveal');
      _observer.observe(el);
    });
  }, 80);
}
