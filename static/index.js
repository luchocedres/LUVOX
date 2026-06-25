let products = [];
let filteredProducts = [];
let cart = [];
let currentCategory = 'TODOS';

window.tailwind.config = {
    theme: { extend: { colors: { darkCard: '#0f1626' } } }
};

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("luvox_cart")) {
        try {
            cart = JSON.parse(localStorage.getItem("luvox_cart"));
            updateCartUI();
        } catch(e) { cart = []; }
    }
    loadStoreProducts();
    loadStoreCategories(); // Inicializa la carga dinámica de categorías
    initFormConsultaGmail(); // Inicializa el listener del formulario de contacto
});

// Carga e inyecta las categorías dinámicas directo desde el Backend
async function loadStoreCategories() {
    const container = document.getElementById("categoriesNavContainer");
    if (!container) return;

    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();

        // Creamos siempre el botón principal "Todos"
        let htmlBotones = `
            <button onclick="filtrarCategoria('TODOS')" id="btnCat-TODOS" class="cat-btn px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold transition-all shadow-md whitespace-nowrap cursor-pointer">
                Todos
            </button>
        `;

        // Mapeamos dinámicamente las categorías reales guardadas por el admin
        categories.forEach(cat => {
            const catUpper = cat.toUpperCase();
            htmlBotones += `
                <button onclick="filtrarCategoria('${catUpper}')" id="btnCat-${catUpper.replace(/\s+/g, '-')}" class="cat-btn px-4 py-2 rounded-xl bg-gray-950 border border-gray-800 text-gray-400 hover:text-white transition-colors whitespace-nowrap cursor-pointer">
                    ${cat}
                </button>
            `;
        });

        container.innerHTML = htmlBotones;
        
        // Sincroniza visualmente cuál está activo por si cambió el estado inicial
        actualizarEstiloBotonesCategoria();

    } catch (err) {
        console.error("Error cargando categorías dinámicas:", err);
    }
}

async function loadStoreProducts() {
    try {
        const res = await fetch('/api/products');
        const rawProducts = await res.json();
        
        products = rawProducts.map(p => {
            let realGallery = (p.gallery && p.gallery.length > 0) ? p.gallery : [p.image];
            let realSpecs = p.specs 
                ? p.specs.split('\n').filter(s => s.trim() !== '') 
                : ["Componentes premium de alta durabilidad", "Certificación de calidad LUVOX Lab"];
            let realColors = (p.colors && p.colors.length > 0) 
                ? p.colors 
                : [{ name: "Standard", code: "#3b82f6", img: p.image }];
            
            return {
                ...p,
                gallery: realGallery,
                colors: realColors,
                specs: realSpecs
            };
        });
        
        filteredProducts = [...products];
        document.getElementById("productsLoading").classList.add("hidden");
        renderGrid(filteredProducts);
    } catch(err) { console.error(err); }
}

function renderGrid(list) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if(list.length === 0) {
        grid.innerHTML = `<p class="text-xs font-mono text-gray-500 text-center col-span-full py-8">No se encontraron productos coincidentes.</p>`;
        return;
    }
    list.forEach(p => {
        const el = document.createElement("div");
        el.className = "bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between hover:border-gray-700 transition-all shadow-xl relative group cursor-pointer";
        el.onclick = (e) => {
            if(e.target.tagName !== 'BUTTON') verDetalleProducto(p.id);
        };
        
        let precioHTML = "";
        let tieneOferta = p.promoPrice && p.promoPrice > 0 && p.promoPrice < p.salePrice;
        
        if (tieneOferta) {
            precioHTML = `
                <div class="my-2 font-mono flex flex-wrap items-center gap-1.5">
                    <span class="text-xs line-through text-gray-500">ARS $${p.salePrice.toLocaleString('es-AR')}</span>
                    <span class="text-purple-400 font-bold text-sm">ARS $${p.promoPrice.toLocaleString('es-AR')}</span>
                </div>
            `;
        } else {
            precioHTML = `<p class="text-white font-bold text-sm my-2 font-mono">ARS $${p.salePrice.toLocaleString('es-AR')}</p>`;
        }

        let badgeHTML = "";
        if (p.stock <= 0) {
            badgeHTML = `<span class="absolute top-3 right-3 bg-rose-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider z-10">Agotado</span>`;
        } else if (tieneOferta) {
            badgeHTML = `<span class="absolute top-3 right-3 bg-purple-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider z-10 animate-pulse">Oferta</span>`;
        }

        el.innerHTML = `
            ${badgeHTML}
            <div class="h-36 flex items-center justify-center mb-2 p-2 bg-slate-950/40 rounded-xl border border-gray-800/30 overflow-hidden relative">
                <img src="${p.image}" class="max-h-full max-w-full object-contain rounded-lg group-hover:scale-102 transition-transform duration-300">
            </div>
            <span class="text-[9px] text-cyan-400 uppercase font-bold tracking-widest block mb-1">${p.category}</span>
            <h4 class="text-white font-bold text-sm truncate font-display">${p.name}</h4>
            ${precioHTML}
            <div class="grid grid-cols-2 gap-2 mt-2">
                <button onclick="verDetalleProducto(${p.id})" class="py-2.5 bg-gray-950 text-center text-gray-400 hover:text-white text-[10px] font-bold rounded-xl border border-gray-800 transition-colors">Detalles</button>
                ${p.stock > 0 ? `
                    <button onclick="addToCart(${p.id})" class="py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-[10px] font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity cursor-pointer">
                        + Carrito
                    </button>
                ` : `
                    <button disabled class="py-2.5 bg-gray-800 text-gray-500 text-[10px] font-bold rounded-xl cursor-not-allowed">
                        Agotado
                    </button>
                `}
            </div>
        `;
        grid.appendChild(el);
    });
}

function filtrarCategoria(cat) {
    currentCategory = cat.toUpperCase();
    actualizarEstiloBotonesCategoria();
    filtrarCatalogo();
}

// Handler interno para alternar las clases activas/inactivas de los botones de forma segura
function actualizarEstiloBotonesCategoria() {
    document.querySelectorAll(".cat-btn").forEach(btn => {
        btn.className = "cat-btn px-4 py-2 rounded-xl bg-gray-950 border border-gray-800 text-gray-400 hover:text-white transition-colors whitespace-nowrap cursor-pointer";
    });
    
    const idActivo = `btnCat-${currentCategory.replace(/\s+/g, '-')}`;
    const btnActivo = document.getElementById(idActivo);
    if (btnActivo) {
        btnActivo.className = "cat-btn px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold transition-all shadow-md whitespace-nowrap cursor-pointer";
    }
}

function filtrarCatalogo() {
    const input = document.getElementById("storeSearchInput");
    const term = input ? input.value.toLowerCase() : "";
    filteredProducts = products.filter(p => {
        const matchTerm = p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
        const matchCat = currentCategory === 'TODOS' || p.category.toUpperCase() === currentCategory;
        return matchTerm && matchCat;
    });
    renderGrid(filteredProducts);
}

function verDetalleProducto(id) {
    const p = products.find(prod => prod.id === id);
    if(!p) return;
    
    document.getElementById("tiendaSection").classList.add("hidden");
    document.getElementById("checkoutSection").classList.add("hidden");
    const container = document.getElementById("detalleProductoSection");
    container.classList.remove("hidden");
    
    let tieneOferta = p.promoPrice && p.promoPrice > 0 && p.promoPrice < p.salePrice;
    let precioDetalleHTML = tieneOferta ? `
        <div class="flex items-center gap-3 mt-3">
            <span class="text-sm line-through text-gray-500 font-mono">ARS $${p.salePrice.toLocaleString('es-AR')}</span>
            <span class="text-purple-400 font-bold text-2xl font-mono">ARS $${p.promoPrice.toLocaleString('es-AR')}</span>
            <span class="bg-purple-950 text-purple-400 font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-purple-800 uppercase">PROMO HYPE</span>
        </div>
    ` : `
        <div class="text-cyan-400 font-bold text-2xl font-mono mt-3">ARS $${p.salePrice.toLocaleString('es-AR')}</div>
    `;
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div class="md:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
                <div class="flex sm:flex-col gap-2 overflow-auto max-h-[350px]">
                    ${p.gallery.map((img, i) => `
                        <img src="${img}" onclick="document.getElementById('mainImgView').src='${img}'" class="w-14 h-14 object-contain p-1 border border-gray-800 rounded-xl bg-slate-950/40 cursor-pointer hover:border-cyan-500 transition-all">
                    `).join('')}
                </div>
                <div class="flex-1 bg-slate-950/40 rounded-2xl border border-gray-900 p-4 flex items-center justify-center h-80 sm:h-[400px]">
                    <img id="mainImgView" src="${p.image}" class="max-h-full max-w-full object-contain rounded-xl transition-all duration-300">
                </div>
            </div>
            
            <div class="md:col-span-5 flex flex-col justify-between space-y-6">
                <div>
                    <span class="text-[10px] font-mono text-gray-500 uppercase tracking-widest">${p.category} | Ecosistema Oficial</span>
                    <h2 class="text-white font-display font-bold text-xl mt-1 leading-tight">${p.name}</h2>
                    ${precioDetalleHTML}
                    <p class="text-[11px] text-gray-400 mt-2 font-mono"><i class="fa-solid fa-box text-emerald-400 mr-1"></i> Stock disponible: <span class="text-white">${p.stock} unidades</span></p>
                </div>

                <div class="space-y-2">
                    <span class="block text-[10px] font-mono uppercase tracking-wider text-gray-400">Seleccionar Color / Variación:</span>
                    <div class="flex items-center gap-3">
                        ${p.colors.map((c, idx) => `
                            <button onclick="document.getElementById('mainImgView').src='${c.img}'; document.getElementById('selectedColorName').innerText='${c.name}'" class="w-7 h-7 rounded-full border-2 border-gray-800 focus:border-cyan-500 p-0.5 transition-all" style="background-color: ${c.code}" title="${c.name}"></button>
                        `).join('')}
                        <span id="selectedColorName" class="text-xs text-gray-400 font-mono">${p.colors[0]?.name || ''}</span>
                    </div>
                </div>

                <div class="border-t border-gray-800 pt-4 space-y-2">
                    <h5 class="text-white font-bold text-xs uppercase font-display">Especificaciones de Entrega:</h5>
                    <ul class="text-[11px] text-gray-400 space-y-1 font-mono">
                        ${p.specs.map(s => `<li><i class="fa-solid fa-check text-cyan-400 mr-1.5"></i>${s}</li>`).join('')}
                    </ul>
                </div>

                <div class="grid grid-cols-1 gap-2 pt-2">
                    ${p.stock > 0 ? `
                        <button onclick="addToCart(${p.id}); toggleCart();" class="w-full py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold text-xs uppercase rounded-xl tracking-wider shadow-lg hover:opacity-95 transition-opacity cursor-pointer">
                            Agregar al Carrito
                        </button>
                    ` : `
                        <button disabled class="w-full py-3 bg-gray-800 text-gray-500 text-xs font-bold rounded-xl cursor-not-allowed">Agotado</button>
                    `}
                    <button onclick="regresarAlCatalogo(event)" class="w-full py-2.5 bg-gray-950 border border-gray-800 text-gray-400 hover:text-white text-[11px] font-bold rounded-xl transition-colors">
                        <i class="fa-solid fa-arrow-left mr-1"></i> Volver al Catálogo
                    </button>
                </div>
            </div>
        </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function regresarAlCatalogo(e) {
    if(e) e.preventDefault();
    document.getElementById("detalleProductoSection").classList.add("hidden");
    document.getElementById("checkoutSection").classList.add("hidden");
    document.getElementById("tiendaSection").classList.remove("hidden");
    
    // Mantiene vivo el filtro (y la categoría) que el usuario estaba viendo
    filtrarCatalogo(); 
}

// Carrito Drawer Toggle
function toggleCart() { document.getElementById("cartDrawer").classList.toggle("translate-x-full"); }

function addToCart(id) {
    const item = products.find(p => p.id === id);
    if (!item) return;
    const existing = cart.find(i => i.id === id);
    if (existing) {
        if (existing.quantity >= item.stock) return showToast("Límite de stock alcanzado.");
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }
    updateCartUI();
    showToast(`Agregado: ${item.name}`);
}

function changeQuantity(id, amt) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity += amt;
    if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById("cartItemsContainer");
    if (!container) return;
    container.innerHTML = "";
    let total = 0, count = 0;
    
    cart.forEach(item => {
        let precioEfectivo = (item.promoPrice && item.promoPrice > 0 && item.promoPrice < item.salePrice) 
            ? item.promoPrice 
            : item.salePrice;
            
        total += precioEfectivo * item.quantity;
        count += item.quantity;
        
        const row = document.createElement("div");
        row.className = "flex items-center justify-between p-2 bg-gray-950 rounded-xl border border-gray-800";
        row.innerHTML = `
            <div class="truncate max-w-[160px]">
                <span class="text-white text-xs block truncate">${item.name}</span>
                <span class="text-[10px] ${item.promoPrice > 0 ? 'text-purple-400 font-bold' : 'text-gray-500'}">
                    $${precioEfectivo.toLocaleString('es-AR')}
                </span>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="changeQuantity(${item.id}, -1)" class="px-1.5 py-0.5 bg-gray-800 text-white rounded">-</button>
                <span class="text-white text-xs w-4 text-center">${item.quantity}</span>
                <button onclick="changeQuantity(${item.id}, 1)" class="px-1.5 py-0.5 bg-gray-800 text-white rounded">+</button>
            </div>
        `;
        container.appendChild(row);
    });
    
    document.getElementById("cartCount").innerText = count;
    document.getElementById("cartTotal").innerText = `$${total.toLocaleString('es-AR')}`;
    localStorage.setItem("luvox_cart", JSON.stringify(cart));
    
    if(document.getElementById("summarySubtotal")) document.getElementById("summarySubtotal").innerText = `ARS $${total.toLocaleString('es-AR')}`;
    if(document.getElementById("summaryTotal")) document.getElementById("summaryTotal").innerText = `ARS $${total.toLocaleString('es-AR')}`;
}

function abrirCheckout() {
    if(cart.length === 0) return;
    toggleCart();
    document.getElementById("tiendaSection").classList.add("hidden");
    document.getElementById("detalleProductoSection").classList.add("hidden");
    document.getElementById("checkoutSection").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarCheckout() {
    document.getElementById("checkoutSection").classList.add("hidden");
    document.getElementById("tiendaSection").classList.remove("hidden");
}

// Variables globales para almacenar los datos del último pedido exitoso
let datosUltimoPedido = {
    orderId: "",
    totalFormateado: ""
};

async function procesarOrdenDirecta(e) {
    e.preventDefault();
    
    const overlay = document.getElementById("paymentOverlay");
    const stateProcessing = document.getElementById("paymentStateProcessing");
    const stateApproved = document.getElementById("paymentStateApproved");
    
    stateApproved.classList.add("hidden");
    stateProcessing.classList.remove("hidden");
    overlay.classList.remove("hidden");
    
    let totalNeto = 0;
    cart.forEach(i => {
        let precioEfectivo = (i.promoPrice && i.promoPrice > 0 && i.promoPrice < i.salePrice) ? i.promoPrice : i.salePrice;
        totalNeto += precioEfectivo * i.quantity;
    });
    
    // Captura segura del input email para evitar valores nulos en el backend
    const emailInput = document.getElementById("checkoutEmail");
    const emailValue = emailInput ? emailInput.value.trim() : "";
    
    const payload = {
        name: document.getElementById("checkoutName").value,
        phone: document.getElementById("checkoutPhone").value,
        email: emailValue || "No especificado", 
        shippingMethod: document.getElementById("checkoutShippingMethod").value,
        city: document.getElementById("checkoutCity").value,
        address: document.getElementById("checkoutAddress").value,
        paymentMethod: "transfer",
        paymentRef: document.getElementById("checkoutPaymentRef").value,
        cart: cart
    };
    
    try {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            datosUltimoPedido.orderId = data.orderId;
            datosUltimoPedido.totalFormateado = `ARS $${totalNeto.toLocaleString('es-AR')}`;
            
            document.getElementById("approvedOrderId").innerText = `#${data.orderId}`;
            document.getElementById("approvedTotal").innerText = datosUltimoPedido.totalFormateado;
            
            cart = [];
            localStorage.removeItem("luvox_cart");
            updateCartUI();

            setTimeout(() => {
                stateProcessing.classList.add("hidden");
                stateApproved.classList.remove("hidden");
                setTimeout(() => {
                    stateApproved.classList.replace("scale-95", "scale-100");
                    stateApproved.classList.replace("opacity-0", "opacity-100");
                }, 50);
            }, 2500);
            
        } else {
            overlay.classList.add("hidden");
            showToast("Error al procesar la orden interna.");
        }
    } catch(err) { 
        console.error(err);
        overlay.classList.add("hidden");
        showToast("Error crítico de conexión.");
    }
}

function enviarNotificacionWhatsApp(enviarMensaje) {
    if (enviarMensaje) {
        const tuNumeroWhatsApp = "5493446332679"; 
        
        const mensaje = `¡Hola LUVOX! Acabo de registrar el pago de mi pedido.\n\n` +
                        `• Orden: #${datosUltimoPedido.orderId}\n` +
                        `• Total: ${datosUltimoPedido.totalFormateado}\n\n` +
                        `Quedo a la espera de la validación de la transferencia para coordinar el despacho. ¡Muchas gracias!`;
        
        const urlWhatsApp = `https://wa.me/${tuNumeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
        window.open(urlWhatsApp, '_blank');
    }
    
    window.location.href = "/";
}

function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `<i class="fa-solid fa-check mr-1 text-emerald-400"></i>¡Copiado!`;
        btnElement.classList.replace("text-cyan-400", "text-emerald-400");
        btnElement.classList.replace("border-gray-800", "border-emerald-500/30");
        
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.classList.replace("text-emerald-400", "text-cyan-400");
            btnElement.classList.replace("border-emerald-500/30", "border-gray-800");
        }, 2000);
    }).catch(err => {
        console.error("Fallo al copiar datos: ", err);
    });
}

function toggleFaq(btn) {
    const content = btn.nextElementSibling;
    const icon = btn.querySelector("i");
    
    document.querySelectorAll("#tiendaSection div.max-h-0").forEach(el => {
        if (el !== content && el.style.maxHeight) {
            el.style.maxHeight = null;
            el.previousElementSibling.querySelector("i").classList.remove("rotate-180");
        }
    });

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.classList.remove("rotate-180");
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.classList.add("rotate-180");
    }
}

function initFormConsultaGmail() {
    const form = document.getElementById("formConsultaGmail");
    if (!form) return;
    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById("nodeName").value,
            email: document.getElementById("nodeEmail").value,
            message: document.getElementById("nodeMessage").value
        };
        
        try {
            const res = await fetch('/api/consultas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            showToast("Consulta transmitida al nodo central.");
            form.reset();
        } catch (err) {
            console.log("Datos capturados de consulta:", payload);
            showToast("Consulta enviada con éxito.");
            form.reset();
        }
    });
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    const label = document.getElementById("toastMessage");
    if(!toast || !label) return;
    
    label.innerText = msg;
    toast.classList.replace("opacity-0", "opacity-100");
    toast.classList.replace("translate-y-10", "translate-y-0");
    
    setTimeout(() => {
        toast.classList.replace("opacity-100", "opacity-0");
        toast.classList.replace("translate-y-0", "translate-y-10");
    }, 3000);
}