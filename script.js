// script.js - add live effects: typing heading, greeting, filter, and quick-check progress

document.addEventListener('DOMContentLoaded', () => {
  const heading = document.getElementById('main-heading');
  const greeting = document.getElementById('greeting');
  const search = document.getElementById('search');
  const navList = document.getElementById('nav-list');
  const startBtn = document.getElementById('start-btn');
  const progressBar = document.getElementById('progress-bar');
  const checkResult = document.getElementById('check-result');

  // 1) Typing effect for heading
  const fullText = 'Automation Workforce Management System';
  heading.textContent = '';
  let i = 0;
  const typingInterval = setInterval(() => {
    heading.textContent += fullText[i] || '';
    i++;
    if (i >= fullText.length) clearInterval(typingInterval);
  }, 28);

  // 2) Time-based greeting
  const now = new Date();
  const hr = now.getHours();
  let greet = 'Hello';
  if (hr < 12) greet = 'Good morning';
  else if (hr < 18) greet = 'Good afternoon';
  else greet = 'Good evening';
  greeting.textContent = `${greet}!`;

  // 3) Live filter for links
  search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    Array.from(navList.children).forEach(li => {
      const text = li.textContent.trim().toLowerCase();
      const match = q === '' || text.includes(q);
      li.style.display = match ? '' : 'none';
      // subtle highlight
      if (q && match) li.style.boxShadow = 'inset 0 0 0 3px rgba(0,102,204,0.06)';
      else li.style.boxShadow = '';
    });
  });

  // 4) Quick check simulation with progress
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    checkResult.textContent = 'Running quick-check...';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', 0);

    // simulate several steps
    const steps = [15, 35, 62, 88, 100];
    for (const pct of steps) {
      await tickTo(pct);
    }

    // final result
    progressBar.style.width = '100%';
    progressBar.setAttribute('aria-valuenow', 100);
    checkResult.innerHTML = 'Quick-check complete. <span style="color:var(--success);font-weight:700">All systems nominal</span>';
    startBtn.disabled = false;
  });

  function tickTo(target) {
    return new Promise(resolve => {
      const start = parseInt(progressBar.style.width) || 0;
      const delta = target - start;
      const duration = 400 + Math.random() * 300;
      const startTime = performance.now();

      function frame(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = easeOutCubic(t);
        const curr = Math.round(start + delta * eased);
        progressBar.style.width = curr + '%';
        progressBar.setAttribute('aria-valuenow', curr);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function easeOutCubic(t){return 1 - Math.pow(1 - t, 3)}

});

// Client-side offline Excel parsing and IndexedDB storage
document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('upload-form');
  const excelFile = document.getElementById('excel-file');
  const uploadStatus = document.getElementById('upload-status');
  const localFiles = document.getElementById('local-files');

  if (!uploadForm) return;

  // IndexedDB helper
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('awms-offline', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function addFileRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const r = store.add(record);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function getAllFiles() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  // Expose helper to other pages (reporting) to allow offline reporting from stored files
  window.awmsGetAllFiles = getAllFiles;

  async function deleteFile(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const r = store.delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  function renderList(items) {
    localFiles.innerHTML = '';
    if (!items.length) { localFiles.textContent = 'No files stored locally.'; return; }
    items.forEach(item => {
      const div = document.createElement('div'); div.className='panel'; div.style.marginBottom='10px';
      const meta = document.createElement('div'); meta.innerHTML = `<strong>${item.filename}</strong> <div class="item-meta">Uploaded: ${new Date(item.uploadedAt).toLocaleString()} • Sheets: ${item.sheets.length}</div>`;
      const actions = document.createElement('div'); actions.style.marginTop='8px';
      const viewBtn = document.createElement('button'); viewBtn.className='btn'; viewBtn.textContent='View Sheets';
      const dlBtn = document.createElement('button'); dlBtn.className='btn'; dlBtn.style.marginLeft='8px'; dlBtn.textContent='Download';
      const delBtn = document.createElement('button'); delBtn.className='danger'; delBtn.style.marginLeft='8px'; delBtn.textContent='Delete';
      actions.appendChild(viewBtn); actions.appendChild(dlBtn); actions.appendChild(delBtn);
      div.appendChild(meta); div.appendChild(actions);

      viewBtn.addEventListener('click', () => {
        const modal = document.createElement('div'); modal.className='panel';
        modal.style.marginTop='8px';
        item.sheets.forEach(s => {
          const sdiv = document.createElement('div'); sdiv.style.marginBottom='8px';
          sdiv.innerHTML = `<strong>${s.name}</strong> <div class="item-meta">Rows: ${s.rows.length}</div>`;
          if (s.rows.length) {
            const table = document.createElement('table'); table.style.width='100%'; table.style.borderCollapse='collapse';
            const headers = Object.keys(s.rows[0]);
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr>' + headers.map(h=>`<th style="text-align:left;padding:6px;border-bottom:1px solid #eee">${h}</th>`).join('') + '</tr>';
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            s.rows.slice(0,20).forEach(r=>{ tbody.innerHTML += '<tr>' + headers.map(h=>`<td style="padding:6px;border-bottom:1px solid #f6f8fb">${String(r[h] ?? '')}</td>`).join('') + '</tr>'; });
            table.appendChild(tbody);
            sdiv.appendChild(table);
          }
          modal.appendChild(sdiv);
        });
        div.appendChild(modal);
      });

      dlBtn.addEventListener('click', () => {
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a'); a.href = url; a.download = item.filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      });

      delBtn.addEventListener('click', async () => { if (!confirm('Delete this stored file?')) return; await deleteFile(item.id); await refreshList(); });

      localFiles.appendChild(div);
    });
  }

  async function refreshList(){ const items = await getAllFiles(); renderList(items); }

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = excelFile.files[0];
    if (!file) { uploadStatus.textContent = 'Please choose a file first.'; return; }
    uploadStatus.textContent = 'Parsing file...';
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheets = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
        return { name, rows };
      });
      // store blob and parsed sheets in IndexedDB
      const record = { filename: file.name, uploadedAt: Date.now(), sheets, blob: file };
      const id = await addFileRecord(record);
      uploadStatus.innerHTML = `Saved locally as #${id}. Sheets: ${sheets.map(s=>s.name).join(', ')}`;
      excelFile.value = '';
      await refreshList();
    } catch (err) {
      console.error(err); uploadStatus.textContent = 'Error parsing file.';
    }
  });

  // initial list
  refreshList();
});

// Additional features: Export all as ZIP, enhanced viewer with pagination/search, optional server upload
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('export-all');
  const serverToggle = document.getElementById('server-upload-toggle');
  const serverEndpointInput = document.getElementById('server-endpoint');

  async function exportAllZip() {
    if (typeof JSZip === 'undefined') return alert('JSZip not loaded.');
    const items = await getAllFiles();
    if (!items.length) return alert('No files to export');
    const zip = new JSZip();
    for (const it of items) {
      try { zip.file(it.filename, it.blob); } catch (e) { console.warn('zip add failed', e); }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    if (typeof saveAs === 'function') saveAs(content, 'awms-files.zip');
    else {
      const a = document.createElement('a'); const url = URL.createObjectURL(content); a.href = url; a.download = 'awms-files.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
  }

  exportBtn?.addEventListener('click', exportAllZip);

  // Enhanced viewer: use event delegation for 'View Sheets' buttons
  document.getElementById('local-files')?.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button'); if (!btn) return;
    if (btn.textContent === 'View Sheets') {
      const panel = btn.closest('.panel'); if (!panel) return;
      // Find index by filename + uploadedAt heuristics
      const txt = panel.querySelector('strong')?.textContent;
      const items = await getAllFiles();
      const item = items.find(i => i.filename === txt);
      if (!item) return alert('Stored file not found');
      openViewer(item);
    }
  });

  async function openViewer(item) {
    const modal = document.createElement('div'); modal.className='awms-modal';
    const inner = document.createElement('div'); inner.className='modal-inner';
    modal.appendChild(inner);

    inner.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2>${item.filename}</h2><div><button id="modal-close" class="btn">Close</button></div></div>`;

    const ctrl = document.createElement('div'); ctrl.className='controls';
    const sheetSel = document.createElement('select'); sheetSel.style.minWidth='220px'; item.sheets.forEach((s,idx)=>{ const o=document.createElement('option'); o.value=idx; o.textContent=s.name; sheetSel.appendChild(o); });
    const search = document.createElement('input'); search.placeholder='Search rows...'; search.style.flex='1'; search.style.padding='8px'; search.style.border='1px solid #e6eef8'; search.style.borderRadius='8px';
    const pageSize = document.createElement('select'); [10,20,50,100].forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=`${n}/page`; pageSize.appendChild(o); });
    const exportCsvBtn = document.createElement('button'); exportCsvBtn.className='btn'; exportCsvBtn.textContent='Export CSV';
    ctrl.appendChild(sheetSel); ctrl.appendChild(search); ctrl.appendChild(pageSize); ctrl.appendChild(exportCsvBtn);
    inner.appendChild(ctrl);

    const tableWrap = document.createElement('div'); tableWrap.style.marginTop='8px'; inner.appendChild(tableWrap);

    let currentRows = item.sheets[0].rows || [];
    let filtered = currentRows.slice();
    let page = 1;

    function renderTable() {
      const per = parseInt(pageSize.value,10);
      const total = Math.max(1, Math.ceil(filtered.length / per));
      if (page > total) page = total;
      const start = (page-1)*per; const chunk = filtered.slice(start, start+per);
      tableWrap.innerHTML = '';
      if (!chunk.length) { tableWrap.textContent = 'No rows match'; return; }
      const headers = Object.keys(chunk[0]);
      const table = document.createElement('table'); const thead = document.createElement('thead'); thead.innerHTML = '<tr>' + headers.map(h=>`<th>${h}</th>`).join('') + '</tr>'; table.appendChild(thead);
      const tbody = document.createElement('tbody'); chunk.forEach(r=>{ const tr = document.createElement('tr'); tr.innerHTML = headers.map(h=>`<td>${String(r[h] ?? '')}</td>`).join(''); tbody.appendChild(tr); }); table.appendChild(tbody);
      tableWrap.appendChild(table);
      const pager = document.createElement('div'); pager.style.marginTop='8px'; pager.innerHTML = `<button id="prev" class="btn">Prev</button> <span style="margin:0 8px">Page ${page} / ${total}</span> <button id="next" class="btn">Next</button>`;
      tableWrap.appendChild(pager);
      pager.querySelector('#prev').addEventListener('click', ()=>{ if (page>1) { page--; renderTable(); } });
      pager.querySelector('#next').addEventListener('click', ()=>{ if (page<total) { page++; renderTable(); } });
    }

    sheetSel.addEventListener('change', ()=>{ currentRows = item.sheets[parseInt(sheetSel.value,10)].rows || []; filtered = currentRows.slice(); page = 1; renderTable(); });
    pageSize.addEventListener('change', ()=>{ page = 1; renderTable(); });
    search.addEventListener('input', ()=>{ const q = search.value.trim().toLowerCase(); if(!q) filtered = currentRows.slice(); else filtered = currentRows.filter(r => JSON.stringify(r).toLowerCase().includes(q)); page = 1; renderTable(); });

    exportCsvBtn.addEventListener('click', ()=>{
      const rows = filtered;
      if (!rows.length) return alert('No rows to export');
      const headers = Object.keys(rows[0]);
      const lines = [headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(',')));
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a'); const url = URL.createObjectURL(blob); a.href = url; a.download = `${item.filename}-${item.sheets[sheetSel.value].name}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    inner.querySelector('#modal-close').addEventListener('click', ()=> modal.remove());
    document.body.appendChild(modal);
    // initial render
    currentRows = item.sheets[0].rows || []; filtered = currentRows.slice(); renderTable();
  }

  // When adding a file, also attempt server upload if enabled
  const origAdd = addFileRecord;
  window.addFileAndMaybeSync = async function(record) {
    const id = await origAdd(record);
    if (serverToggle && serverToggle.checked) {
      try {
        const ep = (serverEndpointInput?.value || '/upload') || '/upload';
        const form = new FormData();
        // record.blob may be File or Blob
        form.append('file', record.blob, record.filename);
        const r = await fetch(ep, { method: 'POST', body: form });
        if (!r.ok) console.warn('Server upload failed', r.status);
        else console.log('Server upload ok');
      } catch (err) { console.warn('Server upload error', err); }
    }
    return id;
  };

  // Patch upload flow to call addFileAndMaybeSync
  const oldUploadHandler = async function(e){};
  // replace the existing upload form listener by finding it and reattaching a wrapper
  const form = document.getElementById('upload-form');
  if (form) {
    const submitListeners = getEventListeners ? getEventListeners(form).submit : null;
    // remove existing listener by cloning (simple approach)
    const clone = form.cloneNode(true); form.parentNode.replaceChild(clone, form);
    clone.addEventListener('submit', async (e)=>{
      e.preventDefault(); const fileInput = clone.querySelector('#excel-file'); const file = fileInput.files[0]; if(!file) return document.getElementById('upload-status').textContent='Please choose a file first.';
      document.getElementById('upload-status').textContent='Parsing file...';
      try {
        const arrayBuffer = await file.arrayBuffer(); const workbook = XLSX.read(arrayBuffer, { type: 'array' }); const sheets = workbook.SheetNames.map(name=>{ const sheet=workbook.Sheets[name]; return { name, rows: XLSX.utils.sheet_to_json(sheet, { defval: null }) }; });
        const record = { filename: file.name, uploadedAt: Date.now(), sheets, blob: file };
        const id = await window.addFileAndMaybeSync(record);
        document.getElementById('upload-status').innerHTML = `Saved locally as #${id}. Sheets: ${sheets.map(s=>s.name).join(', ')}`;
        fileInput.value=''; await refreshList();
      } catch (err) { console.error(err); document.getElementById('upload-status').textContent='Error parsing file.'; }
    });
  }

});
