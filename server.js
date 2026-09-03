import "dotenv/config";
import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const OWNER_KEY = process.env.OWNER_KEY || "change-this-owner-key";
const WHATSAPP_NUMBER =
  process.env.WHATSAPP_NUMBER || "919132622222";

// =========================================
// DATABASE
// =========================================

const db = new Database(
  path.join(__dirname, "gharana.db")
);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    veg INTEGER DEFAULT 1,
    available INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY(category_id)
      REFERENCES categories(id)
      ON DELETE CASCADE
  );
`);

// =========================================
// DEFAULT DATA
// =========================================

const count = db
  .prepare("SELECT COUNT(*) AS c FROM categories")
  .get().c;

if (!count) {
  const addCategory = db.prepare(`
    INSERT INTO categories
    (name, sort_order)
    VALUES (?, ?)
  `);

  [
    "Starters",
    "Snacks",
    "Burgers",
    "Chinese",
    "Main Course",
    "Cakes",
    "Brownies",
    "Cookies",
    "Chocolates"
  ].forEach((name, index) => {
    addCategory.run(name, index);
  });

  const categories = db
    .prepare("SELECT id, name FROM categories")
    .all();

  const category = Object.fromEntries(
    categories.map((item) => [
      item.name,
      item.id
    ])
  );

  const addItem = db.prepare(`
    INSERT INTO items
    (
      category_id,
      name,
      price,
      description,
      image,
      veg,
      available,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  addItem.run(
    category["Snacks"],
    "Vada Pav",
    40,
    "Soft pav with flavorful potato filling.",
    "",
    1,
    1,
    0
  );

  addItem.run(
    category["Snacks"],
    "Dabeli",
    50,
    "Gujarati-style spicy, sweet and tangy snack.",
    "",
    1,
    1,
    1
  );

  addItem.run(
    category["Burgers"],
    "Mini Burger",
    399,
    "Bite-sized burgers packed with delicious flavours.",
    "",
    1,
    1,
    0
  );

  addItem.run(
    category["Starters"],
    "Paneer Chilli",
    180,
    "Crispy paneer tossed with peppers and sauces.",
    "",
    1,
    1,
    0
  );

  addItem.run(
    category["Brownies"],
    "Classic Brownie",
    120,
    "Rich, fudgy chocolate brownie.",
    "",
    1,
    1,
    0
  );
}

// =========================================
// MIDDLEWARE
// =========================================

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// =========================================
// OWNER SECURITY
// =========================================

function ownerGuard(req, res, next) {
  if (
    req.headers["x-owner-key"] !== OWNER_KEY
  ) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

// =========================================
// CONFIG
// =========================================

app.get("/api/config", (req, res) => {
  res.json({
    whatsappNumber: WHATSAPP_NUMBER
  });
});

// =========================================
// CUSTOMER MENU
// =========================================

app.get("/api/menu", (req, res) => {
  const categories = db
    .prepare(`
      SELECT *
      FROM categories
      ORDER BY sort_order, id
    `)
    .all();

  const items = db
    .prepare(`
      SELECT *
      FROM items
      WHERE available = 1
      ORDER BY sort_order, id
    `)
    .all();

  res.json({
    categories,
    items
  });
});

// =========================================
// ADMIN MENU
// =========================================

app.get(
  "/api/admin/menu",
  ownerGuard,
  (req, res) => {
    const categories = db
      .prepare(`
        SELECT *
        FROM categories
        ORDER BY sort_order, id
      `)
      .all();

    const items = db
      .prepare(`
        SELECT *
        FROM items
        ORDER BY category_id, sort_order, id
      `)
      .all();

    res.json({
      categories,
      items
    });
  }
);

// =========================================
// ADD CATEGORY
// =========================================

app.post(
  "/api/admin/categories",
  ownerGuard,
  (req, res) => {
    const name = String(
      req.body.name || ""
    ).trim();

    if (!name) {
      return res.status(400).json({
        error: "Category name is required"
      });
    }

    const result = db
      .prepare(`
        INSERT INTO categories
        (name)
        VALUES (?)
      `)
      .run(name);

    res.json({
      id: result.lastInsertRowid,
      name
    });
  }
);

// =========================================
// EDIT CATEGORY
// =========================================

app.put(
  "/api/admin/categories/:id",
  ownerGuard,
  (req, res) => {
    const name = String(
      req.body.name || ""
    ).trim();

    if (!name) {
      return res.status(400).json({
        error: "Category name is required"
      });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?
      WHERE id = ?
    `).run(
      name,
      req.params.id
    );

    res.json({
      ok: true
    });
  }
);

// =========================================
// DELETE CATEGORY
// =========================================

app.delete(
  "/api/admin/categories/:id",
  ownerGuard,
  (req, res) => {
    const id = Number(
      req.params.id
    );

    const used = db
      .prepare(`
        SELECT COUNT(*) AS c
        FROM items
        WHERE category_id = ?
      `)
      .get(id).c;

    if (used) {
      return res.status(400).json({
        error:
          "Move or delete the items in this category first."
      });
    }

    db.prepare(`
      DELETE FROM categories
      WHERE id = ?
    `).run(id);

    res.json({
      ok: true
    });
  }
);

// =========================================
// ADD ITEM
// =========================================

app.post(
  "/api/admin/items",
  ownerGuard,
  (req, res) => {
    const body = req.body;

    const name = String(
      body.name || ""
    ).trim();

    const categoryId = Number(
      body.categoryId
    );

    const price = Number(
      body.price
    );

    if (
      !name ||
      !categoryId ||
      !Number.isFinite(price)
    ) {
      return res.status(400).json({
        error:
          "Name, category and valid price are required."
      });
    }

    const result = db
      .prepare(`
        INSERT INTO items
        (
          category_id,
          name,
          price,
          description,
          image,
          veg,
          available
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        categoryId,
        name,
        price,
        String(
          body.description || ""
        ),
        String(
          body.image || ""
        ),
        body.veg !== false ? 1 : 0,
        body.available === false
          ? 0
          : 1
      );

    res.json({
      id: result.lastInsertRowid
    });
  }
);

// =========================================
// EDIT ITEM
// =========================================

app.put(
  "/api/admin/items/:id",
  ownerGuard,
  (req, res) => {
    const body = req.body;

    const name = String(
      body.name || ""
    ).trim();

    const categoryId = Number(
      body.categoryId
    );

    const price = Number(
      body.price
    );

    if (
      !name ||
      !categoryId ||
      !Number.isFinite(price)
    ) {
      return res.status(400).json({
        error:
          "Name, category and valid price are required."
      });
    }

    db.prepare(`
      UPDATE items
      SET
        category_id = ?,
        name = ?,
        price = ?,
        description = ?,
        image = ?,
        veg = ?,
        available = ?
      WHERE id = ?
    `).run(
      categoryId,
      name,
      price,
      String(
        body.description || ""
      ),
      String(
        body.image || ""
      ),
      body.veg !== false ? 1 : 0,
      body.available === false
        ? 0
        : 1,
      req.params.id
    );

    res.json({
      ok: true
    });
  }
);

// =========================================
// DELETE ITEM
// =========================================

app.delete(
  "/api/admin/items/:id",
  ownerGuard,
  (req, res) => {
    db.prepare(`
      DELETE FROM items
      WHERE id = ?
    `).run(
      req.params.id
    );

    res.json({
      ok: true
    });
  }
);

// =========================================
// OWNER PAGE
// =========================================

app.get(
  "/admin/:key",
  (req, res) => {
    if (
      req.params.key !== OWNER_KEY
    ) {
      return res
        .status(404)
        .send("Not found");
    }

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "admin.html"
      )
    );
  }
);

// =========================================
// CUSTOMER PAGE
// =========================================

app.get(
  "/menu",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);

// =========================================
// HOME
// =========================================

app.get(
  "/",
  (req, res) => {
    res.redirect("/menu");
  }
);

// =========================================
// START SERVER
// =========================================

app.listen(
  PORT,
  () => {
    console.log(
      `Gharana Junction running on http://localhost:${PORT}`
    );
  }
);