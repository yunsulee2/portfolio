const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const work = html.split('<!-- WORK -->')[1].split('<!-- AWARDS -->')[0];

function projectEntries() {
  return work
    .split(/(?=<div class="entry rev(?: archived-project)?")/)
    .slice(1)
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
