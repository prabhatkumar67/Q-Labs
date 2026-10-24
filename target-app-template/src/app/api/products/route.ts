import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

const SEED_PRODUCTS = [
  { name: "Wireless Bluetooth Earbuds", description: "Premium sound quality with active noise cancellation. 8-hour battery life with charging case.", price: 79.99, image_url: "https://picsum.photos/seed/earbuds/400/400", stock_quantity: 12, category: "Electronics" },
  { name: "USB-C Hub Adapter (7-in-1)", description: "Multi-port adapter with HDMI 4K, USB 3.0, SD card reader, and 100W power delivery.", price: 45.99, image_url: "https://picsum.photos/seed/usbhub/400/400", stock_quantity: 3, category: "Electronics" },
  { name: "Portable Bluetooth Speaker", description: "Waterproof IPX7 speaker with 360-degree sound. 20-hour playtime, built-in microphone.", price: 59.99, image_url: "https://picsum.photos/seed/speaker/400/400", stock_quantity: 34, category: "Electronics" },
  { name: "Wireless Charging Pad", description: "Fast 15W Qi wireless charger compatible with all Qi-enabled devices. LED indicator, slim design.", price: 24.99, image_url: "https://picsum.photos/seed/charger/400/400", stock_quantity: 78, category: "Electronics" },
  { name: "Noise-Cancelling Headphones", description: "Over-ear headphones with hybrid ANC, 30-hour battery, and premium memory foam cushions.", price: 149.99, image_url: "https://picsum.photos/seed/headphones/400/400", stock_quantity: 8, category: "Electronics" },
  { name: "Classic Cotton T-Shirt", description: "Soft, breathable cotton tee perfect for everyday wear. Pre-shrunk fabric with reinforced stitching.", price: 24.99, image_url: "https://picsum.photos/seed/tshirt/400/400", stock_quantity: 45, category: "Apparel" },
  { name: "Slim Fit Denim Jeans", description: "Premium stretch denim with a modern slim fit. Comfortable waistband, classic 5-pocket design.", price: 64.99, image_url: "https://picsum.photos/seed/jeans/400/400", stock_quantity: 22, category: "Apparel" },
  { name: "Lightweight Running Jacket", description: "Water-resistant windbreaker with reflective details. Packable design fits in its own pocket.", price: 89.99, image_url: "https://picsum.photos/seed/jacket/400/400", stock_quantity: 0, category: "Apparel" },
  { name: "Merino Wool Beanie", description: "Ultra-soft 100% merino wool beanie. Naturally temperature-regulating, itch-free, and breathable.", price: 29.99, image_url: "https://picsum.photos/seed/beanie/400/400", stock_quantity: 56, category: "Apparel" },
  { name: "Stainless Steel Water Bottle", description: "Double-wall vacuum insulated. Keeps drinks cold 24hrs or hot 12hrs. BPA-free, 750ml capacity.", price: 28.00, image_url: "https://picsum.photos/seed/bottle/400/400", stock_quantity: 88, category: "Home & Kitchen" },
  { name: "Scented Soy Candle Set", description: "Set of 3 hand-poured soy candles. Lavender, vanilla, and eucalyptus scents. 40hr burn time each.", price: 22.00, image_url: "https://picsum.photos/seed/candles/400/400", stock_quantity: 67, category: "Home & Kitchen" },
  { name: "Ceramic Pour-Over Coffee Set", description: "Handcrafted ceramic dripper with borosilicate glass carafe. Includes 50 paper filters.", price: 42.00, image_url: "https://picsum.photos/seed/coffee/400/400", stock_quantity: 19, category: "Home & Kitchen" },
  { name: "Bamboo Cutting Board Set", description: "Set of 3 organic bamboo boards in graduated sizes. Juice groove, easy-grip handles.", price: 34.99, image_url: "https://picsum.photos/seed/cuttingboard/400/400", stock_quantity: 41, category: "Home & Kitchen" },
  { name: "Yoga Mat (6mm)", description: "Non-slip exercise mat with alignment lines. Eco-friendly TPE material, includes carry strap.", price: 34.99, image_url: "https://picsum.photos/seed/yogamat/400/400", stock_quantity: 0, category: "Sports & Fitness" },
  { name: "Resistance Band Set (5-Pack)", description: "Latex-free TPE bands in 5 resistance levels. Includes door anchor, handles, and carry bag.", price: 19.99, image_url: "https://picsum.photos/seed/bands/400/400", stock_quantity: 120, category: "Sports & Fitness" },
  { name: "Adjustable Dumbbell Set", description: "Space-saving adjustable dumbbells, 5-25 lbs per hand. Quick-change mechanism, rubberized grip.", price: 199.99, image_url: "https://picsum.photos/seed/dumbbells/400/400", stock_quantity: 4, category: "Sports & Fitness" },
  { name: "Organic Green Tea (50 bags)", description: "Hand-picked organic green tea leaves. Rich in antioxidants with a smooth, refreshing taste.", price: 12.50, image_url: "https://picsum.photos/seed/greentea/400/400", stock_quantity: 200, category: "Food & Beverage" },
  { name: "Artisan Dark Chocolate Bar", description: "Single-origin 72% cacao dark chocolate. Notes of blackberry and toasted almond. Fair-trade certified.", price: 8.99, image_url: "https://picsum.photos/seed/chocolate/400/400", stock_quantity: 95, category: "Food & Beverage" },
  { name: "Leather Bifold Wallet", description: "Genuine leather wallet with RFID blocking technology. Slim design with 8 card slots.", price: 39.99, image_url: "https://picsum.photos/seed/wallet/400/400", stock_quantity: 5, category: "Accessories" },
  { name: "Minimalist Analog Watch", description: "Japanese quartz movement, sapphire crystal glass, genuine leather strap. Water-resistant to 50m.", price: 129.00, image_url: "https://picsum.photos/seed/watch/400/400", stock_quantity: 15, category: "Accessories" },
];

function seedIfEmpty() {
  const count = db
    .prepare("SELECT COUNT(*) as count FROM products")
    .get() as { count: number };

  if (count.count === 0) {
    const insert = db.prepare(
      `INSERT INTO products (name, description, price, image_url, stock_quantity, category)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const seedAll = db.transaction(() => {
      for (const p of SEED_PRODUCTS) {
        insert.run(p.name, p.description, p.price, p.image_url, p.stock_quantity, p.category);
      }
    });

    seedAll();
  }
}

export async function GET() {
  seedIfEmpty();
  const products = db.prepare("SELECT * FROM products").all();
  return NextResponse.json(products);
}
