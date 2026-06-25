// ========================================================
// 🚀 INICIALIZACIÓN UNIFICADA
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
    // Cargamos datos iniciales de la vista
    cargarOrdenesAdmin();
    cargarCategorias();
    cargarProductosCatalog();

    // Vinculamos el formulario por código de forma blindada
    const form = document.getElementById("adminProductForm");
    if (form) {
        form.onsubmit = async (e) => {
            // ⚠️ FRENAMOS EL REINICIO DE LA PÁGINA EN EL ACTO
            e.preventDefault(); 
            
            console.log("Formulario interceptado correctamente. Sincronizando hardware...");
            
            // Llamamos a tu función pasándole el evento para que no rompa
            await procesarFormularioProducto(e);
        };
    }
});

// NAVEGACIÓN ENTRE PESTAÑAS
function switchTab(tab) {
    if(tab === 'orders') {
        document.getElementById('tab-orders').classList.remove('hidden');
        document.getElementById('tab-inventory').classList.add('hidden');
        document.getElementById('tabBtn-orders').className = "px-4 py-2 rounded-lg text-white bg-purple-600 font-bold transition-all cursor-pointer";
        document.getElementById('tabBtn-inventory').className = "px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer";
        cargarOrdenesAdmin();
    } else {
        document.getElementById('tab-orders').classList.add('hidden');
        document.getElementById('tab-inventory').classList.remove('hidden');
        document.getElementById('tabBtn-orders').className = "px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer";
        document.getElementById('tabBtn-inventory').className = "px-4 py-2 rounded-lg text-white bg-purple-600 font-bold transition-all cursor-pointer";
        cargarProductosCatalog();
    }
}

// ========================================================
// 📊 SECCIÓN: GESTIÓN DE ÓRDENES
// ========================================================
async function cargarOrdenesAdmin() {
    const tbody = document.getElementById("adminOrdersTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    try {
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();
        
        window.orders = orders;
        let p = 0, a = 0, r = 0;
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-gray-500 italic">No se han registrado transacciones entrantes aún.</td></tr>`;
            actualizarContadores(0, 0, 0);
            return;
        }
        
        orders.forEach(o => {
            if(o.status === 'pending' || o.estado === 'pending') p++;
            else if(o.status === 'approved' || o.estado === 'approved') a++;
            else if(o.status === 'rejected' || o.estado === 'rejected') r++;
            
            const tr = document.createElement("tr");
            tr.className = `hover:bg-slate-950/30 border-y border-gray-900 ${o.status === 'pending' ? 'bg-purple-950/5 border-l-2 border-l-purple-500' : ''}`;
            
            const prodHTML = o.cart.map(i => `<div class="text-[10px] text-gray-300"><span class="text-cyan-400 font-bold">x${i.quantity}</span> ${i.name}</div>`).join('');
            
            let badge = '';
            if (o.status === 'pending' || o.estado === 'pending') {
                badge = `
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="cambiarEstadoOrden(${o.orderId || o.id}, 'approved')" class="px-2 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded text-[10px] font-bold cursor-pointer hover:bg-emerald-900">✓</button>
                        <button onclick="cambiarEstadoOrden(${o.orderId || o.id}, 'rejected')" class="px-2 py-1 bg-rose-950 border border-rose-800 text-rose-400 rounded text-[10px] font-bold cursor-pointer hover:bg-rose-900">✕</button>
                    </div>
                `;
            } else {
                const esAprobado = o.status === 'approved' || o.estado === 'approved' || o.status === 'Enviado' || o.shipping_status === 'Enviado';
                const esRechazado = o.status === 'rejected' || o.estado === 'rejected';
                
                let textoMostrar = 'Aprobado';
                if (esRechazado) textoMostrar = 'Rechazado';
                
                badge = `<span class="text-center block text-[10px] font-bold uppercase tracking-wider ${esAprobado ? 'text-emerald-400' : 'text-rose-500'}">${textoMostrar}</span>`;
            }

            const estadoEnvio = o.shipping_status || o.estado_envio || 'Pendiente';
            const esEnviado = estadoEnvio === 'Enviado';

            tr.innerHTML = `
                <td class="p-3 font-bold text-white">#${o.orderId || o.id}</td>
                <td class="p-3">
                    <div class="font-bold text-white capitalize">${o.name}</div>
                    <div class="text-[10px] text-gray-500 mt-0.5">${o.phone}</div>
                </td>
                <td class="p-3 text-purple-300 select-all max-w-[150px] truncate unique-email-cell font-mono">
                    ${o.email || 'No especificado'}
                </td>
                <td class="p-3">
                    <div class="text-gray-300">${o.city}</div>
                    <div class="text-[10px] text-gray-500 max-w-[120px] truncate" title="${o.address}">${o.address}</div>
                </td>
                <td class="p-3">${prodHTML}</td>
                <td class="p-3 font-bold text-purple-400 bg-purple-950/10 text-center select-all">${o.paymentRef || o.referencia || 'N/A'}</td>
                <td class="p-3 text-cyan-400 font-bold">ARS $${Number(o.total).toLocaleString('es-AR')}</td>
                <td class="p-3">${badge}</td>
                <td class="p-3 text-center whitespace-nowrap">
                    <button
                        onclick="cambiarEstadoEnvio(${o.orderId || o.id}, '${estadoEnvio}')"
                        class="px-2 py-1 text-[9px] font-mono font-bold uppercase rounded border transition-all cursor-pointer ${
                            esEnviado
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/20'
                            : 'bg-amber-950/40 text-amber-400 border-amber-800 hover:bg-amber-900/20'
                        }">
                        <i class="fa-solid ${esEnviado ? 'fa-truck-fast mr-1' : 'fa-clock mr-1'}"></i>
                        ${estadoEnvio}
                    </button>
                </td>
            `;
            
            tr.classList.add('email-inyectado');
            tbody.appendChild(tr);
        });
        
        actualizarContadores(p, a, r);
        
        if(typeof actualizarDashboardCompleto === 'function') {
            actualizarDashboardCompleto(orders);
        }
    } catch(err) { console.error("Error cargando órdenes:", err); }
}

function actualizarContadores(p, a, r) {
    if(document.getElementById("countPendientes")) document.getElementById("countPendientes").innerText = p;
    if(document.getElementById("countAprobadas")) document.getElementById("countAprobadas").innerText = a;
    if(document.getElementById("countRechazadas")) document.getElementById("countRechazadas").innerText = r;
}

// ========================================================
// 🔄 CONTROLADORES DE ESTADO (VINCULADOS AL BACKEND)
// ========================================================
async function cambiarEstadoOrden(orderId, nuevoEstado) {
    if (!confirm(`¿Estás seguro de cambiar el estado de la orden #${orderId} a '${nuevoEstado}'?`)) return;

    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nuevoEstado })
        });

        if (response.ok) {
            alert(`Orden #${orderId} actualizada a: ${nuevoEstado}`);
            cargarOrdenesAdmin();
        } else {
            const errData = await response.json();
            alert(`Error al actualizar: ${errData.message || 'Intente nuevamente'}`);
        }
    } catch (error) {
        console.error("Cortocircuito al cambiar estado de orden:", error);
        alert("Error de red al intentar procesar la acción.");
    }
}

async function cambiarEstadoEnvio(orderId, estadoActual) {
    if (estadoActual === 'Enviado') {
        if (!confirm(`Esta orden ya fue enviada. ¿Deseas sobreescribir el código de seguimiento?`)) return;
    }

    const trackingCode = prompt("🚀 Ingrese el Código de Rastreabilidad (Andreani / Correo Argentino):");
    if (trackingCode === null) return;
    if (trackingCode.trim() === "") {
        alert("El código es obligatorio para poder despachar el paquete y notificar por mail.");
        return;
    }

    try {
        const url = `/api/admin/orders/${orderId}/despachar`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracking_code: trackingCode })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert("¡Ecosistema Actualizado! Orden despachada y cliente notificado.");
            cargarOrdenesAdmin();
        } else {
            alert(`Error del Servidor: ${data.message || 'No se pudo procesar.'}`);
        }
    } catch (error) {
        console.error("Cortocircuito en el Fetch de despacho:", error);
    }
}

// ========================================================
// 📦 SECCIÓN: INVENTARIO & ABM PRODUCTOS
// ========================================================
async function cargarCategorias() {
    try {
        const res = await fetch('/api/categories');
        const cats = await res.json();
        
        const select = document.getElementById("prodCategory");
        const containerTags = document.getElementById("categoriesListTags");
        
        if(select) select.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
        if(containerTags) {
            containerTags.innerHTML = cats.map(c => `
                <span class="inline-flex items-center gap-1 bg-gray-900 border border-gray-800 text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded-lg">
                    ${c} <i onclick="eliminarCategoria('${c}')" class="fa-solid fa-xmark text-[8px] text-rose-500 hover:text-rose-400 cursor-pointer ml-1"></i>
                </span>
            `).join('');
        }
    } catch(err) { console.error(err); }
}

async function procesarFormularioProducto(e) {
    if (e) e.preventDefault();
    
    const requiredIds = ["prodId", "prodGallery", "prodImage", "prodName", "prodCategory", "prodPrice", "prodStock", "prodSpecs", "prodIsFeatured", "prodIsFlashSale"];
    for (let id of requiredIds) {
        if (!document.getElementById(id)) {
            console.error(`Error crítico: Falta el elemento con id="${id}" en el HTML.`);
            alert(`Error de maquetación: No se encuentra el campo con ID '${id}'`);
            return;
        }
    }

    const id = document.getElementById("prodId").value;
    const galleryRaw = document.getElementById("prodGallery").value;
    const imgPrincipal = document.getElementById("prodImage").value;
    
    const payload = {
        name: document.getElementById("prodName").value,
        category: document.getElementById("prodCategory").value,
        salePrice: Number(document.getElementById("prodPrice").value),
        promoPrice: Number(document.getElementById("prodPromoPrice")?.value) || 0,
        stock: Number(document.getElementById("prodStock").value),
        image: imgPrincipal,
        gallery: galleryRaw ? galleryRaw : imgPrincipal,
        specs: document.getElementById("prodSpecs").value,
        isFeatured: document.getElementById("prodIsFeatured").checked,
        isFlashSale: document.getElementById("prodIsFlashSale").checked
    };
    
    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
            alert(id ? "Dispositivo actualizado con éxito." : "Hardware inyectado con éxito.");
            resetForm();
            cargarProductosCatalog();
        } else {
            alert("Error del servidor al procesar el hardware.");
        }
    } catch(err) { console.error(err); }
}

// ACCIÓN: ELIMINAR
async function eliminarProducto(id) {
    if(!confirm("¿Seguro querés eliminar permanentemente este hardware del catálogo?")) return;
    try {
        const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
        if((await res.json()).success) cargarProductosCatalog();
    } catch(err) { console.error(err); }
}

// CATEGORÍAS (ALTAS Y BAJAS)
async function crearCategoria() {
    const name = document.getElementById("newCategoryInput").value.trim();
    if(!name) return;
    try {
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        if((await res.json()).success) {
            document.getElementById("newCategoryInput").value = "";
            cargarCategorias();
        }
    } catch(err) { console.error(err); }
}

async function eliminarCategoria(name) {
    if(!confirm(`¿Eliminar la categoría ${name}? Los productos mantendrán su nombre pero perderán el tag.`)) return;
    try {
        const res = await fetch('/api/admin/categories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        if((await res.json()).success) cargarCategorias();
    } catch(err) { console.error(err); }
}

// 🌐 RENDERIZADO DEL CATÁLOGO DE HARDWARE
async function cargarProductosCatalog() {
    try {
        console.log("Solicitando catálogo para el administrador...");
        const response = await fetch('/api/products'); 
        if (!response.ok) throw new Error("Error en la respuesta de la API");
        
        const productos = await response.json();
        
        // 🌟 ARREGLO GLOBAL PARA SECCIÓN EDICIÓN
        window.productosGlobales = productos; 
        
        const tabla = document.getElementById("adminProductsTableBody");
        if (!tabla) return;
        
        tabla.innerHTML = "";
        
        if (productos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-500 font-mono">No hay hardware inyectado en el ecosistema</td></tr>`;
            return;
        }

        productos.forEach(p => {
            const id = p.id || p.id_producto || p.prodId || '';
            const nombre = p.name || p.nombre || 'Sin nombre';
            const categoria = p.category || p.categoria || 'General';
            
            const precioBase = Number(p.precio_base !== undefined ? p.precio_base : (p.price || p.salePrice || p.precio || 0));
            const precioOferta = Number(p.precio_oferta !== undefined ? p.precio_oferta : (p.offer_price || p.promoPrice || p.promo_price || 0));
            
            const stock = p.stock !== undefined ? p.stock : 0;
            const imagen = p.image || p.imagen_url || 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef';

            const tieneOferta = precioOferta > 0; 
            const baseTexto = `ARS $${precioBase.toLocaleString('es-AR')}`;
            const ofertaTexto = tieneOferta ? `ARS $${precioOferta.toLocaleString('es-AR')}` : '-';
            const clasePrecioBase = tieneOferta ? 'line-through text-gray-600 font-mono text-xs' : 'text-gray-300 font-mono text-xs';

            const fila = document.createElement("tr");
            fila.className = "border-b border-gray-900/50 hover:bg-slate-950/20 transition-colors";
            fila.innerHTML = `
                <td class="p-3">
                    <img src="${imagen}" alt="${nombre}" class="w-8 h-8 rounded-lg object-cover border border-gray-800">
                </td>
                <td class="p-3">
                    <div class="font-bold text-white text-xs">${nombre}</div>
                    <div class="text-[9px] text-purple-400 uppercase tracking-widest">${categoria}</div>
                </td>
                <td class="p-3 ${clasePrecioBase}">${baseTexto}</td>
                <td class="p-3 font-bold text-purple-300 font-mono text-xs">${ofertaTexto}</td>
                <td class="p-3 text-center font-mono font-bold text-xs ${stock > 0 ? 'text-cyan-400' : 'text-rose-500'}">
                    ${stock} <span class="text-[9px] text-gray-600 font-normal">u.</span>
                </td>
                <td class="p-3 text-center">
                    <span class="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 rounded text-[10px]">
                        ${p.gallery ? (Array.isArray(p.gallery) ? p.gallery.length : p.gallery.split(',').length) : 1} img.
                    </span>
                </td>
                <td class="p-3 text-right">
                    <div class="flex justify-end gap-1.5">
                        <button onclick="editarProducto('${id}')" class="p-1.5 bg-purple-950/40 border border-purple-900/60 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg transition-all cursor-pointer" title="Editar Hardware">
                            <i class="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button onclick="eliminarProducto('${id}')" class="p-1.5 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all cursor-pointer" title="Eliminar del Ecosistema">
                            <i class="fa-solid fa-trash text-[10px]"></i>
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(fila);
        });

        console.log(`Catálogo renderizado con éxito: ${productos.length} dispositivos montados.`);
    } catch (error) {
        console.error("Cortocircuito al cargar el catálogo de administración:", error);
    }
}

// 🛠️ CONTROL DE EDICIÓN (RELLENAR CAMPOS USANDO IDS CORRECTOS)
function editarProducto(id) {
    if (!window.productosGlobales) {
        console.error("Catálogo de productos global no inicializado aún.");
        return;
    }

    // Buscamos de forma segura en la caché global del window
    const p = window.productosGlobales.find(item => (item.id || item.id_producto || item.prodId) == id);
    
    if (!p) {
        console.error("No se encontró el dispositivo con ID:", id);
        return;
    }

    console.log("Cargando hardware para modificar:", p.name || p.nombre);

    // 🌟 TITULOS E INTERFAZ DEL PANEL DE CONTROL
    if(document.getElementById("formTitle")) document.getElementById("formTitle").innerText = "Editar Hardware";
    if(document.getElementById("btnResetForm")) document.getElementById("btnResetForm").classList.remove("hidden");
    if(document.getElementById("btnSubmitForm")) document.getElementById("btnSubmitForm").innerText = "Guardar Cambios";

    // 🌟 MAAPEO REESTRUCTURADO CON LOS IDS DE TU FORMULARIO REAL
    document.getElementById("prodId").value = p.id || p.id_producto || '';
    document.getElementById("prodName").value = p.name || p.nombre || '';
    document.getElementById("prodCategory").value = p.category || p.categoria || '';
    
    // Mapeo numérico estricto de precios
    document.getElementById("prodPrice").value = p.precio_base !== undefined ? p.precio_base : (p.price || p.salePrice || p.precio || 0);
    if(document.getElementById("prodPromoPrice")) {
        document.getElementById("prodPromoPrice").value = p.precio_oferta !== undefined ? p.precio_oferta : (p.offer_price || p.promoPrice || p.promo_price || 0);
    }
    
    document.getElementById("prodStock").value = p.stock !== undefined ? p.stock : 0;
    document.getElementById("prodImage").value = p.image || p.imagen_url || '';
    document.getElementById("prodGallery").value = p.gallery ? (Array.isArray(p.gallery) ? p.gallery.join(', ') : p.gallery) : (p.image || '');
    document.getElementById("prodSpecs").value = p.specs || p.descripcion || "";
    
    // Checkboxes booleanos
    document.getElementById("prodIsFeatured").checked = p.isFeatured || p.destacado || false;
    document.getElementById("prodIsFlashSale").checked = p.isFlashSale || p.oferta_flash || false;
    
    document.getElementById("prodName").focus();
}

// 📄 RESETEAR FORMULARIO DE FORMA COMPLETA
function resetForm() {
    const form = document.getElementById("adminProductForm");
    if (form) form.reset();
    
    if(document.getElementById("prodId")) document.getElementById("prodId").value = "";
    
    const formTitle = document.getElementById("formTitle");
    const btnReset = document.getElementById("btnResetForm");
    const btnSubmit = document.getElementById("btnSubmitForm");

    if (formTitle) formTitle.textContent = "Inyectar Hardware";
    if (btnReset) btnReset.classList.add("hidden");
    if (btnSubmit) btnSubmit.textContent = "Sincronizar Ecosistema";
    
    console.log("Formulario de administración reseteado a modo inserción.");
}