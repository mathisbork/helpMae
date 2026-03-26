// app.js
const ADMIN_PASSWORD = "1234";
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

// --- CHARGEMENT ---
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/dessins`);
        products = await res.json();
        displayProducts();
        if(document.getElementById("productList")) displayAdmin();
    } catch (e) {
        console.error("Erreur de connexion au serveur.");
    }
}

// --- BOUTIQUE ---
function displayNav(){
    const nav = document.getElementById("nav-categories");
    if(!nav) return;
    nav.innerHTML = categories.map(cat => `<button onclick="displayProducts('${cat}')">${cat}</button>`).join("");
}

function displayProducts(filter="Tous"){
    const c = document.getElementById("catalogue");
    if(!c) return;

    c.innerHTML = products
    .filter(p => filter === "Tous" || p.category === filter)
    .map((p) => `
        <div class="product-card">
            <div class="img-container"><img src="${p.image}"></div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="desc"><strong>Type :</strong> ${p.typeDessin || "-"} | <strong>Taille :</strong> ${p.taille || "-"}</p>
                <p class="desc">${p.description || ""}</p>
                <h4 class="price">${p.prix ? p.prix + ' €' : 'Sur demande'}</h4>
                <button onclick="addToCart(${p.id})">Ajouter à ma sélection</button>
            </div>
        </div>`).join("");
}

// --- PANIER (Local) ---
function addToCart(id){
    const product = products.find(p => p.id === id);
    if(!product) return;

    const existing = cart.find(c => c.id === id);
    if(existing) existing.qty++;
    else cart.push({...product, qty: 1});

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCart();
}

function updateCart(){
    const count = document.getElementById("cart-count");
    if(count) count.innerText = cart.length;

    const c = document.getElementById("cart-items");
    if(!c) return;

    c.innerHTML = cart.map((p, i) => `
        <div class="cart-item">
            <span>${p.name} x${p.qty}</span>
            <div>
                <button onclick="changeQty(${i},1)">+</button>
                <button onclick="changeQty(${i},-1)">-</button>
                <button onclick="removeFromCart(${i})">X</button>
            </div>
        </div>`).join("");
}

function changeQty(i, d){
    cart[i].qty += d;
    if(cart[i].qty <= 0) cart.splice(i,1);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCart();
}

function removeFromCart(i){
    cart.splice(i,1);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCart();
}

function toggleCart(){ document.getElementById("cart").classList.toggle("hidden"); }
function goCheckout(){ window.location.href = "checkout.html"; }

// --- CHECKOUT ---
function displayCheckout(){
    const c = document.getElementById("order-summary");
    if(!c) return;
    c.innerHTML = cart.map(p => `<p>${p.name} x${p.qty} - ${p.prix * p.qty}€</p>`).join("");
}

async function validerCommande(event) {
    event.preventDefault();
    if (cart.length === 0) return alert("Votre sélection est vide.");

    const data = {
        client: {
            nom: document.getElementById("client-nom").value,
            email: document.getElementById("client-email").value,
            adresse: document.getElementById("client-adresse").value
        },
        panier: cart
    };

    try {
        const res = await fetch(`${API_URL}/commandes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        alert("Demande de devis/commande envoyée ! N°" + result.commandeId);
        cart = [];
        localStorage.removeItem("cart");
        window.location.href = "index.html";
    } catch(e) {
        alert("Erreur lors de l'envoi");
    }
}

// --- ADMIN ---
function checkPassword(){
    if(document.getElementById("password").value === ADMIN_PASSWORD){
        document.getElementById("login").style.display="none";
        document.getElementById("admin-panel").style.display="block";
        updateSelect();
        loadProducts();
        fetchCommandes();
    } else { alert("Code incorrect"); }
}

function updateSelect(){
    const s = document.getElementById("categorySelect");
    if(s) s.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
}

function saveProduct(){
    const file = document.getElementById("imageFile").files[0];
    if(!document.getElementById("name").value) return alert("Nom requis.");

    if(file) {
        const reader = new FileReader();
        reader.onload = e => sendProductToServer(e.target.result);
        reader.readAsDataURL(file);
    } else { sendProductToServer(""); }
}

async function sendProductToServer(imageData) {
    const product = {
        name: document.getElementById("name").value.trim(),
        category: document.getElementById("categorySelect").value,
        typeDessin: document.getElementById("typeDessin").value.trim(),
        taille: document.getElementById("taille").value.trim(),
        prix: document.getElementById("prix").value,
        description: document.getElementById("description").value,
        stock: document.getElementById("stock").value || 1,
        image: imageData
    };

    await fetch(`${API_URL}/dessins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product)
    });
    alert("Oeuvre ajoutée avec succès !");
    loadProducts();
}

function displayAdmin(){
    const c = document.getElementById("productList");
    if(!c) return;
    c.innerHTML = products.map((p) => `
        <div class="card" style="padding:15px; margin-bottom:10px;">
            <h4>${p.name} - ${p.prix}€</h4>
            <p>Stock: ${p.stock} | Type: ${p.typeDessin}</p>
        </div>`).join("");
}

async function fetchCommandes() {
    const res = await fetch(`${API_URL}/commandes`);
    const commandes = await res.json();
    const cList = document.getElementById("commandesList");
    if(!cList) return;

    cList.innerHTML = commandes.map(c => `
        <div style="background: rgba(0,0,0,0.2); padding: 15px; margin-top: 10px; border-radius: 8px;">
            <strong style="color:var(--accent)">Demande #${c.id}</strong> - ${new Date(c.date).toLocaleDateString()}<br>
            Client: ${c.nom} (${c.email})<br>
            Adresse/Infos: ${c.adresse}
        </div>
    `).join("");
}