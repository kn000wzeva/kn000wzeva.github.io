/* =========================================================
   PORTFOLIO · RESUME — script.js
   - Переключение вкладок (resume / portfolio)
   - Умный хэш-роутинг: #clips / #contacts и т.п. тоже понимаются
   - Плавный скролл по внутренним ссылкам (.hero__link, .back-to-top)
   - Аккордеон (театральные постановки)
   - Слайдер: data-photos формат + свайп на мобильных
   - Lazy-embed YouTube (data-video-id)
   ========================================================= */

(() => {
  'use strict';

  /* ---------- ВКЛАДКИ ---------- */
  const TABS = ['resume', 'portfolio'];
  const DEFAULT_TAB = 'resume';

  // Соответствие "id элемента → вкладка, в которой он живёт".
  // Позволяет открывать сайт по прямой ссылке site.com/#clips и попадать
  // в нужную вкладку + проскролливать к секции.
  const ANCHOR_TO_TAB = {
    'tab-resume':    'resume',
    'contacts':      'resume',
    'about':         'resume',
    'skills':        'resume',
    'experience':    'resume',
    'tab-portfolio': 'portfolio',
    'clips':         'portfolio',
    'short-films':   'portfolio',
    'theatre':       'portfolio'
  };

  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabSections = {
    resume:    document.getElementById('tab-resume'),
    portfolio: document.getElementById('tab-portfolio')
  };

  function setTab(name, updateHash = true) {
    if (!TABS.includes(name)) name = DEFAULT_TAB;

    TABS.forEach(t => {
      const section = tabSections[t];
      if (!section) return;
      section.classList.toggle('is-active', t === name);
    });
    tabButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.tab === name);
      btn.setAttribute('aria-pressed', btn.dataset.tab === name);
    });
    document.body.classList.toggle('is-resume',    name === 'resume');
    document.body.classList.toggle('is-portfolio', name === 'portfolio');

    // Сброс скролла при смене вкладки
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    document.title = name === 'portfolio' ? 'Портфолио' : 'Резюме';

    if (updateHash) {
      const newHash = '#' + name;
      if (location.hash !== newHash) history.replaceState(null, '', newHash);
    }
  }

  // Разбор hash: вернуть и вкладку, и якорь-id (если есть).
  function parseHash() {
    const raw = (location.hash || '').replace('#', '').toLowerCase().trim();
    if (!raw) return { tab: DEFAULT_TAB, anchor: null };
    if (TABS.includes(raw))       return { tab: raw, anchor: null };
    if (ANCHOR_TO_TAB[raw])       return { tab: ANCHOR_TO_TAB[raw], anchor: raw };
    return { tab: DEFAULT_TAB, anchor: null };
  }

  // Клики по кнопкам вкладок
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  // Реакция на внешнее изменение hash (back/forward, вставка ссылки)
  window.addEventListener('hashchange', () => {
    const { tab, anchor } = parseHash();
    setTab(tab, false);
    if (anchor) {
      requestAnimationFrame(() => scrollToId(anchor));
    }
  });

  // Инициализация — возможно, мы пришли по прямой ссылке на якорь
  {
    const { tab, anchor } = parseHash();
    setTab(tab, false);
    if (anchor) {
      window.addEventListener('load', () => {
        requestAnimationFrame(() => scrollToId(anchor));
      });
    }
  }


  /* ---------- SMOOTH-SCROLL для внутренних ссылок ---------- */
  const navH = () => {
    const nav = document.querySelector('.tab-nav');
    return nav ? nav.getBoundingClientRect().height : 68;
  };

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const y = target.getBoundingClientRect().top + window.pageYOffset - navH() - 8;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
  }

  // Все ссылки с data-scroll: hero__link и back-to-top
  document.querySelectorAll('a[data-scroll]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      const id = href.slice(1);
      if (!document.getElementById(id)) return;
      e.preventDefault();        // не даём hashchange сменить вкладку
      scrollToId(id);
    });
  });


  /* ---------- АККОРДЕОН (театр) ---------- */
  document.querySelectorAll('.accordion-head').forEach(head => {
    head.addEventListener('click', () => {
      const item = head.parentElement;
      const isOpen = item.classList.toggle('is-open');
      head.setAttribute('aria-expanded', isOpen);
    });
  });


  /* ---------- VK VIDEO: lazy-embed ----------
     В data-video-id принимается:
       1) "OWNER_ID_VIDEO_ID" — например "-12345_67890" (для группы) или
          "12345_67890" (для пользователя). Это та часть ссылки, что идёт
          после /video, например в https://vkvideo.ru/video-12345_67890
          ID будет "-12345_67890".
       2) Полная ссылка VK — JS сам выдернет нужный фрагмент:
          "https://vk.com/video-12345_67890" → "-12345_67890"
          "https://vkvideo.ru/video-12345_67890?list=abc" → тоже работает.
     Дополнительно поддерживается data-video-hash="..." для приватных
     видео, требующих хэш для встраивания. */
  function parseVkId(raw) {
    if (!raw) return null;
    const m = String(raw).match(/video(-?\d+_\d+)/);   // из URL
    if (m) return m[1];
    if (/^-?\d+_\d+$/.test(raw)) return raw;            // уже oid_vid
    return null;
  }

  function mountVkVideos() {
    document.querySelectorAll('.vk-video-card').forEach(card => {
      const raw  = (card.dataset.videoId   || '').trim();
      const hash = (card.dataset.videoHash || '').trim();
      const slot = card.querySelector('.video-frame');
      if (!slot || slot.dataset.mounted) return;

      const id = parseVkId(raw);
      if (!id) {
        slot.classList.add('is-empty');
        slot.dataset.mounted = 'true';
        return;
      }

      const [oid, vid] = id.split('_');
      let src = `https://vk.com/video_ext.php?oid=${encodeURIComponent(oid)}` +
                `&id=${encodeURIComponent(vid)}&hd=2&autoplay=0`;
      if (hash) src += `&hash=${encodeURIComponent(hash)}`;

      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = card.querySelector('.video-title')?.textContent || 'VK видео';
      iframe.loading = 'lazy';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      slot.appendChild(iframe);
      slot.dataset.mounted = 'true';
    });
  }

  /* ---------- YOUTUBE: lazy-embed ---------- */
  function mountYtVideos() {
    document.querySelectorAll('.yt-video-card').forEach(card => {
      const id = (card.dataset.videoId || '').trim();
      const slot = card.querySelector('.video-frame');
      if (!slot || slot.dataset.mounted) return;
      if (!id) { slot.classList.add('is-empty'); slot.dataset.mounted = 'true'; return; }

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`;
      iframe.title = card.querySelector('.video-title')?.textContent || 'YouTube видео';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      slot.appendChild(iframe);
      slot.dataset.mounted = 'true';
    });
  }

  mountVkVideos();
  mountYtVideos();


  /* ---------- СЛАЙДЕР ----------
     Поддерживает два способа задать слайды:
       1) data-photos="url1, url2, url3" на .slider__track (удобно для массовой замены)
       2) Готовые <div class="slider__slide"> (совместимо со старым форматом)
     Точки, счётчик 01/N и свайп — автоматически. */
  class Slider {
    constructor(root) {
      this.root = root;
      this.viewport = root.querySelector('.slider__viewport');
      this.track = root.querySelector('[data-slider-track]');
      this.prevBtn = root.querySelector('.slider__btn--prev');
      this.nextBtn = root.querySelector('.slider__btn--next');
      this.dotsWrap = root.querySelector('[data-slider-dots]');
      this.counter = root.querySelector('[data-slider-counter]');
      this.index = 0;

      this._buildSlidesFromPhotos();     // если есть data-photos — построим слайды
      this.slides = Array.from(this.track.children);
      this.total = this.slides.length;

      this._buildDots();
      this._bind();
      this._update();
      this._bindMobileHeight();
    }

    _buildSlidesFromPhotos() {
      const raw = (this.track.dataset.photos || '').trim();
      if (!raw) return;
      const urls = raw.split(',').map(s => s.trim()).filter(Boolean);
      if (!urls.length) return;

      this.track.innerHTML = '';
      urls.forEach((url, i) => {
        const slide = document.createElement('div');
        slide.className = 'slider__slide';
        slide.dataset.label = `Фото ${String(i + 1).padStart(2, '0')}`;

        // <img> вместо background-image — это даёт object-fit: contain
        // и нативный fallback на alt-текст. Картинка вписывается в слайд
        // полностью, вертикальные фото не обрезаются.
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Фото ${i + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        slide.appendChild(img);

        this.track.appendChild(slide);
      });
    }

    _buildDots() {
      if (!this.dotsWrap) return;
      this.dotsWrap.innerHTML = '';
      this.dots = [];
      for (let i = 0; i < this.total; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__dot';
        dot.setAttribute('aria-label', `Слайд ${i + 1}`);
        dot.addEventListener('click', () => this.goTo(i));
        this.dotsWrap.appendChild(dot);
        this.dots.push(dot);
      }
    }

    _bind() {
      this.prevBtn && this.prevBtn.addEventListener('click', () => this.prev());
      this.nextBtn && this.nextBtn.addEventListener('click', () => this.next());

      // Клавиатура (когда фокус на слайдере)
      this.root.setAttribute('tabindex', '0');
      this.root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); this.prev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      });

      // Свайп
      let startX = 0, startY = 0, active = false;
      const THRESHOLD = 40;

      const onStart = (e) => {
        const t = e.touches ? e.touches[0] : e;
        startX = t.clientX; startY = t.clientY; active = true;
      };
      const onMove = (e) => {
        if (!active) return;
        const t = e.touches ? e.touches[0] : e;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dy) > Math.abs(dx)) { active = false; }
      };
      const onEnd = (e) => {
        if (!active) return;
        const t = (e.changedTouches ? e.changedTouches[0] : e);
        const dx = t.clientX - startX;
        if (dx >  THRESHOLD) this.prev();
        if (dx < -THRESHOLD) this.next();
        active = false;
      };
      this.track.addEventListener('touchstart', onStart, { passive: true });
      this.track.addEventListener('touchmove',  onMove,  { passive: true });
      this.track.addEventListener('touchend',   onEnd,   { passive: true });
    }

    goTo(i) {
      if (!this.total) return;
      this.index = (i + this.total) % this.total;
      this._update();
    }
    prev() { this.goTo(this.index - 1); }
    next() { this.goTo(this.index + 1); }

    _update() {
      this.track.style.transform = `translate3d(${-this.index * 100}%, 0, 0)`;
      if (this.dots) {
        this.dots.forEach((d, i) => d.classList.toggle('is-active', i === this.index));
      }
      if (this.counter && this.total) {
        const pad = (n) => String(n).padStart(2, '0');
        this.counter.textContent = `${pad(this.index + 1)} / ${pad(this.total)}`;
      }
      this._syncMobileHeight();
    }

    /* На мобильной высота viewport'а подгоняется под текущий слайд,
       чтобы у горизонтальных фото не было пустых полей сверху/снизу. */
    _isMobile() {
      return window.matchMedia('(max-width: 640px)').matches;
    }
    _syncMobileHeight() {
      if (!this.viewport) return;
      if (!this._isMobile()) {
        // На десктопе вернуть управление CSS (aspect-ratio: 16/9)
        this.viewport.style.height = '';
        return;
      }
      const cur = this.slides[this.index];
      if (!cur) return;
      const apply = () => {
        // offsetHeight уже учитывает min-height и реальную высоту картинки
        const h = cur.offsetHeight;
        if (h) this.viewport.style.height = h + 'px';
      };
      const img = cur.querySelector('img');
      if (img && !img.complete) {
        img.addEventListener('load',  apply, { once: true });
        img.addEventListener('error', apply, { once: true });
      }
      apply();
    }
    _bindMobileHeight() {
      // Ресайз и смена ориентации — пересчитать высоту
      let raf = null;
      const onResize = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => this._syncMobileHeight());
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
    }
  }
  document.querySelectorAll('[data-slider]').forEach(el => new Slider(el));

})();
