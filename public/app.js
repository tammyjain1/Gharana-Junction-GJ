const state = {
  categories: [],
  items: [],
  cart: [],
  whatsappNumber: ""
};

const $ = (selector) => document.querySelector(selector);

async function loadMenu() {
  try {
    const [menuRes, configRes] = await Promise.all([
      fetch("/api/menu"),
      fetch("/api/config")
    ]);

    if (!menuRes.ok) throw new Error("Could not load menu");

    const menu = await menuRes.json();
    const config = await configRes.json();

    state.categories = menu.categories || [];
    state.items = menu.items || [];
    state.whatsappNumber = config.whatsappNumber || "";

    renderCategories();
    renderItems();
    updateCart();
  } catch (error) {
    console.error(error);

    const container = $("#items");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Menu unavailable</h3>
          <p>Please refresh the page and try again.</p>
        </div>
      `;
    }
  }
}

function renderCategories() {
  const container = $("#categories");

  if (!container) return;

  container.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.className = "category-btn active";
  allButton.textContent = "All";
  allButton.dataset.category = "all";

  allButton.addEventListener("click", () => {
    document
      .querySelectorAll(".category-btn")
      .forEach((btn) => btn.classList.remove("active"));

    allButton.classList.add("active");
    renderItems("all");
  });

  container.appendChild(allButton);

  state.categories.forEach((category) => {
    const button = document.createElement("button");

    button.className = "category-btn";
    button.textContent = category.name;
    button.dataset.category = category.id;

    button.addEventListener("click", () => {
      document
        .querySelectorAll(".category-btn")
        .forEach((btn) => btn.classList.remove("active"));

      button.classList.add("active");

      renderItems(String(category.id));
    });

    container.appendChild(button);
  });
}

function renderItems(categoryId = "all", searchText = "") {
  const container = $("#items");

  if (!container) return;

  const search = searchText.trim().toLowerCase();

  let items = state.items;

  if (categoryId !== "all") {
    items = items.filter(
      (item) => String(item.category_id) === String(categoryId)
    );
  }

  if (search) {
    items = items.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();

      return (
        name.includes(search) ||
        description.includes(search)
      );
    });
  }

  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <h3>No items found</h3>
        <p>Try another category or search.</p>
      </div>
    `;

    return;
  }

  items.forEach((item) => {
    container.appendChild(createItemCard(item));
  });
}

function createItemCard(item) {
  const card = document.createElement("article");

  card.className = "food-card";

  const cartItem = state.cart.find(
    (cartItem) => cartItem.id === item.id
  );

  const quantity = cartItem ? cartItem.quantity : 0;

  const imageHTML = item.image
    ? `
      <img
        class="food-image"
        src="${escapeHTML(item.image)}"
        alt="${escapeHTML(item.name)}"
        loading="lazy"
      >
    `
    : `
      <div class="food-image placeholder-image">
        <span>🍽️</span>
      </div>
    `;

  const vegHTML = Number(item.veg)
    ? `<span class="veg-dot"></span>`
    : `<span class="nonveg-dot"></span>`;

  let actionHTML;

  if (quantity > 0) {
    actionHTML = `
      <div class="quantity-control">
        <button
          class="qty-btn"
          data-action="decrease"
          data-id="${item.id}"
        >
          −
        </button>

        <span class="quantity">${quantity}</span>

        <button
          class="qty-btn"
          data-action="increase"
          data-id="${item.id}"
        >
          +
        </button>
      </div>
    `;
  } else {
    actionHTML = `
      <button
        class="add-btn"
        data-action="add"
        data-id="${item.id}"
      >
        ADD
      </button>
    `;
  }

  card.innerHTML = `
    <div class="food-content">

      <div class="food-info">

        <div class="food-title-row">
          ${vegHTML}

          <h3 class="food-name">
            ${escapeHTML(item.name)}
          </h3>
        </div>

        <div class="food-price">
          ₹${formatPrice(item.price)}
        </div>

        ${
          item.description
            ? `
              <p class="food-description">
                ${escapeHTML(item.description)}
              </p>
            `
            : ""
        }

        <div class="food-action">
          ${actionHTML}
        </div>

      </div>

      <div class="food-image-wrapper">
        ${imageHTML}
      </div>

    </div>
  `;

  card.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (action === "add") {
      addToCart(id);
    }

    if (action === "increase") {
      changeQuantity(id, 1);
    }

    if (action === "decrease") {
      changeQuantity(id, -1);
    }
  });

  return card;
}

function addToCart(id) {
  const item = state.items.find(
    (item) => item.id === id
  );

  if (!item) return;

  const existing = state.cart.find(
    (cartItem) => cartItem.id === id
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: 1
    });
  }

  saveCart();
  refreshCurrentItems();
  updateCart();
}

function changeQuantity(id, amount) {
  const item = state.cart.find(
    (cartItem) => cartItem.id === id
  );

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(
      (cartItem) => cartItem.id !== id
    );
  }

  saveCart();
  refreshCurrentItems();
  updateCart();
}

function refreshCurrentItems() {
  const activeCategory =
    document.querySelector(".category-btn.active");

  const categoryId =
    activeCategory?.dataset.category || "all";

  const searchInput = $("#searchInput");

  renderItems(
    categoryId,
    searchInput?.value || ""
  );
}

function updateCart() {
  const count = state.cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const total = state.cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const cartCount = $("#cartCount");
  const cartTotal = $("#cartTotal");
  const cartBar = $("#cartBar");

  if (cartCount) {
    cartCount.textContent = count;
  }

  if (cartTotal) {
    cartTotal.textContent = `₹${formatPrice(total)}`;
  }

  if (cartBar) {
    cartBar.classList.toggle("hidden", count === 0);
  }
}

function openCart() {
  const modal = $("#cartModal");

  if (!modal) return;

  renderCart();

  modal.classList.add("show");
  document.body.classList.add("modal-open");
}

function closeCart() {
  const modal = $("#cartModal");

  if (!modal) return;

  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

function renderCart() {
  const container = $("#cartItems");

  if (!container) return;

  container.innerHTML = "";

  if (!state.cart.length) {
    container.innerHTML = `
      <div class="empty-cart">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add something delicious from the menu.</p>
      </div>
    `;

    return;
  }

  state.cart.forEach((item) => {
    const lineTotal =
      item.price * item.quantity;

    const row = document.createElement("div");

    row.className = "cart-item";

    row.innerHTML = `
      <div class="cart-item-info">
        <h4>${escapeHTML(item.name)}</h4>
        <p>
          ₹${formatPrice(item.price)}
          × ${item.quantity}
        </p>
      </div>

      <div class="cart-item-right">

        <div class="quantity-control small">
          <button
            class="qty-btn"
            data-cart-action="decrease"
            data-id="${item.id}"
          >
            −
          </button>

          <span class="quantity">
            ${item.quantity}
          </span>

          <button
            class="qty-btn"
            data-cart-action="increase"
            data-id="${item.id}"
          >
            +
          </button>
        </div>

        <strong>
          ₹${formatPrice(lineTotal)}
        </strong>

      </div>
    `;

    row.addEventListener("click", (event) => {
      const button =
        event.target.closest("[data-cart-action]");

      if (!button) return;

      const id = Number(button.dataset.id);
      const action =
        button.dataset.cartAction;

      if (action === "increase") {
        changeQuantity(id, 1);
      }

      if (action === "decrease") {
        changeQuantity(id, -1);
      }

      renderCart();
    });

    container.appendChild(row);
  });

  const total = state.cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const totalElement = $("#modalCartTotal");

  if (totalElement) {
    totalElement.textContent =
      `₹${formatPrice(total)}`;
  }
}

function openCheckout() {
  if (!state.cart.length) {
    alert("Your cart is empty.");
    return;
  }

  closeCart();

  const checkout = $("#checkoutModal");

  if (!checkout) return;

  checkout.classList.add("show");
  document.body.classList.add("modal-open");

  setTimeout(() => {
    $("#customerName")?.focus();
  }, 100);
}

function closeCheckout() {
  const checkout = $("#checkoutModal");

  if (!checkout) return;

  checkout.classList.remove("show");
  document.body.classList.remove("modal-open");
}

function placeOrder() {
  const nameInput = $("#customerName");

  if (!nameInput) return;

  const customerName =
    nameInput.value.trim();

  if (!customerName) {
    alert("Please enter your name.");
    nameInput.focus();
    return;
  }

  if (!state.cart.length) {
    alert("Your cart is empty.");
    return;
  }

  let message =
    `Hello Gharana Junction!%0A%0A`;

  message +=
    `New Order%0A`;

  message +=
    `Customer Name: ${encodeURIComponent(customerName)}%0A%0A`;

  message +=
    `Order Details:%0A`;

  state.cart.forEach((item) => {
    const lineTotal =
      item.price * item.quantity;

    message +=
      `${encodeURIComponent(item.name)} × ${item.quantity} — ₹${formatPrice(lineTotal)}%0A`;
  });

  const total = state.cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  message +=
    `%0ATotal: ₹${formatPrice(total)}`;

  const phone =
    String(state.whatsappNumber || "")
      .replace(/\D/g, "");

  if (!phone) {
    alert(
      "WhatsApp number is not configured."
    );
    return;
  }

  const whatsappURL =
    `https://wa.me/${phone}?text=${message}`;

  window.open(
    whatsappURL,
    "_blank",
    "noopener,noreferrer"
  );

  state.cart = [];

  saveCart();
  updateCart();
  closeCheckout();

  if (nameInput) {
    nameInput.value = "";
  }
}

function saveCart() {
  localStorage.setItem(
    "gharanaCart",
    JSON.stringify(state.cart)
  );
}

function loadCart() {
  try {
    const saved =
      localStorage.getItem("gharanaCart");

    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      state.cart = parsed;
    }
  } catch (error) {
    console.error(
      "Could not load cart",
      error
    );

    state.cart = [];
  }
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2
    }
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setupSearch() {
  const searchInput = $("#searchInput");

  if (!searchInput) return;

  searchInput.addEventListener(
    "input",
    () => {
      const activeCategory =
        document.querySelector(
          ".category-btn.active"
        );

      const categoryId =
        activeCategory?.dataset.category ||
        "all";

      renderItems(
        categoryId,
        searchInput.value
      );
    }
  );
}

function setupEvents() {
  const cartButton = $("#cartButton");

  if (cartButton) {
    cartButton.addEventListener(
      "click",
      openCart
    );
  }

  const closeCartButton =
    $("#closeCart");

  if (closeCartButton) {
    closeCartButton.addEventListener(
      "click",
      closeCart
    );
  }

  const checkoutButton =
    $("#checkoutButton");

  if (checkoutButton) {
    checkoutButton.addEventListener(
      "click",
      openCheckout
    );
  }

  const closeCheckoutButton =
    $("#closeCheckout");

  if (closeCheckoutButton) {
    closeCheckoutButton.addEventListener(
      "click",
      closeCheckout
    );
  }

  const placeOrderButton =
    $("#placeOrder");

  if (placeOrderButton) {
    placeOrderButton.addEventListener(
      "click",
      placeOrder
    );
  }

  const cartModal =
    $("#cartModal");

  if (cartModal) {
    cartModal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === cartModal
        ) {
          closeCart();
        }
      }
    );
  }

  const checkoutModal =
    $("#checkoutModal");

  if (checkoutModal) {
    checkoutModal.addEventListener(
      "click",
      (event) => {
        if (
          event.target === checkoutModal
        ) {
          closeCheckout();
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;

      closeCart();
      closeCheckout();
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadCart();
    setupSearch();
    setupEvents();
    loadMenu();
  }
);
