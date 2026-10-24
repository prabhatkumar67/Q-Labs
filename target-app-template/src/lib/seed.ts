import { faker } from "@faker-js/faker";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

interface ScenarioConfig {
  product_count?: number;
  buyer_count?: number;
  inventory_status?: "high" | "low" | "mixed";
  order_count?: number;
  category_list?: string[];
}

const DEFAULT_CATEGORIES = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports",
  "Books",
  "Toys",
  "Food & Beverage",
];

function getStockQuantity(status: string): number {
  switch (status) {
    case "high":
      return faker.number.int({ min: 50, max: 500 });
    case "low":
      return faker.number.int({ min: 0, max: 10 });
    case "mixed":
    default:
      return faker.number.int({ min: 0, max: 500 });
  }
}

export function seed(dbPath: string, config: ScenarioConfig = {}) {
  const {
    product_count = 25,
    buyer_count = 30,
    inventory_status = "mixed",
    order_count = 40,
    category_list = DEFAULT_CATEGORIES,
  } = config;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_name TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL DEFAULT 'default',
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Generate products
  const insertProduct = db.prepare(
    `INSERT INTO products (name, description, price, image_url, stock_quantity, category) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const productIds: number[] = [];
  const insertProducts = db.transaction(() => {
    for (let i = 0; i < product_count; i++) {
      const result = insertProduct.run(
        faker.commerce.productName(),
        faker.commerce.productDescription(),
        parseFloat(faker.commerce.price({ min: 1, max: 999.99 })),
        `https://picsum.photos/seed/${faker.string.alphanumeric(8)}/300/300`,
        getStockQuantity(inventory_status),
        faker.helpers.arrayElement(category_list)
      );
      productIds.push(result.lastInsertRowid as number);
    }
  });
  insertProducts();

  // Generate buyer names
  const buyers: string[] = [];
  for (let i = 0; i < buyer_count; i++) {
    buyers.push(faker.person.fullName());
  }

  // Generate orders
  const insertOrder = db.prepare(
    `INSERT INTO orders (buyer_name, total, status, created_at) VALUES (?, ?, ?, ?)`
  );
  const insertOrderItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`
  );

  const statuses = ["pending", "shipped", "delivered"];

  const insertOrders = db.transaction(() => {
    for (let i = 0; i < order_count; i++) {
      const itemCount = faker.number.int({ min: 1, max: 5 });
      let total = 0;
      const items: { productId: number; quantity: number; price: number }[] =
        [];

      for (let j = 0; j < itemCount; j++) {
        const productId = faker.helpers.arrayElement(productIds);
        const quantity = faker.number.int({ min: 1, max: 3 });
        const price = parseFloat(
          faker.commerce.price({ min: 1, max: 999.99 })
        );
        total += quantity * price;
        items.push({ productId, quantity, price });
      }

      const createdAt = faker.date
        .recent({ days: 30 })
        .toISOString()
        .replace("T", " ")
        .substring(0, 19);
      const result = insertOrder.run(
        faker.helpers.arrayElement(buyers),
        Math.round(total * 100) / 100,
        faker.helpers.arrayElement(statuses),
        createdAt
      );
      const orderId = result.lastInsertRowid as number;

      for (const item of items) {
        insertOrderItem.run(orderId, item.productId, item.quantity, item.price);
      }
    }
  });
  insertOrders();

  db.close();
  console.log(
    `Seeded database with ${product_count} products, ${order_count} orders, ${buyer_count} buyers`
  );
}

// Run if called directly
if (require.main === module) {
  const dbPath =
    process.env.NODE_ENV === "production"
      ? "/app/data/store.db"
      : path.join(process.cwd(), "data", "store.db");

  if (fs.existsSync(dbPath)) {
    console.log("Database already exists, skipping seed.");
    process.exit(0);
  }

  let config: ScenarioConfig = {};
  if (process.env.SCENARIO_CONFIG) {
    try {
      config = JSON.parse(process.env.SCENARIO_CONFIG);
    } catch {
      console.error("Invalid SCENARIO_CONFIG JSON, using defaults");
    }
  }

  if (process.env.SEED_COUNT) {
    const count = parseInt(process.env.SEED_COUNT, 10);
    if (!isNaN(count) && count > 0) {
      if (config.product_count === undefined) {
        config.product_count = count;
      }
      if (config.buyer_count === undefined) {
        config.buyer_count = Math.ceil(count * 1.2);
      }
      if (config.order_count === undefined) {
        config.order_count = Math.ceil(count * 1.6);
      }
    }
  }

  seed(dbPath, config);
}
