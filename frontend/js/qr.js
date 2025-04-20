import {authFetch} from './auth.js';
import {API_BASE} from "./config.js";

let currentEditId = null;

export async function fetchAll () {
  const r = await authFetch(`${API_BASE}/qr_code/`);
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function createQr (name, link) {
  const qs = new URLSearchParams({ name, link });
  const r  = await authFetch(`${API_BASE}/qr_code/?${qs}`, { method: 'POST' });
  if (!r.ok) throw await r.json();
  return r.json();
}

export async function updateQr (id, name, link) {
  const qs = new URLSearchParams({ name, link });
  const r  = await authFetch(`${API_BASE}/qr_code/${id}?${qs}`, { method: 'PUT' });
  if (!r.ok) throw await r.json();
  return r.json();                        // updated QrCode
}

export async function deleteQr(id) {
  const res = await authFetch(`${API_BASE}/qr_code/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw await res.json();
  }
  return null;
}

export function qrImageUrl (id) {
  return `${API_BASE}/qr_code/${id}/image`;
}

export async function loadList () {
  const tbody = document.getElementById('list');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
  try {
    const data = await fetchAll();
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No QR-codes yet</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    data.forEach(q => {
      const cleanLink = q.link.replace(/^https?:\/\//, '');
      const maxLen = 20;
      let displayLink = cleanLink;
      if (cleanLink.length > maxLen) displayLink = cleanLink.slice(0, maxLen) + '...';
      displayLink = escapeHTML(displayLink);

      const tr  = document.createElement('tr');

      tr.innerHTML = `
        <td>${escapeHTML(q.name)}</td>
        <td><a href="${escapeAttr(q.link)}" target="_blank">${displayLink}</a></td>
        <td><img src="${qrImageUrl(q.id)}" alt="qr" width="64"></td>
        <td>
          <button data-edit="${q.id}">Edit</button>
          <button data-delete="${q.id}" style="margin-left:.4rem">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${err?.detail || err}</td></tr>`;
  }
}

function showPreview (id) {
  const div = document.getElementById('preview');
  if (div) div.innerHTML = `<img src="${qrImageUrl(id)}" alt="qr full">`;
}

function openEditView (id, name = '', link = '') {
  currentEditId = id;
  document.getElementById('edit-name').value = name;
  document.getElementById('edit-link').value = link;
  location.hash = '#edit' + (id ? `?id=${id}` : '');
}

async function handleEditSubmit (evt) {
  evt.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const link = document.getElementById('edit-link').value.trim();
  if (!name || !link) return alert('Both fields required');

  try {
    if (currentEditId) await updateQr(currentEditId, name, link);
    else               await createQr(name, link);
    location.hash = '#dash';
    await loadList();
  } catch (err) {
    alert(err?.detail || JSON.stringify(err));
  }
}

export function initQrModule () {
  const tbody = document.getElementById('list');
  if (tbody) {
    tbody.addEventListener('click', e => {
      const id = e.target?.dataset?.edit;
      if (id) {
        const row = e.target.closest('tr');
        const [nameCell, linkCell] = row.children;
        openEditView(id, nameCell.textContent, linkCell.querySelector('a').href);
      }

      const delId = e.target?.dataset?.delete;
      if (delId) {
        if (!confirm('Are you sure you want to delete this QR code?')) return;
        deleteQr(delId)
          .then(() => loadList())
          .catch(err => {
            alert(err?.detail || JSON.stringify(err));
          });
      }
    });
    tbody.addEventListener('mouseover', e => {
      const img = e.target.closest('tr')?.querySelector('img');
      if (img) showPreview(img.src.split('/').slice(-2, -1)[0]);
    });
  }

  const btnNew = document.getElementById('btn-new');
  if (btnNew) btnNew.addEventListener('click', () => openEditView(null));

  const form = document.getElementById('editForm');
  if (form) form.addEventListener('submit', handleEditSubmit);

  window.addEventListener('auth', ev => {
    if (ev.detail.type === 'login' || ev.detail.type === 'refresh') loadList();
  });
}

function escapeHTML (s) {
  return s.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}
function escapeAttr (s) { return escapeHTML(s).replace(/"/g, '&quot;'); }

initQrModule();
