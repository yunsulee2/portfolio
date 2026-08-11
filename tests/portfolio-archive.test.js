const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'portfolio-app.js'), 'utf8');
const appCss = fs.readFileSync(path.join(root, 'portfolio-app.css'), 'utf8');
const work = html.split('<!-- WORK -->')[1].split('<!-- AWARDS -->')[0];
const awards = html.split('<!-- AWARDS -->')[1].split('<!-- CONTACT -->')[0];

function projectChunks() {
  return work
    .split(/(?=<div class="entry rev(?: archived-project)?")/)
    .slice(1);
}

function projectEntries() {
  return projectChunks()
    .map((chunk) => ({
      archived: /data-portfolio-status="archived"[^>]*hidden/.test(chunk.slice(0, 300)),
      index: (chunk.match(/<div class="eindex">(\d+)<\/div>/) || [])[1],
      title: ((chunk.match(/<h3>(.*?)<\/h3>/s) || [])[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    }));
}

test('the full-screen portfolio renderer excludes archived projects', () => {
  assert.ok(
    html.includes(
      "work.querySelectorAll('.entry:not([data-portfolio-status=\"archived\"])')",
    ),
  );
});

test('archived projects remain stored while only 15 projects are visible', () => {
  const projects = projectEntries();
  const visible = projects.filter((project) => !project.archived);
  const archived = projects.filter((project) => project.archived);

  assert.equal(projects.length, 19);
  assert.equal(visible.length, 15);
  assert.equal(archived.length, 4);
  assert.equal(visible.map((project) => project.index).join(','), '01,02,03,04,05,06,07,08,09,10,11,12,13,14,15');
  assert.deepEqual(
    archived.map((project) => project.title.split(' ')[0]),
    ['정부혜택', 'RUNA', '운동', 'GRIT'],
  );
});

test('the Work Index and runnable project links match the 15-project portfolio', () => {
  assert.match(work, /<span class="kr">15 Projects<\/span>/);

  const romance = projectChunks().find((chunk) => chunk.includes('<h3>연애 시뮬레이션'));
  const seoul = projectChunks().find((chunk) => chunk.includes('<h3>서울 1147'));
  const bupum = projectChunks().find((chunk) => chunk.includes('<h3>부품제작'));

  assert.ok(romance, '연애 시뮬레이션 project exists');
  assert.ok(seoul, '서울 1147 project exists');
  assert.ok(bupum, '부품제작 project exists');
  assert.match(romance, /href="https:\/\/openai-game-2026\.vercel\.app\/" target="_blank" rel="noopener noreferrer">Live Demo/);
  assert.match(seoul, /href="https:\/\/seoul-1147\.vercel\.app\/" target="_blank" rel="noopener noreferrer">Live Demo/);
  assert.match(bupum, /href="https:\/\/yunsulee2\.github\.io\/bupum-jejak\/" target="_blank" rel="noopener noreferrer">Live Demo/);
  assert.match(seoul, /href="https:\/\/github\.com\/yunsulee2\/seoul-1147"/);
  assert.match(bupum, /href="https:\/\/github\.com\/yunsulee2\/bupum-jejak"/);
  assert.match(romance, /chip live/);
  assert.match(seoul, /chip live/);
  assert.match(bupum, /chip live/);
});

test('the five requested projects expose complete, distinct screenshot sets', () => {
  const galleries = {
    'seoul-cctv': ['1.jpg', '2.png', '3.png'],
    'romance-simulation': ['1.png', '2.png', '3.png', '4.png'],
    'dosim-mulyu-hub': ['1.png', '2.png', '3.png', '4.png'],
    'seoul-1147': ['1.png', '2.png', '3.png', '4.png'],
    'bupum-jejak': ['1.png', '2.png', '3.png', '4.png'],
  };

  for (const [project, filenames] of Object.entries(galleries)) {
    const hashes = filenames.map((filename) => {
      const asset = `assets/projects/${project}/${filename}`;
      const absolute = path.join(root, asset);

      assert.ok(html.includes(`src="${asset}"`), `${asset} is referenced`);
      assert.ok(fs.existsSync(absolute), `${asset} exists`);
      return crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
    });

    assert.equal(new Set(hashes).size, filenames.length, `${project} screenshots are distinct`);
  }
});

test('requested screenshots stay in the intended card and order with accessible lazy loading', () => {
  const galleries = {
    '서울어린이대공원 통합관제': ['seoul-cctv/1.jpg', 'seoul-cctv/2.png', 'seoul-cctv/3.png'],
    '연애 시뮬레이션': ['romance-simulation/1.png', 'romance-simulation/2.png', 'romance-simulation/3.png', 'romance-simulation/4.png'],
    'MODAL SHIFT 2.0': ['dosim-mulyu-hub/1.png', 'dosim-mulyu-hub/2.png', 'dosim-mulyu-hub/3.png', 'dosim-mulyu-hub/4.png'],
    '서울 1147': ['seoul-1147/1.png', 'seoul-1147/2.png', 'seoul-1147/3.png', 'seoul-1147/4.png'],
    '부품제작': ['bupum-jejak/1.png', 'bupum-jejak/2.png', 'bupum-jejak/3.png', 'bupum-jejak/4.png'],
  };

  for (const [title, expected] of Object.entries(galleries)) {
    const chunk = projectChunks().find((candidate) => candidate.includes(`<h3>${title}`));
    assert.ok(chunk, `${title} card exists`);

    const images = [...chunk.matchAll(/<img src="assets\/projects\/([^"]+)" alt="([^"]+)" loading="lazy">/g)];
    assert.deepEqual(images.map((match) => match[1]), expected, `${title} image order`);
    assert.ok(images.every((match) => match[2].trim().length >= 8), `${title} images have descriptive alt text`);
  }

  const dosim = projectChunks().find((chunk) => chunk.includes('<h3>MODAL SHIFT 2.0'));
  const bupum = projectChunks().find((chunk) => chunk.includes('<h3>부품제작'));
  assert.match(dosim, /alt="[^"]*실제 3D 모델[^"]*"/);
  assert.match(bupum, /alt="최신 부품제작 생활 조립 스튜디오 홈 화면"/);
});

test('new PNG screenshots retain the portfolio capture resolution', () => {
  const pngs = [
    ...['2.png', '3.png'].map((file) => `seoul-cctv/${file}`),
    ...['2.png', '3.png', '4.png'].map((file) => `romance-simulation/${file}`),
    ...['2.png', '3.png', '4.png'].map((file) => `dosim-mulyu-hub/${file}`),
    ...['1.png', '2.png', '3.png', '4.png'].map((file) => `seoul-1147/${file}`),
    ...['1.png', '2.png', '3.png', '4.png'].map((file) => `bupum-jejak/${file}`),
  ];

  for (const relative of pngs) {
    const buffer = fs.readFileSync(path.join(root, 'assets/projects', relative));
    assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${relative} is a PNG`);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [1440, 900], `${relative} is 1440x900`);
  }
});

test('the generated project carousel keeps navigation, counters, and lightbox wiring', () => {
  assert.ok(html.includes("function set(n){ci=(n+slides.length)%slides.length"));
  assert.ok(html.includes("b.addEventListener('click',()=>set(k))"));
  assert.ok(html.includes("set(ci+(+b.dataset.d))"));
  assert.ok(html.includes("curEl.textContent=String(ci+1).padStart(2,'0')"));
  assert.ok(html.includes("window.__lbOpenList(slides.map(s=>s.src),ci)"));
});

test('the portfolio home is reduced to exactly three overview scenes', () => {
  assert.equal((html.match(/<article class="home-scene/g) || []).length, 3);
  assert.match(html, /data-scene="intro"/);
  assert.match(html, /data-scene="projects"/);
  assert.match(html, /data-scene="awards"/);
  assert.match(html, /id="project-overview"/);
  assert.match(html, /id="award-overview"/);
});

test('the overview reuses all 15 projects and all 5 awards as clickable detail sources', () => {
  assert.ok(appJs.includes("work.querySelectorAll('.entry:not([data-portfolio-status=\"archived\"])')"));
  assert.ok(appJs.includes("awardsSource.querySelectorAll(':scope > .wrap > .entry')"));
  assert.equal((awards.match(/<div class="entry rev">/g) || []).length, 5);
  assert.ok(appJs.includes("button.dataset.open = `project:${project.id}`"));
  assert.ok(appJs.includes("button.dataset.open = `award:${award.id}`"));
});

test('the project overview adds premium hierarchy without hiding the full catalog', () => {
  assert.match(appJs, /const isSpotlight = projectIndex < 5/);
  assert.match(appJs, /button\.classList\.toggle\('has-live', Boolean\(liveLink\)\)/);
  assert.match(appJs, /project-card-status/);
  assert.match(appJs, /project-card-subtitle/);
  assert.match(appJs, /project-card-open/);
  assert.match(appCss, /grid-template-rows:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(appCss, /\.project-card:nth-child\(-n\+5\)\{grid-row:span 2\}/);
  assert.match(appCss, /\.project-card:not\(\.is-spotlight\) \.project-card-foot > span:first-child\{display:none\}/);
  assert.match(appCss, /@media\(max-width:620px\)[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-template-rows:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(appCss, /@media\(max-width:620px\)[\s\S]*?\.project-card:nth-child\(-n\+5\)\{grid-row:auto\}/);
});

test('the award overview gives every placement a prominent result label', () => {
  for (const result of ['종합 1위', '부문 1위', '우수상', '본선', 'TOP 8']) {
    assert.ok(appJs.includes(`rank: '${result}'`), `${result} is surfaced`);
  }

  assert.match(appJs, /button\.dataset\.result = highlight\.rank/);
  assert.match(appJs, /award-card-rank/);
  assert.match(appCss, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(appCss, /\.award-card:first-child\{[\s\S]*?grid-row:span 2/);
});

test('project and award details support explicit and browser back navigation', () => {
  assert.match(html, /data-back[^>]*hidden/);
  assert.ok(appJs.includes("history.pushState({ portfolioView: 'detail'"));
  assert.ok(appJs.includes("addEventListener('popstate'"));
  assert.ok(appJs.includes("location.hash.match(/^#(project|award)-(\\d{2})$/)"));
  assert.ok(appJs.includes("if (event.key === 'Escape' && currentDetail)"));
  assert.ok(appJs.includes("history.back()"));
});

test('the main experience presents three full-screen scenes in a vertical scroll flow', () => {
  assert.match(appCss, /body\.portfolio-app-ready\{[\s\S]*?height:100dvh;[\s\S]*?overflow:hidden;/);
  assert.match(appCss, /scroll-snap-type:y mandatory/);
  assert.match(appCss, /\.home-scene\{[\s\S]*?height:100%;[\s\S]*?min-height:100%;/);
  assert.match(appCss, /scroll-snap-align:start/);
  assert.match(appJs, /home\.scrollTo\(\{[\s\S]*?top: scene\.offsetTop/);
  assert.doesNotMatch(appCss, /scroll-snap-type:x mandatory/);
  assert.match(appCss, /\.detail-stage img\.is-active\{opacity:1;pointer-events:auto;z-index:1\}/);
});
