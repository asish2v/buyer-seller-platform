/* ---------- Storage Helpers ---------- */
const LS_PRODUCTS = "bsp_products";
const LS_REQUESTS = "bsp_requests";

const getProducts = () => JSON.parse(localStorage.getItem(LS_PRODUCTS) || "[]");
const setProducts = (arr) => localStorage.setItem(LS_PRODUCTS, JSON.stringify(arr));

const getRequests = () => JSON.parse(localStorage.getItem(LS_REQUESTS) || "[]");
const setRequests = (arr) => localStorage.setItem(LS_REQUESTS, JSON.stringify(arr));

/* ---------- Rendering ---------- */
function renderProductsSimple(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const products = getProducts();
  if (!products.length) {
    container.innerHTML = `<p class="text-gray-500">No products yet. Sellers can upload from the Seller Upload page.</p>`;
    return;
  }
  container.innerHTML = products.map(p => productCardHTML(p, false)).join("");
}

function renderProductsForBuyer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const products = getProducts();
  if (!products.length) {
    container.innerHTML = `<p class="text-gray-500">No products available yet.</p>`;
    return;
  }
  container.innerHTML = products.map(p => productCardHTML(p, true)).join("");
  container.querySelectorAll("[data-action='request']").forEach(btn => {
    btn.addEventListener("click", () => openRequestModal(btn.dataset.id));
  });
}

function productCardHTML(p, showRequestButton) {
  return `
    <div class="bg-white p-4 rounded shadow">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}"
           class="w-full h-44 object-cover rounded mb-3" onerror="this.src=''; this.alt='No image';">
      <h3 class="font-bold text-lg">${escapeHtml(p.name)}</h3>
      <p class="text-gray-600">${escapeHtml(p.desc)}</p>
      <p class="text-green-600 font-semibold mt-1">₹${escapeHtml(p.price)}</p>
      ${showRequestButton ? `
        <button class="btn bg-blue-600 mt-3" data-action="request" data-id="${p.id}">
          Request this
        </button>` : ``}
    </div>
  `;
}

function renderRequestsList() {
  const list = document.getElementById("requestsList");
  if (!list) return;
  const requests = getRequests().sort((a,b)=>b.ts-a.ts);
  if (!requests.length) {
    list.innerHTML = `<p class="text-gray-500">No buyer requests yet.</p>`;
    return;
  }

  list.innerHTML = requests.map(r => {
    return `
      <div class="bg-white p-4 rounded shadow">
        <div class="flex flex-wrap justify-between gap-2">
          <div>
            <div class="text-sm text-gray-500">${new Date(r.ts).toLocaleString()}</div>
            <div class="font-semibold">Product: ${escapeHtml(r.productName)}</div>
            <div class="text-gray-700">Buyer: ${escapeHtml(r.buyerName)} — ${escapeHtml(r.email)}</div>
          </div>
          <div class="text-right">
            <span class="inline-block px-2 py-1 rounded text-white ${statusColor(r.status)}">${r.status}</span>
          </div>
        </div>
        <p class="mt-2 text-gray-700">${escapeHtml(r.message || "")}</p>
        <div class="mt-3 flex gap-2">
          <button class="btn bg-emerald-600" data-action="mark" data-id="${r.id}" data-status="accepted">Mark Accepted</button>
          <button class="btn bg-amber-600" data-action="mark" data-id="${r.id}" data-status="pending">Mark Pending</button>
          <button class="btn bg-red-600" data-action="delete" data-id="${r.id}">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  // Wire up action buttons
  list.querySelectorAll("[data-action='mark']").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      const arr = getRequests();
      const idx = arr.findIndex(x => String(x.id) === String(id));
      if (idx > -1) {
        arr[idx].status = status;
        setRequests(arr);
        renderRequestsList();
      }
    });
  });

  list.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      setRequests(getRequests().filter(x => String(x.id) !== String(id)));
      renderRequestsList();
    });
  });

  const clearAll = document.getElementById("clearAll");
  if (clearAll) {
    clearAll.onclick = () => {
      if (confirm("Clear ALL buyer requests?")) {
        setRequests([]);
        renderRequestsList();
      }
    };
  }
}

/* ---------- Buyer Request Modal ---------- */
function openRequestModal(productId) {
  const dialog = document.getElementById("requestDialog");
  if (!dialog) return;
  const products = getProducts();
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  document.getElementById("reqProductId").value = product.id;
  document.getElementById("reqProductName").value = product.name;
  document.getElementById("reqBuyerName").value = "";
  document.getElementById("reqBuyerEmail").value = "";
  document.getElementById("reqMessage").value = "";

  dialog.showModal();
}

function setupBuyerModalHandlers() {
  const dialog = document.getElementById("requestDialog");
  const cancelBtn = document.getElementById("reqCancel");
  const form = document.getElementById("buyerRequestForm");
  if (!dialog || !cancelBtn || !form) return;

  cancelBtn.onclick = () => dialog.close();
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const productId = document.getElementById("reqProductId").value;
    const productName = document.getElementById("reqProductName").value;
    const buyerName = document.getElementById("reqBuyerName").value.trim();
    const email = document.getElementById("reqBuyerEmail").value.trim();
    const message = document.getElementById("reqMessage").value.trim();

    if (!buyerName || !email) {
      alert("Please enter your name and email.");
      return;
    }

    const req = {
      id: Date.now(),
      productId,
      productName,
      buyerName,
      email,
      message,
      status: "new",
      ts: Date.now()
    };
    const arr = getRequests();
    arr.push(req);
    setRequests(arr);

    dialog.close();
    alert("Your request was sent!");
  });
}

/* ---------- Seller Form ---------- */
function setupSellerForm() {
  const form = document.getElementById("sellerForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("productName").value.trim();
    const desc = document.getElementById("productDesc").value.trim();
    const price = document.getElementById("productPrice").value.trim();
    const image = document.getElementById("productImage").value.trim();
    if (!name || !desc || !price || !image) {
      alert("Please fill all fields.");
      return;
    }
    const products = getProducts();
    products.push({
      id: Date.now(),
      name, desc, price, image,
      ts: Date.now()
    });
    setProducts(products);
    form.reset();
    alert("Product uploaded!");
  });
}

/* ---------- Boot per page ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");

  if (page === "home") {
    renderProductsSimple("productListHome");
  }

  if (page === "seller") {
    setupSellerForm();
  }

  if (page === "buyer") {
    renderProductsForBuyer("productListBuyer");
    setupBuyerModalHandlers();
  }

  if (page === "requests") {
    renderRequestsList();
  }
});

/* ---------- Utils ---------- */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}
function statusColor(s) {
  switch (s) {
    case "accepted": return "bg-emerald-600";
    case "pending": return "bg-amber-600";
    case "new":
    default: return "bg-gray-700";
  }
}
