const API_URL = "http://localhost:3000/api";

let products = [];
let categories = ["Tous", "Aquarelle", "Peinture", "Feutre alcool"];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

document.addEventListener("DOMContentLoaded", () => {
  displayNav();
  updateCart();
  if (document.getElementById("catalogue")) loadProducts();
  if (document.getElementById("order-summary")) displayCheckout();
});

async function loadProducts() {
  try {
    const res = await fetch(`${API_URL}/dessins`);

    console.log(
      "%c🟢 SUCCÈS : Le Front est parfaitement connecté au serveur (Back-end) !",
      "color: #22c55e; font-weight: bold; font-size: 14px;",
    );

    products = await res.json();
    displayProducts();
    if (document.getElementById("productList")) displayAdmin();
  } catch (e) {
    console.error(
      "%c🔴 ERREUR : Impossible de joindre le serveur. As-tu bien lancé 'node server.js' ?",
      "color: #ef4444; font-weight: bold; font-size: 14px;",
    );
  }
}

function displayNav() {
  const nav = document.getElementById("nav-categories");
  if (!nav) return;
  nav.innerHTML = categories
    .map((cat) => `<button onclick="displayProducts('${cat}')">${cat}</button>`)
    .join("");
}

function displayProducts(filter = "Tous") {
  const c = document.getElementById("catalogue");
  if (!c) return;

  c.innerHTML = products
    .filter((p) => filter === "Tous" || p.category === filter)
    .map(
      (p) => `
        <div class="product-card">
            <div class="img-container"><img src="${p.image}"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="desc"><strong>Type :</strong> ${p.typeDessin || "-"} | <strong>Taille :</strong> ${p.taille || "-"}</p>
                <p class="desc">${p.description || ""}</p>
                <h4 class="price">${p.prix ? p.prix + " €" : "Sur demande"}</h4>
                <button onclick="addToCart(${p.id})">Ajouter à ma sélection</button>
            </div>
        </div>`,
    )
    .join("");
}

function addToCart(id) {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  const existing = cart.find((c) => c.id === id);
  if (existing) existing.qty++;
  else cart.push({ ...product, qty: 1 });

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function updateCart() {
  const count = document.getElementById("cart-count");
  if (count) count.innerText = cart.length;

  const c = document.getElementById("cart-items");
  if (!c) return;

  c.innerHTML = cart
    .map(
      (p, i) => `
        <div class="cart-item">
            <span>${p.name} x${p.qty}</span>
            <div>
                <button onclick="changeQty(${i},1)">+</button>
                <button onclick="changeQty(${i},-1)">-</button>
                <button onclick="removeFromCart(${i})">X</button>
            </div>
        </div>`,
    )
    .join("");
}

function changeQty(i, d) {
  cart[i].qty += d;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function removeFromCart(i) {
  cart.splice(i, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function toggleCart() {
  document.getElementById("cart").classList.toggle("hidden");
}
function goCheckout() {
  window.location.href = "checkout.html";
}

function displayCheckout() {
  const c = document.getElementById("order-summary");
  if (!c) return;
  c.innerHTML = cart
    .map((p) => `<p>${p.name} x${p.qty} - ${p.prix * p.qty}€</p>`)
    .join("");
}

async function validerCommande(event) {
  event.preventDefault();
  if (cart.length === 0) return alert("Votre sélection est vide.");

  const data = {
    client: {
      nom: document.getElementById("client-nom").value,
      email: document.getElementById("client-email").value,
      adresse: document.getElementById("client-adresse").value,
    },
    panier: cart,
  };

  try {
    const res = await fetch(`${API_URL}/commandes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    alert("Demande de devis/commande envoyée ! N°" + result.commandeId);
    cart = [];
    localStorage.removeItem("cart");
    window.location.href = "index.html";
  } catch (e) {
    alert("Erreur lors de l'envoi");
  }
}

async function checkPassword() {
  const userVal = document.getElementById("username").value.trim();
  const passVal = document.getElementById("password").value;

  if (!userVal || !passVal) {
    return alert("Veuillez remplir les deux champs.");
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: userVal, password: passVal }),
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("login").style.display = "none";
      document.getElementById("admin-panel").style.display = "block";
      updateSelect();
      loadProducts();
      fetchCommandes();
    } else {
      alert(data.message || "Identifiants incorrects");
    }
  } catch (e) {
    alert("Erreur lors de la connexion au serveur.");
  }
}

function updateSelect() {
  const s = document.getElementById("categorySelect");
  if (s)
    s.innerHTML = categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
}

function saveProduct() {
  const file = document.getElementById("imageFile").files[0];
  if (!document.getElementById("name").value) return alert("Nom requis.");

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => sendProductToServer(e.target.result);
    reader.readAsDataURL(file);
  } else {
    sendProductToServer("");
  }
}

async function sendProductToServer(imageData) {
  const prixSaisi = document.getElementById("prix").value;

  const product = {
    name: document.getElementById("name").value.trim(),
    category: document.getElementById("categorySelect").value || "Tous",
    typeDessin: document.getElementById("typeDessin").value.trim(),
    taille: document.getElementById("taille").value.trim(),
    prix: prixSaisi ? parseFloat(prixSaisi) : 0,
    description: document.getElementById("description").value,
    stock: document.getElementById("stock").value || 1,
    image: imageData,
  };

  try {
    const res = await fetch(`${API_URL}/dessins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Oeuvre ajoutée avec succès !");
      loadProducts();

      document.getElementById("name").value = "";
      document.getElementById("typeDessin").value = "";
      document.getElementById("taille").value = "";
      document.getElementById("prix").value = "";
      document.getElementById("description").value = "";
      document.getElementById("stock").value = "";
      document.getElementById("imageFile").value = "";
    } else {
      alert("Erreur du serveur : " + (data.error || "Inconnue"));
    }
  } catch (e) {
    alert("Impossible de joindre le serveur pour ajouter l'oeuvre.");
    console.error(e);
  }
}

function displayAdmin() {
  const c = document.getElementById("productList");
  if (!c) return;
  c.innerHTML = products
    .map(
      (p) => `
        <div class="card" style="padding:15px; margin-bottom:10px;">
            <h4>${p.name} - ${p.prix}€</h4>
            <p>Stock: ${p.stock} | Type: ${p.typeDessin}</p>
        </div>`,
    )
    .join("");
}

async function fetchCommandes() {
  const res = await fetch(`${API_URL}/commandes`);
  const commandes = await res.json();
  const cList = document.getElementById("commandesList");
  if (!cList) return;

  if (commandes.length === 0) {
    cList.innerHTML =
      "<p style='color: var(--text-muted);'>Aucune demande en attente.</p>";
    return;
  }

  cList.innerHTML = commandes
    .map(
      (c) => `
        <div style="background: rgba(0,0,0,0.2); padding: 15px; margin-top: 10px; border-radius: 8px;">
            <strong style="color:var(--accent)">Demande #${c.id}</strong> - ${new Date(c.date).toLocaleDateString()}<br>
            Client: ${c.nom} (${c.email})<br>
            Adresse/Infos: ${c.adresse}<br>
            
            <div style="margin: 10px 0; padding: 10px; border-left: 3px solid #22c55e; background: rgba(34, 197, 94, 0.1);">
                <strong style="color: #22c55e;">Œuvre(s) souhaitée(s) :</strong> ${c.dessins || "Aucune information"}
            </div>
            
            <button onclick="validerCommandeAdmin(${c.id})" style="background: #22c55e; width: 100%;">✅ Valider cette commande</button>
        </div>
    `,
    )
    .join("");
}

async function validerCommandeAdmin(id) {
  if (
    !confirm(
      "Voulez-vous valider cette commande ? Le stock sera mis à jour et l'œuvre supprimée si elle tombe à 0.",
    )
  ) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/commandes/${id}/valider`, {
      method: "POST",
    });
    if (res.ok) {
      alert("Commande validée avec succès !");
      fetchCommandes();
      loadProducts();
    } else {
      alert("Erreur lors de la validation côté serveur.");
    }
  } catch (e) {
    alert("Impossible de joindre le serveur.");
    console.error(e);
  }
}
