const ROOT = window.SITE_ROOT || "./";

// ---------- Wishlist ----------
function getWishlist() {
  try { return JSON.parse(localStorage.getItem("wishlist") || "[]"); }
  catch (e) { return []; }
}

function setWishlist(list) {
  localStorage.setItem("wishlist", JSON.stringify(list));
  updateWishlistBadge();
}

function isWishlisted(slug) {
  return getWishlist().includes(slug);
}

function toggleWishlist(slug) {
  const list = getWishlist();
  const idx = list.indexOf(slug);
  if (idx === -1) list.push(slug); else list.splice(idx, 1);
  setWishlist(list);
  return list.includes(slug);
}

function updateWishlistBadge() {
  const el = document.getElementById("wishlistCount");
  if (el) el.textContent = getWishlist().length;
}

// ---------- Recently viewed ----------
function recordView(product) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem("recentlyViewed") || "[]"); } catch (e) { list = []; }
  list = list.filter(p => p.slug !== product.slug);
  list.unshift(product);
  list = list.slice(0, 8);
  localStorage.setItem("recentlyViewed", JSON.stringify(list));
}

function getRecentlyViewed(excludeSlug) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem("recentlyViewed") || "[]"); } catch (e) { list = []; }
  return list.filter(p => p.slug !== excludeSlug);
}

// ---------- Price formatting ----------
function formatPrice(price) {
  return new Intl.NumberFormat("uk-UA").format(price) + " грн";
}

// ---------- Callback modal ----------
function initCallbackModal() {
  const btn = document.getElementById("callbackBtn");
  const overlay = document.getElementById("callbackOverlay");
  if (!btn || !overlay) return;
  const closeBtn = document.getElementById("callbackClose");
  const form = document.getElementById("callbackForm");
  const success = document.getElementById("callbackSuccess");

  btn.addEventListener("click", () => {
    overlay.classList.add("open");
    if (form) { form.hidden = false; }
    if (success) { success.hidden = true; }
  });
  if (closeBtn) closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      form.hidden = true;
      if (success) success.hidden = false;
    });
  }
}

// ---------- Search (pages without their own catalog grid) ----------
function initHeaderSearchRedirect() {
  const input = document.getElementById("siteSearch");
  if (!input) return;
  if (document.getElementById("productGrid")) return; // index.html handles search itself
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      location.href = `${ROOT}index.html?search=${encodeURIComponent(input.value.trim())}#catalog`;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateWishlistBadge();
  initCallbackModal();
  initHeaderSearchRedirect();

  document.querySelectorAll("[data-wishlist-toggle]").forEach(btn => {
    const slug = btn.dataset.wishlistToggle;
    if (isWishlisted(slug)) btn.classList.add("active");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const active = toggleWishlist(slug);
      btn.classList.toggle("active", active);
    });
  });
});
