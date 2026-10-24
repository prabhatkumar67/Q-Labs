"""Demo store with a broken and a fixed build. No real orders are created and nothing leaves the page.

The broken build ships two bugs on purpose: it confirms orders without an email, and it says a promo
code applied without lowering the total.
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse

app = FastAPI(title="Q Labs demo store")

PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Checkout | Fernhill Coffee</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f4f1;color:#22201c}
  header{display:flex;align-items:center;justify-content:space-between;padding:18px 32px;background:#fff;border-bottom:1px solid #e7e2da}
  .brand{font-weight:700;letter-spacing:.01em}
  .build{font-size:12px;color:#7a7165;border:1px solid #e0d9cf;border-radius:99px;padding:2px 10px}
  main{max-width:920px;margin:36px auto;padding:0 24px;display:grid;grid-template-columns:1fr 340px;gap:24px}
  h1{font-size:26px;margin:0 0 20px}
  section,aside{background:#fff;border:1px solid #e7e2da;border-radius:12px;padding:24px}
  label{display:block;font-weight:600;font-size:13px;margin-bottom:6px}
  input,select{width:100%;padding:11px 12px;border:1px solid #cfc7bb;border-radius:8px;font:inherit;background:#fff}
  .field{margin-bottom:18px}
  .row{display:flex;gap:8px}
  .row input{flex:1}
  button{font:inherit;font-weight:600;border-radius:8px;border:0;padding:11px 18px;cursor:pointer}
  #apply-promo{background:#efe9e1;color:#22201c}
  #submit-order{width:100%;background:#2f4a3a;color:#fff;padding:13px}
  .note{font-size:13px;color:#7a7165;min-height:20px;margin:6px 0 0}
  #checkout-message{min-height:24px;margin:14px 0 0;font-weight:600}
  .line{display:flex;justify-content:space-between;margin:8px 0}
  .total{border-top:1px solid #e7e2da;margin-top:14px;padding-top:12px;font-weight:700;font-size:17px}
  .item{display:flex;gap:14px;align-items:center;margin-bottom:18px}
  .thumb{width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,#8a5a3b,#4e3222)}
  @media (max-width:760px){main{grid-template-columns:1fr}}
</style>
</head>
<body>
<header><span class="brand">Fernhill Coffee</span><span class="build">BUILD_LABEL</span></header>
<main>
  <section>
    <h1>Checkout</h1>
    <form id="checkout" novalidate>
      <div class="field">
        <label for="email">Email address</label>
        <input id="email" type="email" autocomplete="off" placeholder="you@example.com">
      </div>
      <div class="field">
        <label for="quantity">Quantity</label>
        <select id="quantity"><option>1</option><option>2</option><option>3</option></select>
      </div>
      <div class="field">
        <label for="promo-code">Promo code</label>
        <div class="row">
          <input id="promo-code" autocomplete="off" placeholder="SAVE10">
          <button id="apply-promo" type="button">Apply</button>
        </div>
        <p id="promo-message" class="note" aria-live="polite"></p>
      </div>
      <button id="submit-order" type="submit">Place order</button>
      <p id="checkout-message" role="alert"></p>
    </form>
  </section>
  <aside>
    <div class="item"><div class="thumb"></div><div><strong>House blend</strong><br><span class="note">Whole bean, 1 kg</span></div></div>
    <div class="line"><span>Subtotal</span><span id="subtotal"></span></div>
    <div class="line"><span>Discount</span><span id="discount"></span></div>
    <div class="line total"><span>Total</span><span id="total"></span></div>
  </aside>
</main>
<script>
  const BROKEN = IS_BROKEN;
  const PRICE = 24;
  const $ = id => document.getElementById(id);
  let discountRate = 0;
  const money = n => "$" + n.toFixed(2);
  function render() {
    const subtotal = PRICE * Number($("quantity").value);
    const discount = BROKEN ? 0 : subtotal * discountRate;
    $("subtotal").textContent = money(subtotal);
    $("discount").textContent = discount ? "-" + money(discount) : money(0);
    $("total").textContent = money(subtotal - discount);
  }
  $("quantity").addEventListener("change", render);
  $("apply-promo").addEventListener("click", () => {
    const code = $("promo-code").value.trim().toUpperCase();
    if (code === "SAVE10") { discountRate = 0.1; $("promo-message").textContent = "SAVE10 applied"; }
    else { discountRate = 0; $("promo-message").textContent = "That code is not valid"; }
    render();
  });
  $("checkout").addEventListener("submit", event => {
    event.preventDefault();
    const email = $("email").value.trim();
    const invalid = BROKEN ? false : !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email);
    $("checkout-message").textContent = invalid ? "Email is required" : "Order confirmed";
  });
  render();
</script>
</body>
</html>"""


@app.get("/{version}", response_class=HTMLResponse)
@app.get("/{version}/", response_class=HTMLResponse)
def checkout(version: str):
    if version not in {"broken", "fixed"}:
        raise HTTPException(404)
    label = "Broken build" if version == "broken" else "Fixed build"
    return PAGE.replace("BUILD_LABEL", label).replace("IS_BROKEN", "true" if version == "broken" else "false")
