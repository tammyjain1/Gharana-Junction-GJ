const state = {
    categories: [],
    items: [],
    cart: [],
    search: "",
    activeCategory: "all",
    whatsappNumber: ""
};

const $ = (selector) =>
    document.querySelector(selector);


// =========================================
// ELEMENTS
// =========================================

const menuCategories = $("#menuCategories");
const menuItems = $("#menuItems");
const searchInput = $("#searchInput");

const cartButton = $("#cartButton");
const cartCount = $("#cartCount");

const cartDrawer = $("#cartDrawer");
const cartOverlay = $("#cartOverlay");
const closeCartButton = $("#closeCart");

const cartItems = $("#cartItems");
const cartTotal = $("#cartTotal");

const customerNameInput = $("#customerName");
const placeOrderButton = $("#placeOrder");


// =========================================
// INITIALIZE
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    try {

        const [
            menuResponse,
            configResponse
        ] = await Promise.all([
            fetch("/api/menu"),
            fetch("/api/config")
        ]);


        if (!menuResponse.ok) {
            throw new Error(
                "Menu could not be loaded."
            );
        }


        const menuData =
            await menuResponse.json();

        const configData =
            await configResponse.json();


        state.categories =
            menuData.categories || [];

        state.items =
            menuData.items || [];

        state.whatsappNumber =
            configData.whatsappNumber || "";


        loadCart();

        renderCategories();

        renderItems();

        updateCartUI();

        setupEvents();

    } catch (error) {

        console.error(error);


        if (menuItems) {

            menuItems.innerHTML = `
                <div class="empty-state">

                    <h3>
                        Menu unavailable
                    </h3>

                    <p>
                        Please refresh the page
                        and try again.
                    </p>

                </div>
            `;
        }
    }
}


// =========================================
// EVENTS
// =========================================

function setupEvents() {

    // SEARCH

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            () => {

                state.search =
                    searchInput.value
                        .trim()
                        .toLowerCase();

                renderItems();
            }
        );
    }


    // CATEGORY

    if (menuCategories) {

        menuCategories.addEventListener(
            "click",
            (event) => {

                const button =
                    event.target.closest(
                        "[data-category-id]"
                    );


                if (!button) return;


                state.activeCategory =
                    button.dataset.categoryId;


                renderCategories();

                renderItems();


                const section =
                    document.querySelector(
                        ".menu-section"
                    );


                if (section) {

                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }
        );
    }


    // MENU ITEMS

    if (menuItems) {

        menuItems.addEventListener(
            "click",
            (event) => {

                const addButton =
                    event.target.closest(
                        "[data-add-id]"
                    );

                const plusButton =
                    event.target.closest(
                        "[data-plus-id]"
                    );

                const minusButton =
                    event.target.closest(
                        "[data-minus-id]"
                    );


                if (addButton) {

                    addToCart(
                        Number(
                            addButton.dataset.addId
                        )
                    );

                    return;
                }


                if (plusButton) {

                    changeQuantity(
                        Number(
                            plusButton.dataset.plusId
                        ),
                        1
                    );

                    return;
                }


                if (minusButton) {

                    changeQuantity(
                        Number(
                            minusButton.dataset.minusId
                        ),
                        -1
                    );
                }
            }
        );
    }


    // CART OPEN

    if (cartButton) {

        cartButton.addEventListener(
            "click",
            openCart
        );
    }


    // CART CLOSE

    if (closeCartButton) {

        closeCartButton.addEventListener(
            "click",
            closeCart
        );
    }


    if (cartOverlay) {

        cartOverlay.addEventListener(
            "click",
            closeCart
        );
    }


    // CART QUANTITY

    if (cartItems) {

        cartItems.addEventListener(
            "click",
            (event) => {

                const plusButton =
                    event.target.closest(
                        "[data-cart-plus]"
                    );

                const minusButton =
                    event.target.closest(
                        "[data-cart-minus]"
                    );


                if (plusButton) {

                    changeQuantity(
                        Number(
                            plusButton.dataset.cartPlus
                        ),
                        1
                    );
                }


                if (minusButton) {

                    changeQuantity(
                        Number(
                            minusButton.dataset.cartMinus
                        ),
                        -1
                    );
                }
            }
        );
    }


    // PLACE ORDER

    if (placeOrderButton) {

        placeOrderButton.addEventListener(
            "click",
            placeOrder
        );
    }


    // ESC KEY

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {

                closeCart();
            }
        }
    );
}


// =========================================
// CATEGORIES
// =========================================

function renderCategories() {

    if (!menuCategories) return;


    const allActive =
        state.activeCategory === "all";


    menuCategories.innerHTML = `
        <button
            class="category-chip ${
                allActive ? "active" : ""
            }"
            data-category-id="all"
            type="button"
        >
            All
        </button>
    `;


    state.categories.forEach(
        (category) => {

            const active =
                String(category.id) ===
                String(
                    state.activeCategory
                );


            menuCategories.insertAdjacentHTML(
                "beforeend",
                `
                <button
                    class="category-chip ${
                        active ? "active" : ""
                    }"
                    data-category-id="${
                        category.id
                    }"
                    type="button"
                >
                    ${
                        escapeHtml(
                            category.name
                        )
                    }
                </button>
                `
            );
        }
    );
}


// =========================================
// MENU ITEMS
// =========================================

function renderItems() {

    if (!menuItems) return;


    let filteredItems =
        [...state.items];


    // CATEGORY FILTER

    if (
        state.activeCategory !==
        "all"
    ) {

        filteredItems =
            filteredItems.filter(
                (item) =>
                    String(
                        item.category_id
                    ) ===
                    String(
                        state.activeCategory
                    )
            );
    }


    // SEARCH FILTER

    if (state.search) {

        filteredItems =
            filteredItems.filter(
                (item) => {

                    const text = `
                        ${item.name}
                        ${item.description || ""}
                    `.toLowerCase();


                    return text.includes(
                        state.search
                    );
                }
            );
    }


    // NOTHING FOUND

    if (!filteredItems.length) {

        menuItems.innerHTML = `
            <div class="empty-state">

                <h3>
                    No items found
                </h3>

                <p>
                    Try another search
                    or category.
                </p>

            </div>
        `;

        return;
    }


    // GROUP ITEMS BY CATEGORY

    const grouped = {};


    filteredItems.forEach(
        (item) => {

            if (
                !grouped[item.category_id]
            ) {

                grouped[
                    item.category_id
                ] = [];
            }


            grouped[
                item.category_id
            ].push(item);
        }
    );


    menuItems.innerHTML = "";


    state.categories.forEach(
        (category) => {

            const categoryItems =
                grouped[category.id];


            if (
                !categoryItems ||
                !categoryItems.length
            ) {
                return;
            }


            const section =
                document.createElement(
                    "section"
                );


            section.className =
                "category-section";


            section.dataset.categorySection =
                category.id;


            section.innerHTML = `
                <div
                    class="category-heading"
                >

                    <h2>
                        ${
                            escapeHtml(
                                category.name
                            )
                        }
                    </h2>

                    <span>
                        ${
                            categoryItems.length
                        }
                        items
                    </span>

                </div>


                <div
                    class="items-grid"
                >

                    ${
                        categoryItems
                            .map(
                                renderItemCard
                            )
                            .join("")
                    }

                </div>
            `;


            menuItems.appendChild(
                section
            );
        }
    );
}


// =========================================
// FOOD CARD
// =========================================

function renderItemCard(item) {

    const quantity =
        getQuantity(item.id);


    const imageHtml = item.image
        ? `
            <img
                src="${
                    escapeAttribute(
                        item.image
                    )
                }"
                alt="${
                    escapeAttribute(
                        item.name
                    )
                }"
                loading="lazy"
            >
        `
        : `
            <div
                class="item-image-placeholder"
            >
                <span>
                    GJ
                </span>
            </div>
        `;


    return `
        <article
            class="food-card"
        >

            <div
                class="food-image"
            >
                ${imageHtml}
            </div>


            <div
                class="food-info"
            >

                <div
                    class="food-title-row"
                >

                    <div
                        class="food-name-wrap"
                    >

                        <span
                            class="veg-dot ${
                                item.veg
                                    ? "veg"
                                    : "nonveg"
                            }"
                        ></span>


                        <h3>
                            ${
                                escapeHtml(
                                    item.name
                                )
                            }
                        </h3>

                    </div>

                </div>


                <div
                    class="food-price"
                >
                    ₹${
                        formatPrice(
                            item.price
                        )
                    }
                </div>


                ${
                    item.description
                        ? `
                            <p
                                class="food-description"
                            >
                                ${
                                    escapeHtml(
                                        item.description
                                    )
                                }
                            </p>
                        `
                        : ""
                }


                <div
                    class="food-action"
                >

                    ${
                        quantity > 0
                            ? `
                                <div
                                    class="quantity-control"
                                >

                                    <button
                                        type="button"
                                        data-minus-id="${
                                            item.id
                                        }"
                                    >
                                        −
                                    </button>


                                    <span>
                                        ${
                                            quantity
                                        }
                                    </span>


                                    <button
                                        type="button"
                                        data-plus-id="${
                                            item.id
                                        }"
                                    >
                                        +
                                    </button>

                                </div>
                            `
                            : `
                                <button
                                    class="add-button"
                                    type="button"
                                    data-add-id="${
                                        item.id
                                    }"
                                >
                                    ADD
                                </button>
                            `
                    }

                </div>

            </div>

        </article>
    `;
}


// =========================================
// CART
// =========================================

function loadCart() {

    try {

        const saved =
            localStorage.getItem(
                "gharana_cart"
            );


        if (!saved) {

            state.cart = [];

            return;
        }


        const parsed =
            JSON.parse(saved);


        if (Array.isArray(parsed)) {

            state.cart = parsed;

        } else {

            state.cart = [];
        }

    } catch {

        state.cart = [];
    }
}


function saveCart() {

    localStorage.setItem(
        "gharana_cart",
        JSON.stringify(
            state.cart
        )
    );
}


function getQuantity(itemId) {

    const cartItem =
        state.cart.find(
            (item) =>
                Number(item.id) ===
                Number(itemId)
        );


    return cartItem
        ? cartItem.quantity
        : 0;
}


// =========================================
// ADD TO CART
// =========================================

function addToCart(itemId) {

    const item =
        state.items.find(
            (product) =>
                Number(product.id) ===
                Number(itemId)
        );


    if (!item) return;


    const existing =
        state.cart.find(
            (cartItem) =>
                Number(cartItem.id) ===
                Number(itemId)
        );


    if (existing) {

        existing.quantity += 1;

    } else {

        state.cart.push({
            id: item.id,
            quantity: 1
        });
    }


    saveCart();

    renderItems();

    updateCartUI();
}


// =========================================
// CHANGE QUANTITY
// =========================================

function changeQuantity(
    itemId,
    amount
) {

    const existing =
        state.cart.find(
            (item) =>
                Number(item.id) ===
                Number(itemId)
        );


    if (!existing) {

        if (amount > 0) {

            addToCart(itemId);
        }

        return;
    }


    existing.quantity += amount;


    if (
        existing.quantity <= 0
    ) {

        state.cart =
            state.cart.filter(
                (item) =>
                    Number(item.id) !==
                    Number(itemId)
            );
    }


    saveCart();

    renderItems();

    updateCartUI();
}


// =========================================
// CART DETAILS
// =========================================

function getCartDetailedItems() {

    return state.cart
        .map(
            (cartItem) => {

                const product =
                    state.items.find(
                        (item) =>
                            Number(
                                item.id
                            ) ===
                            Number(
                                cartItem.id
                            )
                    );


                if (!product) {
                    return null;
                }


                return {

                    ...product,

                    quantity:
                        cartItem.quantity,

                    lineTotal:
                        Number(
                            product.price
                        ) *
                        cartItem.quantity
                };
            }
        )
        .filter(Boolean);
}


function getCartTotal() {

    return getCartDetailedItems()
        .reduce(
            (
                total,
                item
            ) =>
                total +
                item.lineTotal,
            0
        );
}


function getCartCount() {

    return state.cart
        .reduce(
            (
                total,
                item
            ) =>
                total +
                item.quantity,
            0
        );
}


// =========================================
// UPDATE CART UI
// =========================================

function updateCartUI() {

    const count =
        getCartCount();


    if (cartCount) {

        cartCount.textContent =
            count;

        cartCount.hidden =
            count === 0;
    }


    renderCart();
}


// =========================================
// RENDER CART
// =========================================

function renderCart() {

    if (!cartItems) return;


    const items =
        getCartDetailedItems();


    if (!items.length) {

        cartItems.innerHTML = `
            <div
                class="empty-cart"
            >

                <div
                    class="empty-cart-icon"
                >
                    🛒
                </div>

                <h3>
                    Your cart is empty
                </h3>

                <p>
                    Add something delicious
                    from the menu.
                </p>

            </div>
        `;


        if (cartTotal) {

            cartTotal.textContent =
                "₹0";
        }


        return;
    }


    cartItems.innerHTML =
        items
            .map(
                (item) => `
                    <div
                        class="cart-item"
                    >

                        <div
                            class="cart-item-info"
                        >

                            <div
                                class="cart-item-name"
                            >
                                ${
                                    escapeHtml(
                                        item.name
                                    )
                                }
                            </div>


                            <div
                                class="cart-item-price"
                            >
                                ₹${
                                    formatPrice(
                                        item.price
                                    )
                                }
                                ×
                                ${
                                    item.quantity
                                }
                            </div>

                        </div>


                        <div
                            class="cart-item-right"
                        >

                            <strong>
                                ₹${
                                    formatPrice(
                                        item.lineTotal
                                    )
                                }
                            </strong>


                            <div
                                class="cart-quantity"
                            >

                                <button
                                    type="button"
                                    data-cart-minus="${
                                        item.id
                                    }"
                                >
                                    −
                                </button>


                                <span>
                                    ${
                                        item.quantity
                                    }
                                </span>


                                <button
                                    type="button"
                                    data-cart-plus="${
                                        item.id
                                    }"
                                >
                                    +
                                </button>

                            </div>

                        </div>

                    </div>
                `
            )
            .join("");


    if (cartTotal) {

        cartTotal.textContent =
            `₹${formatPrice(
                getCartTotal()
            )}`;
    }
}


// =========================================
// OPEN CART
// =========================================

function openCart() {

    if (!cartDrawer) return;


    cartDrawer.classList.add(
        "open"
    );


    if (cartOverlay) {

        cartOverlay.classList.add(
            "show"
        );
    }


    document.body.classList.add(
        "cart-open"
    );
}


// =========================================
// CLOSE CART
// =========================================

function closeCart() {

    if (!cartDrawer) return;


    cartDrawer.classList.remove(
        "open"
    );


    if (cartOverlay) {

        cartOverlay.classList.remove(
            "show"
        );
    }


    document.body.classList.remove(
        "cart-open"
    );
}


// =========================================
// WHATSAPP ORDER
// =========================================

function placeOrder() {

    const items =
        getCartDetailedItems();


    if (!items.length) {

        alert(
            "Please add at least one item to your cart."
        );

        return;
    }


    const customerName =
        customerNameInput?.value.trim() ||
        "";


    if (!customerName) {

        alert(
            "Please enter your name."
        );

        customerNameInput?.focus();

        return;
    }


    if (!state.whatsappNumber) {

        alert(
            "WhatsApp number is not configured."
        );

        return;
    }


    const total =
        getCartTotal();


    let message =
        "*Gharana Junction - New Order*\n\n";


    message +=
        `*Customer Name:* ${customerName}\n\n`;


    message +=
        "*Order:*\n";


    items.forEach(
        (item) => {

            message +=
                `${item.name} × ${item.quantity} = ₹${formatPrice(
                    item.lineTotal
                )}\n`;
        }
    );


    message +=
        `\n*Total: ₹${formatPrice(
            total
        )}*`;


    const whatsappUrl =
        `https://wa.me/${state.whatsappNumber}?text=${encodeURIComponent(
            message
        )}`;


    window.open(
        whatsappUrl,
        "_blank"
    );
}


// =========================================
// HELPERS
// =========================================

function formatPrice(value) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {

        return "0";
    }


    return number.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 2
        }
    );
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(value) {

    return escapeHtml(value);
}