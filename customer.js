// ==========================================================================
// Gharana Junction — Customer menu logic
// ==========================================================================

document.getElementById('brandName').textContent = BUSINESS_NAME;

let categories = [];   // [{id, name, order}]
let items = [];        // [{id, name, price, description, imageUrl, categoryId, inStock, order}]
let activeCategoryId = null;
let searchTerm = '';
let cart = {};          // { itemId: qty }

const categoryScroll = document.getElementById('categoryScroll');
const menuList = document.getElementById('menuList');
const searchInput = document.getElementById('searchInput');
const cartBar = document.getElementById('cartBar');
const cartItemCount = document.getElementById('cartItemCount');
const cartTotal = document.getElementById('cartTotal');
const cartOverlay = document.getElementById('cartOverlay');
const cartBody = document.getElementById('cartBody');
const drawerTotal = document.getElementById('drawerTotal');
const nameOverlay = document.getElementById('nameOverlay');
const toastEl = document.getElementById('toast');

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function money(n) {
  return '₹' + Number(n).toFixed(0);
}

// ---- Live data from Firestore ----
db.collection('categories').orderBy('order', 'asc').onSnapshot(snap => {
  categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!activeCategoryId && categories.length) activeCategoryId = categories[0].id;
  renderCategories();
  renderMenu();
}, err => {
  console.error(err);
  menuList.innerHTML = `<div class="empty-state"><strong>Menu not connected</strong>Check the Firebase setup in firebase-config.js.</div>`;
});

db.collection('items').orderBy('order', 'asc').onSnapshot(snap => {
  items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderMenu();
});

function renderCategories() {
  categoryScroll.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (cat.id === activeCategoryId ? ' active' : '');
    btn.textContent = cat.name;
    btn.addEventListener('click', () => {
      activeCategoryId = cat.id;
      searchTerm = '';
      searchInput.value = '';
      renderCategories();
      renderMenu();
    });
    categoryScroll.appendChild(btn);
  });
}

function renderMenu() {
  menuList.innerHTML = '';

  let visibleItems;
  let heading;

  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    visibleItems = items.filter(it => it.name.toLowerCase().includes(q));
    heading = `Results for "${searchTerm.trim()}"`;
  } else {
    visibleItems = items.filter(it => it.categoryId === activeCategoryId);
    const cat = categories.find(c => c.id === activeCategoryId);
    heading = cat ? cat.name : '';
  }

  if (!categories.length) {
    menuList.innerHTML = `<div class="empty-state"><strong>Menu coming soon</strong>Please check back shortly.</div>`;
    return;
  }

  const heading_el = document.createElement('div');
  heading_el.className = 'section-heading';
  heading_el.innerHTML = `${heading} <span class="muted">(${visibleItems.length})</span>`;
  menuList.appendChild(heading_el);

  if (!visibleItems.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<strong>No items here</strong>Try another category or search term.`;
    menuList.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'item-list';

  visibleItems.forEach(it => {
    const card = document.createElement('div');
    card.className = 'item-card' + (it.inStock === false ? ' unavailable' : '');

    const qty = cart[it.id] || 0;

    card.innerHTML = `
      <div class="item-info">
        ${it.inStock === false ? '<span class="out-of-stock-tag">Out of stock</span><br/>' : ''}
        <p class="name">${escapeHtml(it.name)}</p>
        <p class="price">${money(it.price)}</p>
        ${it.description ? `<p class="desc">${escapeHtml(it.description)}</p>` : ''}
        <div class="item-actions" id="actions-${it.id}"></div>
      </div>
      <div class="item-media">
        ${it.imageUrl
          ? `<img class="thumb" src="${it.imageUrl}" alt="${escapeHtml(it.name)}" />`
          : `<div class="thumb placeholder">No photo</div>`}
      </div>
    `;
    list.appendChild(card);
    renderItemAction(it, qty);
  });

  menuList.appendChild(list);
}

function renderItemAction(it, qty) {
  const el = document.getElementById(`actions-${it.id}`);
  if (!el) return;

  if (it.inStock === false) {
    el.innerHTML = '';
    return;
  }

  if (qty === 0) {
    el.innerHTML = `<button class="add-btn">Add</button>`;
    el.querySelector('button').addEventListener('click', () => changeQty(it.id, 1));
  } else {
    el.innerHTML = `
      <div class="stepper">
        <button data-act="minus">−</button>
        <span class="qty">${qty}</span>
        <button data-act="plus">+</button>
      </div>`;
    el.querySelector('[data-act="minus"]').addEventListener('click', () => changeQty(it.id, -1));
    el.querySelector('[data-act="plus"]').addEventListener('click', () => changeQty(it.id, 1));
  }
}

function changeQty(itemId, delta) {
  const current = cart[itemId] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) delete cart[itemId];
  else cart[itemId] = next;

  const it = items.find(i => i.id === itemId);
  if (it) renderItemAction(it, cart[itemId] || 0);

  updateCartBar();
}

function cartLines() {
  return Object.entries(cart).map(([id, qty]) => {
    const it = items.find(i => i.id === id);
    return it ? { ...it, qty } : null;
  }).filter(Boolean);
}

function cartTotalAmount() {
  return cartLines().reduce((sum, l) => sum + l.price * l.qty, 0);
}

function updateCartBar() {
  const lines = cartLines();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  if (count === 0) {
    cartBar.classList.remove('visible');
    return;
  }
  cartBar.classList.add('visible');
  cartItemCount.textContent = `${count} item${count > 1 ? 's' : ''}`;
  cartTotal.textContent = money(cartTotalAmount());
}

document.getElementById('viewCartBtn').addEventListener('click', openCartDrawer);

function openCartDrawer() {
  const lines = cartLines();
  cartBody.innerHTML = '';
  if (!lines.length) {
    cartBody.innerHTML = `<div class="empty-state"><strong>Cart is empty</strong>Add items from the menu.</div>`;
  } else {
    lines.forEach(l => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <div class="cart-row-info">
          <div class="name">${escapeHtml(l.name)}</div>
          <div class="unit">${money(l.price)} × ${l.qty}</div>
        </div>
        <div class="stepper" style="background:var(--paper-dim); border:1px solid var(--line);">
          <button data-act="minus" style="color:var(--ink)">−</button>
          <span class="qty" style="color:var(--ink)">${l.qty}</span>
          <button data-act="plus" style="color:var(--ink)">+</button>
        </div>
        <div class="line-total">${money(l.price * l.qty)}</div>
      `;
      row.querySelector('[data-act="minus"]').addEventListener('click', () => { changeQty(l.id, -1); openCartDrawer(); });
      row.querySelector('[data-act="plus"]').addEventListener('click', () => { changeQty(l.id, 1); openCartDrawer(); });
      cartBody.appendChild(row);
    });
  }
  drawerTotal.textContent = money(cartTotalAmount());
  cartOverlay.classList.add('open');
}

document.getElementById('closeCart').addEventListener('click', () => cartOverlay.classList.remove('open'));
cartOverlay.addEventListener('click', e => { if (e.target === cartOverlay) cartOverlay.classList.remove('open'); });

document.getElementById('proceedBtn').addEventListener('click', () => {
  if (!cartLines().length) { showToast('Add at least one item first'); return; }
  cartOverlay.classList.remove('open');
  nameOverlay.classList.add('open');
  document.getElementById('customerName').focus();
});

document.getElementById('closeName').addEventListener('click', () => nameOverlay.classList.remove('open'));
nameOverlay.addEventListener('click', e => { if (e.target === nameOverlay) nameOverlay.classList.remove('open'); });

document.getElementById('sendOrderBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('customerName');
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); showToast('Please enter your name'); return; }

  const lines = cartLines();
  let msg = `Hello I am ${name}\n\nMy order:\n`;
  lines.forEach(l => {
    msg += `${l.name} x${l.qty} - ${money(l.price * l.qty)}\n`;
  });
  msg += `\nTotal: ${money(cartTotalAmount())}`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');

  nameOverlay.classList.remove('open');
});

searchInput.addEventListener('input', e => {
  searchTerm = e.target.value;
  renderMenu();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
