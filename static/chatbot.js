// ========================================================
// 🤖 LÓGICA BLINDADA DEL BOT DE ATENCIÓN (chatbot.js)
// ========================================================

function toggleChat() {
    const chatWindow = document.getElementById("chat-window");
    if (chatWindow) {
        chatWindow.classList.toggle("hidden");
        scrollChatAlFinal();
    } else {
        console.error("Error: No se encontró el elemento HTML con id='chat-window'");
    }
}

function scrollChatAlFinal() {
    const container = document.getElementById("chat-messages");
    if (container) container.scrollTop = container.scrollHeight;
}

function appendMensaje(texto, esUsuario = false) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const wrapper = document.createElement("div");
    
    if(esUsuario) {
        wrapper.className = "flex justify-end w-full";
        wrapper.innerHTML = `
            <div class="bg-purple-600 text-white text-xs p-3 rounded-2xl rounded-tr-none max-w-[85%] shadow-md select-none">
                ${texto}
            </div>
        `;
    } else {
        wrapper.className = "flex items-start gap-2 max-w-[85%]";
        wrapper.innerHTML = `
            <div class="bg-gray-900 border border-gray-800 text-gray-200 text-xs p-3 rounded-2xl rounded-tl-none leading-relaxed">
                ${texto}
            </div>
        `;
    }
    container.appendChild(wrapper);
    scrollChatAlFinal();
}

async function seleccionarOpcion(tipo) {
    const inputContainer = document.getElementById("chat-input-container");
    if (inputContainer) inputContainer.classList.add("hidden");
    
    if(tipo === 'pagos') {
        appendMensaje("Métodos de Pago", true);
        setTimeout(() => {
            appendMensaje("💳 **Formas de pago autorizadas:**<br>• **Transferencia Bancaria:** Al finalizar tu compra se te congelan los datos de la cuenta. Recordá mandar el comprobante por la web.<br>• **Mercado Pago:** Aceptamos dinero en cuenta, tarjetas de débito y crédito.");
        }, 400);
    } 
    else if(tipo === 'envios') {
        appendMensaje("Tiempos de Envío", true);
        setTimeout(() => {
            appendMensaje("📦 **Logística de despachos:**<br>Despachamos mediante **Andreani** y **Correo Argentino** a todo el país. Una vez que tu pago es aprobado por la administración, el paquete sale del depósito en un plazo de 24/48 hs hábiles y te llega el código de rastreo por mail.");
        }, 400);
    } 
    else if(tipo === 'estado_orden') {
        appendMensaje("Estado de mi Orden", true);
        setTimeout(() => {
            appendMensaje("🚀 **Rastreador en Tiempo Real**<br>Por favor, ingresá **solo el número** de tu orden (ejemplo: `12`) en la barra de texto de acá abajo para verificar el estado de tu hardware:");
            if (inputContainer) {
                inputContainer.classList.remove("hidden");
                const userInput = document.getElementById("chat-user-input");
                if (userInput) {
                    userInput.focus();
                    // Vinculación segura en caliente para el teclado
                    userInput.onkeypress = function(e) {
                        if(e.key === 'Enter') ejecutarConsultaOrden();
                    };
                }
            }
            const sendBtn = document.getElementById("chat-send-btn");
            if(sendBtn) sendBtn.onclick = ejecutarConsultaOrden;
        }, 400);
    }
}

async function ejecutarConsultaOrden() {
    const input = document.getElementById("chat-user-input");
    if (!input) return;
    
    const orderId = input.value.trim();
    if(!orderId) return;

    appendMensaje(`Consultar orden #${orderId}`, true);
    input.value = "";
    
    const inputContainer = document.getElementById("chat-input-container");
    if (inputContainer) inputContainer.classList.add("hidden");

    if(isNaN(orderId)) {
        setTimeout(() => { appendMensaje("⚠️ El identificador debe ser numérico. Por favor, volvé a seleccionar la opción de consultar orden."); }, 500);
        return;
    }

    try {
        const response = await fetch(`/api/order-public-status/${orderId}`);
        const data = await response.json();

        setTimeout(() => {
            if(response.ok && data.success) {
                let estadoHumanizado = 'Pendiente de aprobación';
                if(data.status === 'approved') estadoHumanizado = '✅ Aprobado (Preparando embalaje)';
                if(data.status === 'rejected') estadoHumanizado = '❌ Rechazado (Contactate con soporte)';
                if(data.shipping_status === 'Enviado') estadoHumanizado = '🚚 ¡En camino!';

                let respuestaBot = `🔍 **Resultado de la Orden #${orderId}:**<br>` +
                                   `• **Cliente:** ${data.name}<br>` +
                                   `• **Pago:** ${estadoHumanizado}<br>` +
                                   `• **Envío:** ${data.shipping_status || 'Pendiente'}`;

                if(data.tracking_code) {
                    respuestaBot += `<br>• **Código de seguimiento:** <span class="font-mono bg-gray-800 text-cyan-400 px-1 py-0.5 rounded select-all">${data.tracking_code}</span>`;
                }
                appendMensaje(respuestaBot);
            } else {
                appendMensaje(`❌ No encontramos ninguna orden asociada al número **#${orderId}**. Verificá el ticket o contactanos por privado.`);
            }
        }, 600);

    } catch (error) {
        console.error(error);
        setTimeout(() => { appendMensaje("🔌 Hubo un problema de conexión con la central de datos. Intentá en unos minutos."); }, 600);
    }
}