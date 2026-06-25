function comprarDesdeDetalle(id, name, price, image) {
    let localCart = [];
    if (localStorage.getItem("luvox_cart")) {
        localCart = JSON.parse(localStorage.getItem("luvox_cart"));
    }
    const existing = localCart.find(i => i.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        localCart.push({ id, name, salePrice: price, image, quantity: 1 });
    }
    localStorage.setItem("luvox_cart", JSON.stringify(localCart));
    
    // Mostrar Toast de redirección
    const t = document.getElementById("toast");
    t.classList.replace("opacity-0", "opacity-100");
    t.classList.replace("translate-y-10", "translate-y-0");
    
    setTimeout(() => { window.location.href = "/"; }, 1200);
}