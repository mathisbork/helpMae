const ADMIN_PASSWORD = "1234";

let products = JSON.parse(localStorage.getItem("products")) || [];
let categories = JSON.parse(localStorage.getItem("categories")) || ["all","noel"];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let editIndex = null;

// SAVE
function save(){
    localStorage.setItem("products", JSON.stringify(products));
    localStorage.setItem("categories", JSON.stringify(categories));
}

// NAV
function displayNav(){
    const nav = document.getElementById("nav-categories");
    if(!nav) return;

    nav.innerHTML = "";

    categories.forEach(cat=>{
        nav.innerHTML += `<button onclick="filterCategory('${cat}')">${cat}</button>`;
    });
}

// FILTER
function filterCategory(cat){
    displayProducts(cat);
}

// DISPLAY PRODUCTS
function displayProducts(filter="all"){
    const c = document.getElementById("catalogue");
    if(!c) return;

    c.innerHTML = "";

    products
    .filter(p => filter==="all" || p.category===filter)
    .forEach((p,i)=>{

        c.innerHTML += `
        <div class="product-card">
            <div class="img-container">
                <img src="${p.image}">
            </div>

            <div class="product-info">
                <h3>${p.name || "Sans nom"}</h3>
                <p class="desc">${p.description || ""}</p>
                <p class="stock">Stock: ${p.stock}</p>

                <button onclick="addToCart(${i})">Ajouter</button>
            </div>
        </div>`;
    });
}

// CART
function addToCart(i){
    const existing = cart.find(c => c.name === products[i].name);

    if(existing){
        existing.qty++;
    } else {
        cart.push({...products[i], qty:1});
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCart();
}

function updateCart(){
    const count = document.getElementById("cart-count");
    if(count) count.innerText = cart.length;

    const c = document.getElementById("cart-items");
    if(!c) return;

    c.innerHTML = "";

    cart.forEach((p,i)=>{
        c.innerHTML += `
        <div class="cart-item">
            <span>${p.name} x${p.qty}</span>
            <div>
                <button onclick="changeQty(${i},1)">+</button>
                <button onclick="changeQty(${i},-1)">-</button>
                <button onclick="removeFromCart(${i})">X</button>
            </div>
        </div>`;
    });
}

function changeQty(i,d){
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

function toggleCart(){
    document.getElementById("cart").classList.toggle("hidden");
}

function goCheckout(){
    window.location.href = "checkout.html";
}

// CHECKOUT
function displayCheckout(){
    const c = document.getElementById("order-summary");
    if(!c) return;

    c.innerHTML = cart.map(p=>`<p>${p.name} x${p.qty}</p>`).join("");
}

// ADMIN LOGIN
function checkPassword(){
    if(password.value === ADMIN_PASSWORD){
        login.style.display="none";
        document.getElementById("admin-panel").style.display="block";

        displayAdmin();
        displayCategories();
        updateSelect();
    }
}

// CATEGORY
function addCategory(){
    if(!newCategory.value) return;
    categories.push(newCategory.value);
    save();
    displayCategories();
    updateSelect();
    displayNav();
}

function displayCategories(){
    const c = document.getElementById("categoryList");
    if(!c) return;

    c.innerHTML = categories.map((cat,i)=>`
        <div>${cat} <button onclick="deleteCategory(${i})">X</button></div>
    `).join("");
}

function deleteCategory(i){
    categories.splice(i,1);
    save();
    displayCategories();
    updateSelect();
    displayNav();
}

function updateSelect(){
    const s = document.getElementById("categorySelect");
    if(!s) return;

    s.innerHTML = categories.map(c=>`<option>${c}</option>`).join("");
}

// PRODUCT (UPLOAD IMAGE FIX)
function saveProduct(){

    const file = document.getElementById("imageFile").files[0];

    if(!name.value || !file){
        alert("Remplis nom + image");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e){

        const product = {
            name: name.value.trim(),
            category: categorySelect.value,
            image: e.target.result,
            description: description.value || "",
            stock: stock.value || 0
        };

        if(editIndex !== null){
            products[editIndex] = product;
            editIndex = null;
        } else {
            products.push(product);
        }

        save();
        displayAdmin();
        displayProducts();
    };

    reader.readAsDataURL(file);
}

// ADMIN DISPLAY
function displayAdmin(){
    const c = document.getElementById("productList");
    if(!c) return;

    c.innerHTML = products.map((p,i)=>`
        <div class="card">
            <h3>${p.name}</h3>
            <button onclick="editProduct(${i})">Modifier</button>
            <button onclick="deleteProduct(${i})">Supprimer</button>
        </div>
    `).join("");
}

function editProduct(i){
    const p = products[i];

    name.value = p.name;
    categorySelect.value = p.category;
    description.value = p.description;
    stock.value = p.stock;

    editIndex = i;
}

function deleteProduct(i){
    products.splice(i,1);
    save();
    displayAdmin();
    displayProducts();
}

// INIT
document.addEventListener("DOMContentLoaded", ()=>{
    displayNav();
    displayProducts();
    updateCart();
    displayCheckout();
});