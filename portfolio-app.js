(() => {
  const app = document.getElementById('portfolio-app');
  const home = document.getElementById('portfolio-home');
  const detail = document.getElementById('portfolio-detail');
  const detailScroll = detail?.querySelector('.portfolio-detail-scroll');
  const detailContent = document.getElementById('portfolio-detail-content');
  const projectOverview = document.getElementById('project-overview');
  const awardOverview = document.getElementById('award-overview');
  const work = document.getElementById('work');
  const awardsSource = document.getElementById('awards');

  if (!app || !home || !detail || !detailContent || !projectOverview || !awardOverview || !work || !awardsSource) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const text = (element) => element?.textContent.replace(/\s+/g, ' ').trim() || '';

  const titleParts = (entry) => {
    const heading = entry.querySelector('.etitle h3');
    const subtitle = text(heading?.querySelector('.en'));
    const clone = heading?.cloneNode(true);
    clone?.querySelectorAll('.en').forEach((node) => node.remove());
    return { title: text(clone), subtitle };
  };

  const collectItem = (entry, type) => {
    const { title, subtitle } = titleParts(entry);
    const id = text(entry.querySelector('.eindex'));
    const description = entry.querySelector('.etitle .desc')?.innerHTML.trim() || '';
    const features = [...entry.querySelectorAll('.feats li')].map((item) => item.innerHTML.trim());
    const tags = [...entry.querySelectorAll('.metarow .tech .tag')].map(text).filter(Boolean);
    const chips = [...entry.querySelectorAll('.especs .chip')].map(text).filter(Boolean);
    const links = [...entry.querySelectorAll('.metarow .links a')].map((link) => ({
      href: link.getAttribute('href') || '#',
      label: text(link).replace(/↗/g, '').trim(),
    }));
    const images = [...entry.querySelectorAll('.ebody img')].map((image) => ({
      src: image.getAttribute('src') || '',
      alt: image.getAttribute('alt') || `${title} 화면`,
    })).filter((image) => image.src);

    return { type, id, title, subtitle, description, features, tags, chips, links, images };
  };

  const projects = [...work.querySelectorAll('.entry:not([data-portfolio-status="archived"])')]
    .map((entry) => collectItem(entry, 'project'));
  const awards = [...awardsSource.querySelectorAll(':scope > .wrap > .entry')]
    .map((entry) => collectItem(entry, 'award'));
  const catalog = { project: projects, award: awards };

  if (!projects.length || !awards.length) return;

  let currentDetail = null;
  let currentSlide = 0;
  let lastTrigger = null;

  const createProjectCard = (project) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project-card';
    button.dataset.open = `project:${project.id}`;
    button.setAttribute('aria-label', `${project.id}. ${project.title} 프로젝트 자세히 보기`);

    const image = document.createElement('img');
    image.src = project.images[0]?.src || 'assets/me.png';
    image.alt = '';
    image.loading = 'lazy';

    const copy = document.createElement('span');
    copy.className = 'project-card-copy';
    copy.innerHTML = `<span class="project-card-index">${escapeHtml(project.id)}</span><span class="project-card-title">${escapeHtml(project.title)}</span>`;

    button.append(image, copy);
    return button;
  };

  const createAwardCard = (award) => {
    const highlights = {
      '01': {
        rank: '종합 1위',
        proof: '193팀 중 1등',
        status: 'GRAND WINNER',
        featured: true,
        winner: true,
        metrics: [
          { value: '193팀', label: '참가 규모' },
          { value: '1위', label: '종합 순위' },
          { value: '2일', label: '무박 개발' },
        ],
      },
      '02': { rank: '부문 1위', proof: '5,300명 지원 · 최종 6인', status: 'CATEGORY WINNER', winner: true },
      '03': { rank: '우수상', proof: '출시 1주일 · 사용자 100명', status: 'EXCELLENCE' },
      '04': { rank: '본선', proof: 'Track B · AI 솔루션', status: 'FINALIST' },
      '05': { rank: 'TOP 8', proof: '본선 8팀 선정', status: 'FINALIST' },
    };
    const highlight = highlights[award.id] || {
      rank: award.chips[0] || '수상',
      proof: award.subtitle || 'Award',
      status: 'RECOGNITION',
    };
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'award-card';
    if (highlight.featured) button.classList.add('is-featured');
    if (highlight.winner) button.classList.add('is-winner');
    button.dataset.open = `award:${award.id}`;
    button.dataset.result = highlight.rank;
    button.setAttribute('aria-label', `${award.id}. ${award.title}, ${highlight.rank}, 자세히 보기`);
    const metrics = highlight.metrics?.length
      ? `<span class="award-card-metrics">${highlight.metrics.map((metric) => `
          <span><b>${escapeHtml(metric.value)}</b><small>${escapeHtml(metric.label)}</small></span>`).join('')}</span>`
      : '';
    const featuredImage = highlight.featured && award.images[0]
      ? `<img class="award-card-photo" src="${escapeHtml(award.images[0].src)}" alt="" loading="lazy">`
      : '';
    button.innerHTML = `
      ${featuredImage}
      <span class="award-card-top">
        <span class="award-card-index">AWARD ${escapeHtml(award.id)}</span>
        <span class="award-card-status">${escapeHtml(highlight.status)}</span>
      </span>
      <strong class="award-card-rank">${escapeHtml(highlight.rank)}</strong>
      <span class="award-card-content">
        ${metrics}
        <span class="award-card-copy">
          <strong class="award-card-title">${escapeHtml(award.title)}</strong>
          <span class="award-card-proof"><i aria-hidden="true">✦</i>${escapeHtml(highlight.proof)}</span>
        </span>
      </span>
      <span class="award-card-cta">자세히 보기 <span aria-hidden="true">↗</span></span>`;
    return button;
  };

  const renderOverview = () => {
    projectOverview.replaceChildren(...projects.map(createProjectCard));
    awardOverview.replaceChildren(...awards.map(createAwardCard));

    const projectCount = app.querySelector('.project-scene .scene-heading > p');
    const awardCount = app.querySelector('.award-scene .scene-heading > p');
    if (projectCount) projectCount.innerHTML = `<b>${projects.length}개</b>의 작업을 선택해 자세히 볼 수 있습니다.`;
    if (awardCount) awardCount.innerHTML = `<b>종합·부문 1위 2회</b>를 포함한 ${awards.length}개의 성과입니다.`;
  };

  const mediaMarkup = (item) => {
    if (!item.images.length) {
      return `
        <div class="detail-award-poster" aria-label="${escapeHtml(item.title)} 수상 요약">
          <span>${escapeHtml(item.id)} · Recognition</span>
          <div class="medal" aria-hidden="true">✦</div>
          <strong>${escapeHtml(item.subtitle || item.chips[0] || item.title)}</strong>
        </div>`;
    }

    const slides = item.images.map((image, index) => `
      <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" class="${index === 0 ? 'is-active' : ''}" loading="${index === 0 ? 'eager' : 'lazy'}" data-detail-image="${index}">`).join('');
    const controls = item.images.length > 1 ? `
      <div class="detail-controls">
        <button type="button" class="detail-arrow" data-slide-step="-1" aria-label="이전 이미지">‹</button>
        <button type="button" class="detail-arrow" data-slide-step="1" aria-label="다음 이미지">›</button>
        <div class="detail-dots">${item.images.map((_, index) => `<button type="button" class="detail-dot ${index === 0 ? 'is-active' : ''}" data-slide-index="${index}" aria-label="${index + 1}번 이미지"></button>`).join('')}</div>
        <div class="detail-count"><b>01</b> / ${String(item.images.length).padStart(2, '0')}</div>
      </div>` : '';

    return `<div class="detail-stage">${slides}</div>${controls}`;
  };

  const renderDetail = (item) => {
    const features = item.features.length
      ? `<ul class="detail-features">${item.features.map((feature) => `<li>${feature}</li>`).join('')}</ul>`
      : '';
    const tags = item.tags.length
      ? `<div class="detail-tags">${item.tags.map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
      : '';
    const links = item.links.length
      ? `<div class="detail-links">${item.links.map((link) => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} ↗</a>`).join('')}</div>`
      : '';

    detailContent.innerHTML = `
      <div class="detail-info">
        <p class="detail-type">${item.type === 'project' ? 'Project' : 'Award'} · ${escapeHtml(item.id)}</p>
        <h1 class="detail-title" tabindex="-1">${escapeHtml(item.title)}</h1>
        ${item.subtitle ? `<p class="detail-subtitle">${escapeHtml(item.subtitle)}</p>` : ''}
        ${item.description ? `<div class="detail-desc">${item.description}</div>` : ''}
        ${tags}
        ${features}
        ${links}
      </div>
      <div class="detail-media">${mediaMarkup(item)}</div>`;
  };

  const updateSlide = (next) => {
    if (!currentDetail?.images.length) return;
    currentSlide = (next + currentDetail.images.length) % currentDetail.images.length;
    detailContent.querySelectorAll('[data-detail-image]').forEach((image, index) => image.classList.toggle('is-active', index === currentSlide));
    detailContent.querySelectorAll('[data-slide-index]').forEach((dot, index) => dot.classList.toggle('is-active', index === currentSlide));
    const count = detailContent.querySelector('.detail-count b');
    if (count) count.textContent = String(currentSlide + 1).padStart(2, '0');
  };

  const findItem = (type, id) => catalog[type]?.find((item) => item.id === id);

  const routeFor = (item) => `#${item.type}-${item.id}`;

  const parseRoute = () => {
    const match = location.hash.match(/^#(project|award)-(\d{2})$/);
    if (!match) return null;
    const item = findItem(match[1], match[2]);
    return item || null;
  };

  const setSceneActive = (name) => {
    app.querySelectorAll('[data-scene-target]').forEach((button) => button.classList.toggle('is-active', button.dataset.sceneTarget === name));
  };

  const showScene = (name) => {
    const scene = home.querySelector(`[data-scene="${name}"]`);
    if (!scene) return;
    setSceneActive(name);
    home.scrollTo({
      top: scene.offsetTop,
      behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const closeLightbox = () => document.getElementById('lb')?.classList.remove('on');

  const showHome = ({ historyMode = null, restoreFocus = true } = {}) => {
    closeLightbox();
    currentDetail = null;
    currentSlide = 0;
    app.classList.remove('is-detail');
    detail.hidden = true;
    home.hidden = false;
    app.querySelector('[data-back]').hidden = true;
    document.title = '이윤수 — Flutter Developer';
    if (historyMode === 'replace') history.replaceState({ portfolioView: 'home' }, '', `${location.pathname}${location.search}`);
    if (historyMode === 'push') history.pushState({ portfolioView: 'home' }, '', `${location.pathname}${location.search}`);
    if (restoreFocus && lastTrigger?.isConnected) requestAnimationFrame(() => lastTrigger.focus());
  };

  const openDetail = (item, { push = false, direct = false, trigger = null } = {}) => {
    if (!item) return;
    closeLightbox();
    if (trigger) lastTrigger = trigger;
    currentDetail = item;
    currentSlide = 0;
    renderDetail(item);
    home.hidden = true;
    detail.hidden = false;
    app.classList.add('is-detail');
    app.querySelector('[data-back]').hidden = false;
    if (detailScroll) detailScroll.scrollTop = 0;
    document.title = `${item.title} — 이윤수 포트폴리오`;
    if (push) history.pushState({ portfolioView: 'detail', type: item.type, id: item.id, direct: false }, '', routeFor(item));
    if (direct) history.replaceState({ portfolioView: 'detail', type: item.type, id: item.id, direct: true }, '', routeFor(item));
    requestAnimationFrame(() => detailContent.querySelector('.detail-title')?.focus({ preventScroll: true }));
  };

  const goBack = () => {
    if (!currentDetail) return;
    if (history.state?.portfolioView === 'detail' && !history.state?.direct) history.back();
    else showHome({ historyMode: 'replace' });
  };

  const disableLegacy = () => {
    const generatedPortfolio = document.getElementById('portfolio');
    [document.querySelector('.hero2'), document.getElementById('showcase'), work, generatedPortfolio, awardsSource, document.getElementById('contact'), document.querySelector('footer')]
      .filter(Boolean)
      .forEach((node) => {
        node.setAttribute('aria-hidden', 'true');
        node.inert = true;
      });
  };

  app.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-open]');
    if (openButton) {
      const [type, id] = openButton.dataset.open.split(':');
      openDetail(findItem(type, id), { push: true, trigger: openButton });
      return;
    }

    const sceneButton = event.target.closest('[data-scene-target]');
    if (sceneButton) {
      showScene(sceneButton.dataset.sceneTarget);
      return;
    }

    const sceneJump = event.target.closest('[data-scene-jump]');
    if (sceneJump) {
      showScene(sceneJump.dataset.sceneJump);
      return;
    }

    if (event.target.closest('[data-back]')) {
      goBack();
      return;
    }

    if (event.target.closest('[data-home]')) {
      showHome({ historyMode: currentDetail ? 'replace' : null, restoreFocus: false });
      showScene('intro');
      return;
    }

    const stepButton = event.target.closest('[data-slide-step]');
    if (stepButton) {
      updateSlide(currentSlide + Number(stepButton.dataset.slideStep));
      return;
    }

    const dotButton = event.target.closest('[data-slide-index]');
    if (dotButton) {
      updateSlide(Number(dotButton.dataset.slideIndex));
      return;
    }

    const image = event.target.closest('[data-detail-image]');
    if (image && currentDetail?.images.length && window.__lbOpenList) {
      window.__lbOpenList(currentDetail.images.map((item) => item.src), Number(image.dataset.detailImage));
    }
  });

  addEventListener('popstate', () => {
    const route = parseRoute();
    if (route) openDetail(route);
    else showHome();
  });

  addEventListener('keydown', (event) => {
    if (document.getElementById('lb')?.classList.contains('on')) return;
    if (event.key === 'Escape' && currentDetail) {
      event.preventDefault();
      goBack();
    } else if (currentDetail?.images.length > 1 && event.key === 'ArrowLeft') {
      updateSlide(currentSlide - 1);
    } else if (currentDetail?.images.length > 1 && event.key === 'ArrowRight') {
      updateSlide(currentSlide + 1);
    }
  }, true);

  const sceneObserver = new IntersectionObserver((entries) => {
    if (currentDetail) return;
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.intersectionRatio >= .55) setSceneActive(visible.target.dataset.scene);
  }, { root: home, threshold: [.55, .75, .95] });

  home.querySelectorAll('[data-scene]').forEach((scene) => sceneObserver.observe(scene));

  renderOverview();
  disableLegacy();
  document.body.classList.add('portfolio-app-ready');

  const initialRoute = parseRoute();
  if (initialRoute) openDetail(initialRoute, { direct: true });
  else {
    history.replaceState({ portfolioView: 'home' }, '', `${location.pathname}${location.search}`);
    showHome({ restoreFocus: false });
  }
})();
