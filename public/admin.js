// =========================================
// GHARANA JUNCTION — ADMIN PANEL
// =========================================

const state = {
    categories: [],
    items: [],
    editingItemId: null
};

// =========================================
// GET OWNER KEY FROM SECRET URL
// =========================================

function getOwnerKey() {
    const parts = window.location.pathname.split("/");

    // /admin/SECRET-KEY
    const adminIndex = parts.indexOf("admin");

    if (adminIndex === -1 || !parts[adminIndex + 1]) {
        return "";
    }

    return decodeURIComponent(parts[adminIndex + 1]);
}

const OWNER_KEY = getOwnerKey();

if (!OWNER_KEY) {
    alert("Invalid owner URL.");
}

// =========================================
// API HELPER
// =========================================

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-owner-key": OWNER_KEY,
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.error || "Something went wrong."
        );
    }

    return data;
}

// =========================================
// DOM ELEMENTS
// =========================================

const itemForm =
    document.getElementById("itemForm");

const itemId =
    document.getElementById("itemId");

const itemName =
    document.getElementById("itemName");

const itemPrice =
    document.getElementById("itemPrice");

const itemCategory =
    document.getElementById("itemCategory");

const itemImage =
    document.getElementById("itemImage");

const itemDescription =
    document.getElementById("itemDescription");

const itemVeg =
    document.getElementById("itemVeg");

const itemAvailable =
    document.getElementById("itemAvailable");

const saveItemButton =
    document.getElementById("saveItemButton");

const cancelEditButton =
    document.getElementById("cancelEditButton");

const adminItems =
    document.getElementById("adminItems");

const categoryForm =
    document.getElementById("categoryForm");

const categoryName =
    document.getElementById("categoryName");

const adminCategories =
    document.getElementById("adminCategories");

const adminMessage =
    document.getElementById("adminMessage");

// =========================================
// MESSAGE
// =========================================

function showMessage(message, type = "success") {
    if (!adminMessage) return;

    adminMessage.textContent = message;

    adminMessage.className =
        `admin-message ${type}`;

    setTimeout(() => {
        adminMessage.textContent = "";
        adminMessage.className =
            "admin-message";
    }, 3000);
}

// =========================================
// LOAD DATA
// =========================================

async function loadAdminData() {
    try {
        const data =
            await api("/api/admin/menu");

        state.categories =
            data.categories || [];

        state.items =
            data.items || [];

        renderCategorySelect();
        renderCategories();
        renderItems();

    } catch (error) {
        console.error(error);

        showMessage(
            error.message,
            "error"
        );
    }
}

// =========================================
// CATEGORY SELECT
// =========================================

function renderCategorySelect() {
    if (!itemCategory) return;

    itemCategory.innerHTML =
        `<option value="">Select category</option>`;

    state.categories.forEach(category => {
        const option =
            document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;

        itemCategory.appendChild(option);
    });
}

// =========================================
// RENDER CATEGORIES
// =========================================

function renderCategories() {
    if (!adminCategories) return;

    adminCategories.innerHTML = "";

    if (!state.categories.length) {
        adminCategories.innerHTML =
            `<p class="empty-admin">
                No categories yet.
            </p>`;

        return;
    }

    state.categories.forEach(category => {
        const row =
            document.createElement("div");

        row.className =
            "admin-category-row";

        row.innerHTML = `
            <span>${escapeHtml(category.name)}</span>

            <div class="admin-actions">
                <button
                    type="button"
                    class="small-btn edit-category"
                    data-id="${category.id}">
                    Edit
                </button>

                <button
                    type="button"
                    class="small-btn delete-category danger"
                    data-id="${category.id}">
                    Delete
                </button>
            </div>
        `;

        adminCategories.appendChild(row);
    });
}

// =========================================
// RENDER ITEMS
// =========================================

function renderItems() {
    if (!adminItems) return;

    adminItems.innerHTML = "";

    if (!state.items.length) {
        adminItems.innerHTML =
            `<p class="empty-admin">
                No items added yet.
            </p>`;

        return;
    }

    state.items.forEach(item => {
        const category =
            state.categories.find(
                cat => Number(cat.id) === Number(item.category_id)
            );

        const card =
            document.createElement("div");

        card.className =
            "admin-item-card";

        const imageHtml = item.image
            ? `
                <img
                    src="${escapeAttribute(item.image)}"
                    alt="${escapeAttribute(item.name)}"
                    class="admin-item-image"
                    onerror="this.style.display='none'"
                >
              `
            : `
                <div class="admin-item-image placeholder">
                    🍽️
                </div>
              `;

        card.innerHTML = `
            ${imageHtml}

            <div class="admin-item-info">

                <div class="admin-item-top">
                    <h3>
                        ${escapeHtml(item.name)}
                    </h3>

                    <span class="admin-price">
                        ₹${Number(item.price).toFixed(0)}
                    </span>
                </div>

                <p class="admin-category">
                    ${escapeHtml(
                        category
                            ? category.name
                            : "No category"
                    )}
                </p>

                ${
                    item.description
                        ? `<p class="admin-description">
                            ${escapeHtml(item.description)}
                           </p>`
                        : ""
                }

                <div class="admin-status-row">

                    <span class="status-badge ${
                        item.available
                            ? "available"
                            : "unavailable"
                    }">
                        ${
                            item.available
                                ? "Available"
                                : "Out of Stock"
                        }
                    </span>

                    <span class="veg-badge">
                        ${item.veg ? "🟢 Veg" : "🔴 Non-Veg"}
                    </span>

                </div>

                <div class="admin-actions">

                    <button
                        type="button"
                        class="admin-btn edit-item"
                        data-id="${item.id}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="admin-btn delete-item danger"
                        data-id="${item.id}">
                        Delete
                    </button>

                </div>

            </div>
        `;

        adminItems.appendChild(card);
    });
}

// =========================================
// ADD / EDIT ITEM
// =========================================

if (itemForm) {
    itemForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                itemName.value.trim();

            const price =
                Number(itemPrice.value);

            const categoryId =
                Number(itemCategory.value);

            if (!name) {
                showMessage(
                    "Please enter item name.",
                    "error"
                );
                return;
            }

            if (
                !categoryId ||
                !Number.isFinite(price)
            ) {
                showMessage(
                    "Please enter a valid price and category.",
                    "error"
                );
                return;
            }

            const payload = {
                name,
                price,
                categoryId,
                image:
                    itemImage.value.trim(),

                description:
                    itemDescription.value.trim(),

                veg:
                    itemVeg.checked,

                available:
                    itemAvailable.checked
            };

            try {

                saveItemButton.disabled = true;

                if (state.editingItemId) {

                    await api(
                        `/api/admin/items/${state.editingItemId}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(payload)
                        }
                    );

                    showMessage(
                        "Item updated successfully."
                    );

                } else {

                    await api(
                        "/api/admin/items",
                        {
                            method: "POST",
                            body: JSON.stringify(payload)
                        }
                    );

                    showMessage(
                        "Item added successfully."
                    );
                }

                resetItemForm();

                await loadAdminData();

            } catch (error) {

                console.error(error);

                showMessage(
                    error.message,
                    "error"
                );

            } finally {

                saveItemButton.disabled = false;
            }
        }
    );
}

// =========================================
// EDIT ITEM BUTTON
// =========================================

if (adminItems) {
    adminItems.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(".edit-item");

            if (!button) return;

            const id =
                Number(button.dataset.id);

            const item =
                state.items.find(
                    item =>
                        Number(item.id) === id
                );

            if (!item) return;

            state.editingItemId = id;

            itemId.value = id;

            itemName.value =
                item.name || "";

            itemPrice.value =
                item.price || "";

            itemCategory.value =
                item.category_id || "";

            itemImage.value =
                item.image || "";

            itemDescription.value =
                item.description || "";

            itemVeg.checked =
                Boolean(item.veg);

            itemAvailable.checked =
                Boolean(item.available);

            saveItemButton.textContent =
                "Update Item";

            cancelEditButton.style.display =
                "inline-flex";

            itemForm.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
}

// =========================================
// DELETE ITEM
// =========================================

if (adminItems) {
    adminItems.addEventListener(
        "click",
        async function (event) {

            const button =
                event.target.closest(".delete-item");

            if (!button) return;

            const id =
                Number(button.dataset.id);

            const item =
                state.items.find(
                    item =>
                        Number(item.id) === id
                );

            if (!item) return;

            const confirmed =
                confirm(
                    `Delete "${item.name}"?`
                );

            if (!confirmed) return;

            try {

                await api(
                    `/api/admin/items/${id}`,
                    {
                        method: "DELETE"
                    }
                );

                showMessage(
                    "Item deleted successfully."
                );

                await loadAdminData();

            } catch (error) {

                console.error(error);

                showMessage(
                    error.message,
                    "error"
                );
            }
        }
    );
}

// =========================================
// CANCEL EDIT
// =========================================

if (cancelEditButton) {
    cancelEditButton.addEventListener(
        "click",
        function () {
            resetItemForm();
        }
    );
}

// =========================================
// RESET ITEM FORM
// =========================================

function resetItemForm() {

    state.editingItemId = null;

    if (itemForm) {
        itemForm.reset();
    }

    if (itemId) {
        itemId.value = "";
    }

    if (itemVeg) {
        itemVeg.checked = true;
    }

    if (itemAvailable) {
        itemAvailable.checked = true;
    }

    if (saveItemButton) {
        saveItemButton.textContent =
            "Add Item";
    }

    if (cancelEditButton) {
        cancelEditButton.style.display =
            "none";
    }
}

// =========================================
// ADD CATEGORY
// =========================================

if (categoryForm) {
    categoryForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                categoryName.value.trim();

            if (!name) {
                showMessage(
                    "Please enter category name.",
                    "error"
                );
                return;
            }

            try {

                await api(
                    "/api/admin/categories",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            name
                        })
                    }
                );

                categoryName.value = "";

                showMessage(
                    "Category added successfully."
                );

                await loadAdminData();

            } catch (error) {

                console.error(error);

                showMessage(
                    error.message,
                    "error"
                );
            }
        }
    );
}

// =========================================
// EDIT / DELETE CATEGORY
// =========================================

if (adminCategories) {
    adminCategories.addEventListener(
        "click",
        async function (event) {

            // -------------------------
            // EDIT CATEGORY
            // -------------------------

            const editButton =
                event.target.closest(
                    ".edit-category"
                );

            if (editButton) {

                const id =
                    Number(editButton.dataset.id);

                const category =
                    state.categories.find(
                        cat =>
                            Number(cat.id) === id
                    );

                if (!category) return;

                const newName =
                    prompt(
                        "Enter new category name:",
                        category.name
                    );

                if (
                    newName === null
                ) {
                    return;
                }

                const trimmedName =
                    newName.trim();

                if (!trimmedName) {
                    showMessage(
                        "Category name cannot be empty.",
                        "error"
                    );
                    return;
                }

                try {

                    await api(
                        `/api/admin/categories/${id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify({
                                name: trimmedName
                            })
                        }
                    );

                    showMessage(
                        "Category updated successfully."
                    );

                    await loadAdminData();

                } catch (error) {

                    console.error(error);

                    showMessage(
                        error.message,
                        "error"
                    );
                }

                return;
            }

            // -------------------------
            // DELETE CATEGORY
            // -------------------------

            const deleteButton =
                event.target.closest(
                    ".delete-category"
                );

            if (deleteButton) {

                const id =
                    Number(deleteButton.dataset.id);

                const category =
                    state.categories.find(
                        cat =>
                            Number(cat.id) === id
                    );

                if (!category) return;

                const confirmed =
                    confirm(
                        `Delete category "${category.name}"?`
                    );

                if (!confirmed) return;

                try {

                    await api(
                        `/api/admin/categories/${id}`,
                        {
                            method: "DELETE"
                        }
                    );

                    showMessage(
                        "Category deleted successfully."
                    );

                    await loadAdminData();

                } catch (error) {

                    console.error(error);

                    showMessage(
                        error.message,
                        "error"
                    );
                }
            }
        }
    );
}

// =========================================
// HTML ESCAPE HELPERS
// =========================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

// =========================================
// START
// =========================================

resetItemForm();
loadAdminData();