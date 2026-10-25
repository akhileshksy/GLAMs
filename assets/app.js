/* Sangrah — GLAMs of India. Plain JS, no build step. */
(() => {
  'use strict';

  // ── Config: set your repo so the "Add an institution" links point at it ──
  const REPO = 'YOUR-USERNAME/glam-india';

  const TYPES = [
    { id: 'museum',  label: 'Museums',   one: 'Museum' },
    { id: 'library', label: 'Libraries', one: 'Library' },
    { id: 'archive', label: 'Archives',  one: 'Archive' },
    { id: 'gallery', label: 'Galleries', one: 'Gallery' }
  ];
  const TYPE_ONE = Object.fromEntries(TYPES.map(t => [t.id, t.one]));

  const $ = (s, el = document) => el.querySelector(s);
  const state = { data: [], type: '', q: '', st: '', sort: 'name', view: 'grid' };
  let map, layer;

  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  // ── Theme ──
  $('#theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // ── Repo links ──
  $('#gh-issue').href = `https://github.com/${REPO}/issues/new?template=add-institution.yml`;
  $('#gh-repo').href = `https://github.com/${REPO}`;

  // ── Load ──
  fetch('data/glams.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(() => {
      $('#results').innerHTML = '<p class="empty">Could not load <code>data/glams.json</code>. If you opened this file directly, run a local server (for example <code>python3 -m http.server</code>) and visit <code>localhost:8000</code>.</p>';
    });

  function init(data) {
    state.data = data.map(d => ({ ...d, _s: norm([d.name, d.city, d.state, d.summary, (d.tags || []).join(' '), d.type, (d.also || []).join(' ')].join(' ')) }));
    buildStats();
    buildChips();
    buildStates();
    readHash();
    bind();
    initMap();
    render();
  }

  function buildStats() {
    document.querySelectorAll('.stat').forEach(el => {
      const n = state.data.filter(d => d.type === el.dataset.type).length;
      const dd = $('dd', el);
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { dd.textContent = n; return; }
      const t0 = performance.now(), dur = 900;
      const tick = t => { const p = Math.min(1, (t - t0) / dur); dd.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }

  function buildChips() {
    const box = $('#type-chips');
    const all = [{ id: '', label: 'All' }, ...TYPES];
    box.innerHTML = all.map(t => {
      const n = t.id ? state.data.filter(d => d.type === t.id).length : state.data.length;
      return `<button type="button" class="chip" data-t="${t.id}" aria-pressed="false" ${t.id ? `style="--c:var(--${t.id})"` : ''}>${t.id ? '<i></i>' : ''}${t.label} <span class="n">${n}</span></button>`;
    }).join('');
    box.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      state.type = b.dataset.t; render();
    });
  }

  function buildStates() {
    const states = [...new Set(state.data.map(d => d.state))].sort();
    $('#state').insertAdjacentHTML('beforeend', states.map(s => `<option>${esc(s)}</option>`).join(''));
  }

  function bind() {
    $('#q').addEventListener('input', e => { state.q = e.target.value; render(); });
    $('#state').addEventListener('change', e => { state.st = e.target.value; render(); });
    $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
    $('#v-grid').addEventListener('click', () => { state.view = 'grid'; render(); });
    $('#v-list').addEventListener('click', () => { state.view = 'list'; render(); });
    $('#reset').addEventListener('click', () => { Object.assign(state, { type: '', q: '', st: '', sort: 'name' }); render(); });
    $('#csv').addEventListener('click', downloadCsv);
    $('#results').addEventListener('click', e => {
      const c = e.target.closest('.card'); if (c) openDetail(c.dataset.id);
    });
    $('#detail').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    addEventListener('hashchange', () => { readHash(); render(false); });
  }

  // ── Shareable state in the URL hash, e.g. #type=museum&state=Kerala&q=bronze ──
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (![...p.keys()].some(k => ['type', 'state', 'q', 'sort', 'view'].includes(k))) return;
    state.type = p.get('type') || '';
    state.st = p.get('state') || '';
    state.q = p.get('q') || '';
    state.sort = p.get('sort') || 'name';
    state.view = p.get('view') === 'list' ? 'list' : 'grid';
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.type) p.set('type', state.type);
    if (state.st) p.set('state', state.st);
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'name') p.set('sort', state.sort);
    if (state.view === 'list') p.set('view', 'list');
    const h = p.toString();
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
  }

  function filtered() {
    const q = norm(state.q).trim().split(/\s+/).filter(Boolean);
    let out = state.data.filter(d =>
      (!state.type || d.type === state.type || (d.also || []).includes(state.type)) &&
      (!state.st || d.state === state.st) &&
      q.every(w => d._s.includes(w)));
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      oldest: (a, b) => (a.year ?? 9999) - (b.year ?? 9999),
      newest: (a, b) => (b.year ?? -1) - (a.year ?? -1),
      state: (a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name)
    }[state.sort];
    return out.sort(by);
  }

  function render(write = true) {
    const list = filtered();
    $('#q').value = state.q;
    $('#state').value = state.st;
    $('#sort').value = state.sort;
    document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.t === state.type)));
    $('#v-grid').setAttribute('aria-pressed', String(state.view === 'grid'));
    $('#v-list').setAttribute('aria-pressed', String(state.view === 'list'));
    const box = $('#results');
    box.className = 'grid' + (state.view === 'list' ? ' list' : '');
    box.innerHTML = list.map((d, i) => `
      <button type="button" class="card" data-id="${esc(d.id)}" data-type="${d.type}" style="animation-delay:${Math.min(i, 12) * 25}ms">
        <span class="badge">${TYPE_ONE[d.type]}${(d.also || []).length ? ' + ' + d.also.map(a => TYPE_ONE[a]).join(' + ') : ''}</span>
        <h3>${esc(d.name)}</h3>
        <span class="meta"><span>${esc(d.city)}, ${esc(d.state)}</span>${d.year ? `<span>Est. ${d.year}</span>` : ''}</span>
        <p>${esc(d.summary)}</p>
        <span class="tags">${(d.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</span>
      </button>`).join('');
    $('#empty').hidden = list.length > 0;
    $('#result-count').textContent = `${list.length} of ${state.data.length} institutions`;
    updateMap(list);
    if (write) writeHash();
  }

  function openDetail(id) {
    const d = state.data.find(x => x.id === id); if (!d) return;
    const u = safeUrl(d.url);
    const osm = `https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=16/${d.lat}/${d.lng}`;
    $('#d-body').innerHTML = `
      <div class="card" data-type="${d.type}" style="all:unset;display:block;--c:var(--${d.type})">
        <span class="badge" style="color:var(--${d.type});font:700 12px var(--body);letter-spacing:.08em;text-transform:uppercase">${TYPE_ONE[d.type]}${(d.also || []).length ? ' + ' + d.also.map(a => TYPE_ONE[a]).join(' + ') : ''}</span>
        <h3 id="d-title" style="font-size:28px;margin:6px 0 4px">${esc(d.name)}</h3>
      </div>
      <p>${esc(d.summary)}</p>
      <dl class="d-facts">
        <dt>Location</dt><dd>${esc(d.city)}, ${esc(d.state)}</dd>
        ${d.year ? `<dt>Established</dt><dd>${d.year}</dd>` : ''}
        ${u ? `<dt>Website</dt><dd><a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a></dd>` : ''}
        <dt>Topics</dt><dd>${(d.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</dd>
      </dl>
      <div class="d-actions">
        ${u ? `<a class="btn primary" href="${esc(u)}" target="_blank" rel="noopener">Visit website</a>` : ''}
        <a class="btn" href="${osm}" target="_blank" rel="noopener">Open in OpenStreetMap</a>
        <a class="btn" href="https://github.com/${REPO}/issues/new?template=add-institution.yml&title=${encodeURIComponent('Correction: ' + d.name)}" target="_blank" rel="noopener">Suggest a correction</a>
      </div>`;
    $('#detail').showModal();
  }

  // ── Map ──
  function initMap() {
    if (typeof L === 'undefined') { $('#map').innerHTML = '<p class="empty">Map unavailable offline.</p>'; return; }
    map = L.map('map', { scrollWheelZoom: false }).setView([22.5, 79], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());
  }
  function updateMap(list) {
    if (!map) return;
    layer.clearLayers();
    const colors = { museum: '#2B3A8C', library: '#0E6A5B', archive: '#855400', gallery: '#A3204F' };
    list.forEach(d => {
      const icon = L.divIcon({ className: '', html: `<div class="pin" style="--c:${colors[d.type]}"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker([d.lat, d.lng], { icon, title: d.name }).addTo(layer)
        .bindPopup(`<b>${esc(d.name)}</b><br>${esc(d.city)}, ${esc(d.state)}<br><a href="#" data-open="${esc(d.id)}">Details</a>`);
    });
    if (list.length) map.fitBounds(L.latLngBounds(list.map(d => [d.lat, d.lng])).pad(0.15), { maxZoom: 9 });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-open]');
    if (a) { e.preventDefault(); openDetail(a.dataset.open); }
  });

  // ── CSV export of the current filtered set ──
  function downloadCsv() {
    const cols = ['name', 'type', 'city', 'state', 'year', 'url', 'lat', 'lng', 'summary'];
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = [cols.join(','), ...filtered().map(d => cols.map(c => q(d[c])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'glams-india.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
