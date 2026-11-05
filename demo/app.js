// The demo's own code. The script scan finds element ids and classes here,
// so Copy ID on these controls names app.js.
const dialog = document.getElementById('dialog');
document.getElementById('open-dialog').addEventListener('click', () => { dialog.hidden = false; });
document.getElementById('cancel-delete').addEventListener('click', () => { dialog.hidden = true; });
document.getElementById('confirm-delete').addEventListener('click', () => { dialog.hidden = true; });
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('search').value = '';
  document.getElementById('status').value = 'All';
});
document.getElementById('apply-btn').addEventListener('click', () => {
  document.querySelector('.badge-count').textContent = String(document.querySelectorAll('#orders-grid tbody tr').length);
});
