// ==========================================================================
// Gharana Junction — Owner panel logic
// ==========================================================================

document.getElementById('brandName').textContent = BUSINESS_NAME;

const loginScreen = document.getElementById('loginScreen');
const ownerShell = document.getElementById('ownerShell');
const toastEl = document.getElementById('toast');

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1800);
}

// ---------------- AUTH ----------------
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.classList.remove('show');

  if (!email || !password) {
    errorEl.textContent = 'Please enter both email and password.';
    errorEl.classList.add('show');
    return;
  }

  auth.signInWithEmailAndPassword(email, password).catch(err => {
    errorEl.textContent = 'Incorrect email or password.';
    errorEl.classList.add('show');
    console.error(err);
  });
}

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.style.display = 'none';
    ownerShell.style.display = 'block';
    initDashboard();
  } else {
    loginScreen.style.display = 'flex';
    ownerShell.style.display = 'none';
  }
});

// ---------------- DATA ----------------
let categories = [];
let items = [];
let dashboardInitialized = false;

function initDashboard() {
  if (dashboardInitialized) return;
  dashboardInitialized = true;

  db.collection('categories').orderBy('order', 'asc').onSnapshot(snap => {
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategoriesPanel();
    populateCategorySelects();
    renderItemsPanel();
  });

  db.collection('items').orderBy('order', 'asc').onSnapshot(snap => {
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderItemsPanel();
  });
}

// ---------------- TABS ----------------
document.querySelectorAll('.owner-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.owner-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-items').classList.toggle('hidden', tab.dataset.tab !== 'items');
    document.getElementById('panel-categories').classList.toggle('hidden', tab.dataset.tab !== 'categories');
  });
});

// ---------------- CATEGORIES PANEL ----------------
function renderCategoriesPanel() {
  const list = document.getElementById('categoriesList');
  list.innerHTML = '';
  if (!categories.length) {
    list.innerHTML = `<div class="empty-state"><strong>No categories yet</strong>Add your first one below.</div>`;
    return;
  }
  categories.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    const itemCount = items.filter(i => i.categoryId === cat.id).length;
    row.innerHTML = `
      <div class="info">
        <div class="name">${escapeHtml(cat.name)}</div>
        <div class="meta">${itemCount} item${itemCount === 1 ? '' : 's'}</div>
      </div>
      <div class="row-actions">
        <button class="ghost-btn small" data-act="edit">Edit</button>
      </div>
    `;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openCategoryModal(cat));
    list.appendChild(row);
  });
}

function populateCategorySelects() {
  const filterSel = document.getElementById('itemCategoryFilter');
  const formSel = document.getElementById('itemForm_category');
  const prevFilter = filterSel.value;

  filterSel.innerHTML = `<option value="__all__">All categories</option>` +
    categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  formSel.innerHTML = categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  if (categories.some(c => c.id === prevFilter)) filterSel.value = prevFilter;
}

document.getElementById('itemCategoryFilter').addEventListener('change', renderItemsPanel);

document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal(null));

function openCategoryModal(cat) {
  document.getElementById('categoryModalTitle').textContent = cat ? 'Edit Category' : 'Add Category';
  document.getElementById('categoryId').value = cat ? cat.id : '';
  document.getElementById('categoryForm_name').value = cat ? cat.name : '';
  document.getElementById('deleteCategoryBtn').style.display = cat ? 'block' : 'none';
  document.getElementById('categoryModal').classList.add('open');
}

document.getElementById('closeCategoryModal').addEventListener('click', () => document.getElementById('categoryModal').classList.remove('open'));

document.getElementById('saveCategoryBtn').addEventListener('click', async () => {
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryForm_name').value.trim();
  if (!name) { showToast('Enter a category name'); return; }

  try {
    if (id) {
      await db.collection('categories').doc(id).update({ name });
    } else {
      const order = categories.length ? Math.max(...categories.map(c => c.order || 0)) + 1 : 0;
      await db.collection('categories').add({ name, order });
    }
    document.getElementById('categoryModal').classList.remove('open');
    showToast('Category saved');
  } catch (err) {
    console.error(err);
    showToast('Could not save — check connection');
  }
});

document.getElementById('deleteCategoryBtn').addEventListener('click', async () => {
  const id = document.getElementById('categoryId').value;
  if (!id) return;
  const inUse = items.some(i => i.categoryId === id);
  if (inUse) { showToast('Move or delete items in this category first'); return; }
  if (!confirm('Delete this category?')) return;
  await db.collection('categories').doc(id).delete();
  document.getElementById('categoryModal').classList.remove('open');
  showToast('Category deleted');
});

// ---------------- ITEMS PANEL ----------------
function renderItemsPanel() {
  const list = document.getElementById('itemsList');
  const filter = document.getElementById('itemCategoryFilter').value;
  list.innerHTML = '';

  const visible = filter && filter !== '__all__' ? items.filter(i => i.categoryId === filter) : items;

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state"><strong>No items yet</strong>Tap the + button to add your first item.</div>`;
    return;
  }

  visible.forEach(it => {
    const cat = categories.find(c => c.id === it.categoryId);
    const row = document.createElement('div');
    row.className = 'manage-row';
    row.innerHTML = `
      ${it.imageUrl ? `<img class="thumb-sm" src="${it.imageUrl}" alt="" />` : `<div class="thumb-sm"></div>`}
      <div class="info">
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="meta">₹${it.price} · ${cat ? escapeHtml(cat.name) : 'Uncategorised'}</div>
      </div>
      <div class="stock-toggle">
        <span class="switch ${it.inStock === false ? '' : 'on'}" data-act="toggle-stock"></span>
      </div>
      <div class="row-actions">
        <button class="ghost-btn small" data-act="edit">Edit</button>
      </div>
    `;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openItemModal(it));
    row.querySelector('[data-act="toggle-stock"]').addEventListener('click', async (e) => {
      const newVal = it.inStock === false ? true : false;
      e.target.classList.toggle('on', newVal);
      try {
        await db.collection('items').doc(it.id).update({ inStock: newVal });
      } catch (err) {
        console.error(err);
        showToast('Could not update — check connection');
      }
    });
    list.appendChild(row);
  });
}

document.getElementById('addItemFab').addEventListener('click', () => {
  if (!categories.length) { showToast('Add a category first'); return; }
  openItemModal(null);
});

function openItemModal(it) {
  document.getElementById('itemModalTitle').textContent = it ? 'Edit Item' : 'Add Item';
  document.getElementById('itemId').value = it ? it.id : '';
  document.getElementById('itemForm_category').value = it ? it.categoryId : (categories[0] && categories[0].id);
  document.getElementById('itemForm_name').value = it ? it.name : '';
  document.getElementById('itemForm_price').value = it ? it.price : '';
  document.getElementById('itemForm_desc').value = it ? (it.description || '') : '';
  document.getElementById('itemForm_image').value = it ? (it.imageUrl || '') : '';
  const stockSwitch = document.getElementById('itemForm_stockSwitch');
  stockSwitch.classList.toggle('on', !it || it.inStock !== false);
  document.getElementById('deleteItemBtn').style.display = it ? 'block' : 'none';
  document.getElementById('itemModal').classList.add('open');
}

document.getElementById('itemForm_stockSwitch').addEventListener('click', (e) => {
  e.target.classList.toggle('on');
});

document.getElementById('closeItemModal').addEventListener('click', () => document.getElementById('itemModal').classList.remove('open'));

document.getElementById('saveItemBtn').addEventListener('click', async () => {
  const id = document.getElementById('itemId').value;
  const categoryId = document.getElementById('itemForm_category').value;
  const name = document.getElementById('itemForm_name').value.trim();
  const price = parseFloat(document.getElementById('itemForm_price').value);
  const description = document.getElementById('itemForm_desc').value.trim();
  const imageUrl = document.getElementById('itemForm_image').value.trim();
  const inStock = document.getElementById('itemForm_stockSwitch').classList.contains('on');

  if (!name) { showToast('Enter an item name'); return; }
  if (isNaN(price) || price < 0) { showToast('Enter a valid price'); return; }
  if (!categoryId) { showToast('Choose a category'); return; }

  const payload = { name, price, description, imageUrl, categoryId, inStock };

  try {
    if (id) {
      await db.collection('items').doc(id).update(payload);
    } else {
      const order = items.length ? Math.max(...items.map(i => i.order || 0)) + 1 : 0;
      await db.collection('items').add({ ...payload, order });
    }
    document.getElementById('itemModal').classList.remove('open');
    showToast('Item saved');
  } catch (err) {
    console.error(err);
    showToast('Could not save — check connection');
  }
});

document.getElementById('deleteItemBtn').addEventListener('click', async () => {
  const id = document.getElementById('itemId').value;
  if (!id) return;
  if (!confirm('Delete this item?')) return;
  await db.collection('items').doc(id).delete();
  document.getElementById('itemModal').classList.remove('open');
  showToast('Item deleted');
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
