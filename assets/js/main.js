/* =========================================================
   La Taverne à Bacchus — mouvement
   Un seul langage : tout se lève comme un rideau.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* ---------------------------------------------------------
     0. Contenus datés (menus de fêtes…)
     Tout élément portant data-jusqu-au est retiré à partir de
     cette date. Lancé avant le reste, sans dépendance.
     Aperçu d'une autre date : ?apercu-date=2027-01-02
     --------------------------------------------------------- */
  (function retirerContenusPerimes() {
    var maintenant = Date.now();
    var apercu = /[?&]apercu-date=([0-9T:-]+)/.exec(location.search);
    if (apercu && !isNaN(new Date(apercu[1]).getTime())) maintenant = new Date(apercu[1]).getTime();

    document.querySelectorAll('[data-jusqu-au]').forEach(function (el) {
      var fin = new Date(el.getAttribute('data-jusqu-au')).getTime();
      if (!isNaN(fin) && maintenant >= fin) el.parentNode.removeChild(el);
    });
  })();

  if (!hasGsap) {
    root.classList.remove('has-js', 'has-intro');
    initPlainBits();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  var hasSplit = typeof window.SplitText !== 'undefined';

  /* ---------------------------------------------------------
     1. Scroll lissé
     --------------------------------------------------------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        /* scroll-margin-top de la cible si elle en a un (ex. menus de fêtes, sous la barre fixe) */
        var marge = parseFloat(getComputedStyle(target).scrollMarginTop) || 10;
        lenis.scrollTo(target, { offset: -marge, duration: 1.4 });
      });
    });
  }

  /* ---------------------------------------------------------
     2. Révélations
     --------------------------------------------------------- */
  function buildReveals() {
    document.querySelectorAll('[data-reveal="lines"]').forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      if (!hasSplit) return;

      var split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ligne' });
      if (!split.lines.length) { split.revert(); return; }

      gsap.from(split.lines, {
        yPercent: 112, duration: 1.05, ease: 'power3.out', stagger: 0.075,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        /* le texte redevient du texte : plus aucun redécoupage possible ensuite */
        onComplete: function () { split.revert(); }
      });
    });

    document.querySelectorAll('.frame[data-reveal="mask"]').forEach(function (frame) {
      var img = frame.querySelector('img');
      var tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 85%', once: true } });
      tl.fromTo(frame, { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: 1.25, ease: 'power3.inOut' });
      if (img) tl.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
    });

    document.querySelectorAll('[data-reveal="stagger"]').forEach(function (list) {
      gsap.set(list.children, { y: 18 });
      gsap.to(list.children, {
        opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .07,
        scrollTrigger: { trigger: list, start: 'top 88%', once: true }
      });
    });
  }

  /* ---------------------------------------------------------
     3. Parallaxe
     --------------------------------------------------------- */
  function buildParallax() {
    if (reduce) return;
    var poser = function (el) {
      var amount = parseFloat(el.dataset.parallax) || 0.12;
      var scope = el.closest('section') || el.parentElement;
      gsap.fromTo(el, { yPercent: -amount * 100 }, {
        yPercent: amount * 100, ease: 'none',
        scrollTrigger: { trigger: scope, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    };
    /* sous 760px la vidéo du hero revient dans le flux : pas de parallaxe dessus */
    var mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', function () {
      document.querySelectorAll('[data-parallax]').forEach(poser);
    });
    mm.add('(max-width: 760px)', function () {
      document.querySelectorAll('[data-parallax]:not(.hero__media)').forEach(poser);
    });
  }

  /* ---------------------------------------------------------
     4. Hero — l'image s'enfonce. Le texte suit, sans s'effacer.
     --------------------------------------------------------- */
  function buildHero() {
    if (reduce) return;
    var hero = document.querySelector('.hero');
    if (!hero) return;

    gsap.to('.hero__inner', {
      yPercent: -14, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__video', {
      scale: 1.14, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__scroll', {
      opacity: 0,
      scrollTrigger: { trigger: hero, start: 'top top', end: '25% top', scrub: true }
    });
  }

  /* ---------------------------------------------------------
     5. Barre de navigation
     --------------------------------------------------------- */
  function buildNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    ScrollTrigger.create({
      trigger: '.hero', start: 'bottom 70px',
      onEnter: function () { nav.classList.add('is-stuck'); },
      onLeaveBack: function () { nav.classList.remove('is-stuck'); }
    });

    document.querySelectorAll('.bandeau, .ailleurs, .foot').forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 60px', end: 'bottom 60px',
        onToggle: function (self) { nav.classList.toggle('is-dark', self.isActive); }
      });
    });
  }

  /* ---------------------------------------------------------
     6. Curseur
     --------------------------------------------------------- */
  function buildCursor() {
    var cur = document.getElementById('cursor');
    if (!cur || reduce || matchMedia('(pointer: coarse)').matches) return;

    var xTo = gsap.quickTo(cur, 'x', { duration: .5, ease: 'power3' });
    var yTo = gsap.quickTo(cur, 'y', { duration: .5, ease: 'power3' });
    var clear = function () { cur.classList.remove('is-link'); };

    window.addEventListener('mousemove', function (e) {
      gsap.to(cur, { opacity: 1, duration: .3, overwrite: 'auto' });
      xTo(e.clientX); yTo(e.clientY);
    }, { passive: true });

    document.addEventListener('mouseleave', function () { gsap.to(cur, { opacity: 0, duration: .3 }); clear(); });
    /* la souris qui entre dans une vidéo n'émet pas toujours mouseleave : on remet à zéro */
    window.addEventListener('blur', function () { gsap.set(cur, { opacity: 0 }); clear(); });

    document.querySelectorAll('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cur.classList.add('is-link'); });
      el.addEventListener('mouseleave', clear);
      el.addEventListener('click', clear);
    });
  }

  /* ---------------------------------------------------------
     7. Écran d'ouverture
     --------------------------------------------------------- */
  function playIntro(done) {
    var intro = document.getElementById('intro');
    if (!intro || reduce || !root.classList.contains('has-intro')) {
      root.classList.remove('has-intro');
      done();
      return;
    }
    if (lenis) lenis.stop();

    var tl = gsap.timeline({
      onComplete: function () {
        root.classList.remove('has-intro');
        if (lenis) lenis.start();
        done();
      }
    });

    tl.set(['.intro__mark span > *', '.intro__sub span > *'], { yPercent: 110 })
      .fromTo('.intro__fond img', { scale: 1.12 }, { scale: 1, duration: 2.6, ease: 'power2.out' }, 0)
      .to('.intro__bar span', { scaleX: 1, duration: 1.15, ease: 'power2.inOut' }, 0)
      .to('.intro__mark span > *', { yPercent: 0, duration: 1, ease: 'power3.out' }, .3)
      .to('.intro__sub span > *', { yPercent: 0, duration: .9, ease: 'power3.out' }, .5)
      .to('.intro__inner', { yPercent: -16, opacity: 0, duration: .7, ease: 'power2.in' }, 1.6)
      .to('.intro', { yPercent: -100, duration: 1.05, ease: 'power3.inOut' }, 1.75);
  }

  function heroEntrance() {
    if (reduce || !hasSplit) return;
    var title = document.querySelector('.hero__title');
    var meta = document.querySelector('.hero__meta');
    if (!title) return;
    var split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'ligne' });
    gsap.from(split.lines, {
      yPercent: 112, duration: 1.3, ease: 'power3.out', stagger: .1,
      onComplete: function () { split.revert(); }
    });
    if (meta) gsap.from(meta, { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', delay: .25 });
  }

  /* ---------------------------------------------------------
     8. La carte cadeau se dévoile
     --------------------------------------------------------- */
  function buildBon() {
    var bon = document.querySelector('.bon');
    if (!bon || reduce) return;

    gsap.timeline({ scrollTrigger: { trigger: bon, start: 'top 82%', once: true } })
      .fromTo(bon, { clipPath: 'inset(0 0 100% 0)' },
                   { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power3.inOut' })
      .fromTo('.bon__img img', { scale: 1.2 }, { scale: 1, duration: 1.7, ease: 'power3.out' }, 0)
      .fromTo('.bon__cadre', { opacity: 0, scale: .95 },
                             { opacity: 1, scale: 1, duration: .9, ease: 'power3.out' }, .55)
      .fromTo('.bon__sign', { opacity: 0, y: 14 },
                            { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, .8);
  }

  /* ---------------------------------------------------------
     9. Détails sans dépendance
     --------------------------------------------------------- */
  function initPlainBits() {
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* --------------------------------------------------------- */
  function start() {
    initPlainBits();
    buildReveals();
    buildParallax();
    buildHero();
    buildNav();
    buildCursor();
    buildBon();
    playIntro(heroEntrance);
    ScrollTrigger.refresh();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
  } else {
    window.addEventListener('load', start);
  }
})();
