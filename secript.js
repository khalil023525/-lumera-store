const SUPABASE_URL = "https://tjtnflfjuthbcckxtwbz.supabase.co";
/*
  ضع هنا Publishable key من Supabase
  لا تضع Secret key
*/
const SUPABASE_KEY = "sb_publishable_1XAfDfHKqY8mROQekukN1w_a2symK-B";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
// ===============================
// VARIABLES
// ===============================
let store = null;
let products = [];
let cart = [];
let selectedProduct = null;
const params = new URLSearchParams(window.location.search);
const storeSlug = params.get("store") || "lumera";
// ===============================
// HELPERS
// ===============================
function formatPrice(price) {
  return new Intl.NumberFormat("fr-DZ").format(price) + " DA";
}
function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
// ===============================
// LOAD STORE
// ===============================
async function loadStore() {
  const { data, error } = await supabaseClient
    .from("stores")
    .select("*")
    .eq("slug", storeSlug)
    .eq("active", true)
    .single();
  if (error) {
    console.error("Store error:", error);
    document.getElementById("productsGrid").innerHTML = `
      <div class="loading">
        تعذر تحميل المتجر.
      </div>
    `;
    return;
  }
  store = data;
  applyStoreSettings();
  await loadProducts();
}
// ===============================
// APPLY STORE SETTINGS
// ===============================
function applyStoreSettings() {
  document.title =
    `${store.name} | Jewelry`;
  document.getElementById("storeName").textContent =
    store.name;
  document.getElementById("footerStoreName").textContent =
    store.name;
  document.getElementById("heroTitle").innerHTML =
    escapeHTML(store.hero_text || "عالم من الفخامة والأناقة")
      .replaceAll("\n", "<br>");
  document.getElementById("aboutText").textContent =
    store.about || "";
  document.documentElement.style.setProperty(
    "--gold",
    store.primary_color || "#d6b36a"
  );
  document.documentElement.style.setProperty(
    "--gold-light",
    store.primary_color || "#d6b36a"
  );
  document.getElementById("whatsappButton")
    .addEventListener("click", openWhatsApp);
}
// ===============================
// LOAD PRODUCTS
// ===============================
async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("active", true)
    .order("created_at", {
      ascending: false
    });
  if (error) {
    console.error("Products error:", error);
    document.getElementById("productsGrid").innerHTML = `
      <div class="loading">
        حدث خطأ أثناء تحميل المنتجات.
      </div>
    `;
    return;
  }
  products = data || [];
  renderProducts(products);
}
// ===============================
// RENDER PRODUCTS
// ===============================
function renderProducts(list) {
  const grid =
    document.getElementById("productsGrid");
  if (!list.length) {
    grid.innerHTML = `
      <div class="loading">
        لا توجد منتجات حاليًا.
      </div>
    `;
    return;
  }
  grid.innerHTML = list.map(product => {
    const image =
      product.image_url ||
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80";
    return `
      <article
        class="product-card"
        data-id="${escapeHTML(product.id)}"
      >
        <div class="product-image">
          <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(product.name)}"
            loading="lazy"
          >
        </div>
        <div class="product-info">
          <div class="product-category">
            ${escapeHTML(product.category || "JEWELRY")}
          </div>
          <h3 class="product-name">
            ${escapeHTML(product.name)}
          </h3>
          <div class="product-price">
            ${formatPrice(product.price)}
          </div>
        </div>
      </article>
    `;
  }).join("");
  document.querySelectorAll(".product-card")
    .forEach(card => {
      card.addEventListener("click", () => {
        const product =
          products.find(
            item => item.id === card.dataset.id
          );
        if (product) {
          openProduct(product);
        }
      });
    });
}
// ===============================
// CATEGORIES
// ===============================
document.querySelectorAll(".category-button")
  .forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".category-button")
        .forEach(btn =>
          btn.classList.remove("active")
        );
      button.classList.add("active");
      const category =
        button.dataset.category;
      if (category === "all") {
        renderProducts(products);
        return;
      }
      const filtered =
        products.filter(product => {
          const value =
            String(product.category || "")
              .toLowerCase();
          return value === category;
        });
      renderProducts(filtered);
    });
  });
// ===============================
// PRODUCT MODAL
// ===============================
function openProduct(product) {
  selectedProduct = product;
  document.getElementById("modalProductImage").src =
    product.image_url || "";
  document.getElementById("modalProductImage").alt =
    product.name;
  document.getElementById("modalProductName").textContent =
    product.name;
  document.getElementById("modalProductCategory").textContent =
    product.category || "JEWELRY";
  document.getElementById("modalProductDescription").textContent =
    product.description || "منتج فاخر من مجموعتنا.";
  document.getElementById("modalProductPrice").textContent =
    formatPrice(product.price);
  document.getElementById("productModal")
    .classList.add("show");
}
document.getElementById("modalClose")
  .addEventListener("click", closeProduct);
document.getElementById("modalOverlay")
  .addEventListener("click", closeProduct);
function closeProduct() {
  document.getElementById("productModal")
    .classList.remove("show");
}
// ===============================
// ADD TO CART
// ===============================
document.getElementById("modalAddToCart")
  .addEventListener("click", () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct);
    closeProduct();
    openCart();
  });
function addToCart(product) {
  const existing =
    cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      quantity: 1
    });
  }
  saveCart();
  renderCart();
}
// ===============================
// CART STORAGE
// ===============================
function saveCart() {
  localStorage.setItem(
    "lumera_cart",
    JSON.stringify(cart)
  );
}
function loadCart() {
  try {
    cart =
      JSON.parse(
        localStorage.getItem("lumera_cart")
      ) || [];
  } catch {
    cart = [];
  }
}
// ===============================
// CART UI
// ===============================
function renderCart() {
  const container =
    document.getElementById("cartItems");
  const count =
    cart.reduce(
      (sum, item) =>
        sum + item.quantity,
      0
    );
  document.getElementById("cartCount")
    .textContent = count;
  if (!cart.length) {
    container.innerHTML = `
      <p class="empty-cart">
        السلة فارغة
      </p>
    `;
    document.getElementById("cartTotal")
      .textContent = "0 DA";
    return;
  }
  container.innerHTML =
    cart.map(item => {
      return `
        <div class="cart-item">
          <img
            src="${escapeHTML(item.image_url || "")}"
            alt=""
          >
          <div class="cart-item-info">
            <h4>
              ${escapeHTML(item.name)}
            </h4>
            <p>
              ${formatPrice(item.price)}
              × ${item.quantity}
            </p>
          </div>
          <button
            class="cart-remove"
            data-id="${escapeHTML(item.id)}"
          >
            حذف
          </button>
        </div>
      `;
    }).join("");
  document.querySelectorAll(".cart-remove")
    .forEach(button => {
      button.addEventListener("click", () => {
        removeFromCart(button.dataset.id);
      });
    });
  const total =
    cart.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );
  document.getElementById("cartTotal")
    .textContent = formatPrice(total);
}
function removeFromCart(id) {
  cart =
    cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
}
// ===============================
// CART OPEN / CLOSE
// ===============================
document.getElementById("cartButton")
  .addEventListener("click", openCart);
document.getElementById("cartClose")
  .addEventListener("click", closeCart);
document.getElementById("cartOverlay")
  .addEventListener("click", closeCart);
function openCart() {
  document.getElementById("cartDrawer")
    .classList.add("show");
  document.getElementById("cartOverlay")
    .classList.add("show");
}
function closeCart() {
  document.getElementById("cartDrawer")
    .classList.remove("show");
  document.getElementById("cartOverlay")
    .classList.remove("show");
}
// ===============================
// WHATSAPP ORDER
// ===============================
document.getElementById("orderButton")
  .addEventListener("click", openWhatsApp);
function openWhatsApp() {
  if (!store || !store.whatsapp) {
    alert(
      "رقم WhatsApp الخاص بالمتجر غير مضاف بعد."
    );
    return;
  }
  if (!cart.length) {
    alert("السلة فارغة.");
    return;
  }
  let message =
    `السلام عليكم، أريد طلب المنتجات التالية من ${store.name}:\n\n`;
  cart.forEach((item, index) => {
    message +=
      `${index + 1}. ${item.name} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}\n`;
  });
  const total =
    cart.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );
  message +=
    `\nالمجموع: ${formatPrice(total)}`;
  const phone =
    String(store.whatsapp)
      .replace(/\D/g, "");
  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}
// ===============================
// INIT
// ===============================
document.getElementById("year")
  .textContent = new Date().getFullYear();
loadCart();
renderCart();
loadStore();
