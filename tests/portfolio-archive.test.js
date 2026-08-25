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
    'seoul-1147': ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png'],
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
    '서울 1147': ['seoul-1147/1.png', 'seoul-1147/2.png', 'seoul-1147/3.png', 'seoul-1147/4.png', 'seoul-1147/5.png', 'seoul-1147/6.png', 'seoul-1147/7.png'],
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
    ...['1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png'].map((file) => `seoul-1147/${file}`),
    ...['1.png', '2.png', '3.png', '4.png'].map((file) => `bupum-jejak/${file}`),
  ];

  for (const relative of pngs) {
    const buffer = fs.readFileSync(path.join(root, 'assets/projects', relative));
    assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${relative} is a PNG`);
    assert.deepEqual([buffer.readUInt32BE(16), buffer.readUInt32BE(20)], [1440, 900], `${relative} is 1440x900`);
  }
});

test('Seoul 1147 uses the approved screenshot set with a Gwanghwamun lead image', () => {
  const seoul = projectChunks().find((chunk) => chunk.includes('<h3>서울 1147'));
  const approvedHashes = {
    '1.png': 'd7aa3e51a392c7f0d437615016b7572f938e20cc28714a5f5b127c170604964c',
    '2.png': '35d6faefa821628b9099ff6a60201444ade70a5edeaee259696840ccc053a99f',
    '3.png': '6d45694c648c447b1f7b5ba7f06f10da1a64c435a3918278372bced7b51c8a44',
    '4.png': 'c3f72cd2c3e3ac537e2dd30f401a72af082d79ad92e28b7f04d46ae2de1a3efe',
    '5.png': '7fdb767b077754bc09072830fff20d95366d670e454a73f4bc89f05079c85754',
    '6.png': '91cfde4b2489d5828e33c5004b70f2d1aeb4405a2fa30babcc1798b9fe1a84c4',
    '7.png': '0b7c53248d033f74134d7fc67e99cf26fc2934e5332dcb7c93a3b1ae3d2f2e93',
  };
  const approvedAltText = [
    '광화문과 세종대왕상을 담은 서울 1147의 3D 야경 대표 화면',
    'BTS 다이너마이트 빌보드와 라이브 가수가 있는 서울 1147 K-팝 무대',
    'BTS 다이너마이트 음악과 함께 진행하는 K-팝 버스킹 리듬 게임',
    '자신감 포즈를 선택한 서울 셀프 포토 스튜디오 화면',
    '떡볶이 어묵 소주를 선택하는 서울 포장마차 주문 화면',
    'K-뷰티 제품 여섯 종을 체험하는 서울 1147 올리브영 매장 내부',
    '올리브영 토리든 다이브인 세럼 제품 상세와 구매 화면',
  ];

  assert.ok(seoul, '서울 1147 project exists');
  assert.match(seoul, /광화문·K-팝 라이브 무대·포장마차·셀프 포토 스튜디오·올리브영/);
  assert.match(seoul, /BTS 음악이 이어지는 K-팝 리듬 무대/);
  approvedAltText.forEach((alt) => assert.ok(seoul.includes(`alt="${alt}"`), `${alt} stays descriptive`));

  for (const [filename, expectedHash] of Object.entries(approvedHashes)) {
    const screenshot = fs.readFileSync(path.join(root, 'assets/projects/seoul-1147', filename));
    const actualHash = crypto.createHash('sha256').update(screenshot).digest('hex');
    assert.equal(actualHash, expectedHash, `${filename} matches the approved capture`);
  }
});

test('the generated project carousel keeps navigation, counters, and lightbox wiring', () => {
  assert.ok(html.includes("function set(n){ci=(n+slides.length)%slides.length"));
  assert.ok(html.includes("b.addEventListener('click',()=>set(k))"));
  assert.ok(html.includes("set(ci+(+b.dataset.d))"));
  assert.ok(html.includes("curEl.textContent=String(ci+1).padStart(2,'0')"));
  assert.ok(html.includes("window.__lbOpenList(slides.map(s=>s.src),ci)"));
});

test('Mukbang Yogi includes a browser-compatible mixed-media demo slide', () => {
  const mukbang = projectChunks().find((chunk) => chunk.includes('<h3>먹방요기'));
  const videoSource = 'assets/projects/mukbang/demo.mp4';
  const posterSource = 'assets/projects/mukbang/demo-poster.jpg';

  assert.ok(mukbang.includes(`src="${videoSource}"`));
  assert.ok(mukbang.includes(`poster="${posterSource}"`));
  assert.match(mukbang, /<video[^>]*controls[^>]*playsinline[^>]*preload="metadata"/);
  assert.ok(fs.existsSync(path.join(root, videoSource)));
  assert.ok(fs.existsSync(path.join(root, posterSource)));
  assert.match(appJs, /querySelectorAll\('\.ebody img, \.ebody video'\)/);
  assert.match(appJs, /data-detail-media/);
  assert.match(appCss, /\.detail-stage video\.is-active/);
});

test('the portfolio home is reduced to exactly three overview scenes', () => {
  assert.equal((html.match(/<article class="home-scene/g) || []).length, 3);
  assert.match(
    html,
    /data-scene-target="intro"[^>]*><span>01<\/span> 소개<\/button>[\s\S]*?data-scene-target="awards"[^>]*><span>02<\/span> 수상<\/button>[\s\S]*?data-scene-target="projects"[^>]*><span>03<\/span> 프로젝트<\/button>/,
  );
  assert.match(
    html,
    /data-scene="intro"[\s\S]*?data-scene="awards"[\s\S]*?data-scene="projects"/,
  );
  assert.match(html, /data-scene-jump="awards">\s*수상 보기/);
  assert.match(html, /02 · Recognition/);
  assert.match(html, /03 · Selected Work/);
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

test('the AX talent war award includes the supplied hackathon photo', () => {
  const axAward = awards.split('<!-- 02 2026 AX 인재전쟁 해커톤 본선 -->')[1]
    .split('<!-- 03 2026 교내 해커톤 우수상 -->')[0];
  const source = 'assets/projects/ax-talent-war/1.jpg';
  const alt = '2026 AX 인재전쟁 해커톤 현장에서 인터뷰하는 이윤수';

  assert.ok(axAward.includes(`src="${source}"`));
  assert.ok(axAward.includes(`alt="${alt}"`));
  assert.ok(fs.existsSync(path.join(root, source)));
});

test('the school hackathon uses the supplied photo only on its overview card', () => {
  const schoolAward = awards.split('<!-- 03 2026 교내 해커톤 우수상 -->')[1]
    .split('<!-- 04 K-AI Contents Award 본선 -->')[0];
  const overviewSource = 'assets/projects/school-hackathon/card.jpg';

  assert.ok(appJs.includes(`overviewImage: '${overviewSource}'`));
  assert.ok(fs.existsSync(path.join(root, overviewSource)));
  assert.ok(schoolAward.includes('src="assets/hackathon-2026.jpg"'));
  assert.ok(!schoolAward.includes(overviewSource));
});

test('the Yogiyo hackathon shows its winner photo and 186-team grand prize result', () => {
  const mukbang = projectChunks().find((chunk) => chunk.includes('<h3>먹방요기'));
  const yogiyoAward = awards.split('<!-- 05 요기요 X 오라클 해커톤 최우수상 -->')[1];
  const source = 'assets/projects/yogiyo-hackathon/1.jpg';
  const alt = '2026 요기요 × 오라클 AI 해커톤 최우수상 수상 기념사진';

  assert.match(mukbang, /186개 팀 중 본선 8팀[^<]*<\/b>에 선정된 뒤[^]*최우수상\(1위 · 상금 200만원\)/);
  assert.match(yogiyoAward, /186개 팀 중 본선 8팀[^<]*<\/b>에 선정된 뒤[^]*최우수상\(1위 · 상금 200만원\)/);
  assert.match(yogiyoAward, /상금 200만원/);
  assert.ok(yogiyoAward.includes(`src="${source}"`));
  assert.ok(yogiyoAward.includes(`alt="${alt}"`));
  assert.ok(fs.existsSync(path.join(root, source)));
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root, source))).digest('hex'),
    'f00481fc73d875bba706ae44d28b8709fa01340c74cea86aa0a45be8b5f66477',
  );
  assert.match(appJs, /'05': \{[\s\S]*?rank: '최종 1위'[\s\S]*?status: 'GRAND WINNER'[\s\S]*?winner: true[\s\S]*?photo: true/);
  assert.match(appJs, /proof: '최우수상 · 상금 200만원'/);
  assert.match(appJs, /if \(highlight\.metrics\?\.length\) button\.classList\.add\('has-metrics'\)/);
  assert.match(appJs, /\{ value: '186팀', label: '참가 규모' \}[\s\S]*?\{ value: '8팀', label: '본선 진출' \}[\s\S]*?\{ value: '1위', label: '최종 순위' \}/);
  assert.match(appJs, /photoPosition: 'center 48%'/);
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
  const codegateAward = awards
    .split('<!-- 01 2026 코드게이트 AI 스타트업 해커톤 최종 1위 -->')[1]
    .split('<!-- 02 2026 AX 인재전쟁 해커톤 본선 -->')[0];

  for (const result of ['부문 1위', '우수상', '본선']) {
    assert.ok(appJs.includes(`rank: '${result}'`), `${result} is surfaced`);
  }
  assert.equal((appJs.match(/rank: '최종 1위'/g) || []).length, 2);
  assert.match(codegateAward, /최종 1위 · 193팀 중 1등/);
  assert.doesNotMatch(codegateAward, /종합 1위/);

  assert.match(appJs, /button\.dataset\.result = highlight\.rank/);
  assert.match(appJs, /award-card-rank/);
  assert.match(appJs, /'02': \{[^}]*photo: true/);
  assert.match(appJs, /const cardImageSource = highlight\.overviewImage/);
  assert.match(appJs, /\(highlight\.featured \|\| highlight\.photo\) \? award\.images\[0\]\?\.src/);
  assert.match(appJs, /const awardOverviewOrder = \['01', '05', '02', '03', '04'\]/);
  assert.match(appCss, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(appCss, /\.award-card:nth-child\(-n\+2\)\{grid-column:span 3\}/);
  assert.doesNotMatch(appCss, /\.award-card:first-child\{[\s\S]*?grid-row:span 2/);
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
  assert.match(appCss, /\.detail-stage img\.is-active,[\s\S]*?\.detail-stage video\.is-active\{opacity:1;pointer-events:auto;z-index:1\}/);
});
