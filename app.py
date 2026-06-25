from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
import random
import json
import os
from dotenv import load_dotenv

# 🔥 Cargar las variables del archivo .env
load_dotenv()

app = Flask(__name__)

# CONFIGURACIÓN DE LA BASE DE DATOS SQLITE REAL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://lucho:ZRcQZnXihKSyx7gxhvKMhmEA6BV48j3e@dpg-d8ukc6og4nts73fu74rg-a.oregon-postgres.render.com/luvox_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# CONFIGURACIÓN DE FLASK-MAIL (PARA GMAIL) - BLINDADO CON .ENV
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False

# 🔒 Acá hacemos el cambiazo dinámico:
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = ('LUVOX Central Node', os.getenv('MAIL_USERNAME'))

mail = Mail(app)
# ==========================================
#         MODELOS DE LA BASE DE DATOS
# ==========================================

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    salePrice = db.Column(db.Integer, nullable=False)
    promoPrice = db.Column(db.Integer, default=0)
    stock = db.Column(db.Integer, default=0)
    image = db.Column(db.Text, nullable=False)
    gallery = db.Column(db.Text, nullable=True)
    specs = db.Column(db.Text, nullable=True)

    def to_dict(self):
        gallery_list = [img.strip() for img in self.gallery.split(',') if img.strip()] if self.gallery else [self.image]
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "salePrice": self.salePrice,
            "promoPrice": self.promoPrice,
            "stock": self.stock,
            "image": self.image,
            "gallery": gallery_list,
            "colors": [],
            "specs": self.specs or ""
        }

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    orderId = db.Column(db.Integer, unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(150), nullable=True, default="No especificado")
    city = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    shippingMethod = db.Column(db.String(100), default="No especificado")
    paymentMethod = db.Column(db.String(50), default="transfer")
    paymentRef = db.Column(db.String(100), default="N/A")
    cart_json = db.Column(db.Text, nullable=False)
    total = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default="pending")
    shipping_status = db.Column(db.String(50), default="Pendiente")
    tracking_code = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        try:
            cart_data = json.loads(self.cart_json)
        except:
            cart_data = []
        return {
            "orderId": self.orderId,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "city": self.city,
            "address": self.address,
            "shippingMethod": self.shippingMethod,
            "paymentMethod": self.paymentMethod,
            "paymentRef": self.paymentRef,
            "cart": cart_data,
            "total": self.total,
            "status": self.status,
            "shipping_status": self.shipping_status
        }

# ==========================================
#     MOTORES DE ENVÍO DE EMAIL (PLANTILLAS)
# ==========================================

# 1. Correo de Confirmación Inicial (Pedido Recibido)
def enviar_correo_confirmacion(orden):
    if not orden.email or orden.email == "No especificado" or "@" not in orden.email:
        return False
    try:
        carrito = json.loads(orden.cart_json)
        items_html = ""
        for item in carrito:
            precio = item['promoPrice'] if (item.get('promoPrice') and item['promoPrice'] > 0) else item['salePrice']
            items_html += f"""
            <tr style="border-b: 1px solid #1e293b;">
                <td style="padding: 12px; color: #ffffff;">{item['name']}</td>
                <td style="padding: 12px; color: #94a3b8; text-align: center;">{item['quantity']}</td>
                <td style="padding: 12px; color: #22d3ee; text-align: right;">${precio:,} ARS</td>
            </tr>
            """

        html_content = f"""
        <div style="background-color: #060913; color: #f3f4f6; font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 45px; height: 45px; background: linear-gradient(to top right, #a855f7, #06b6d4); font-weight: bold; color: white; font-size: 24px; line-height: 45px; border-radius: 12px; margin-bottom: 10px;">L</div>
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LUVOX ECOSYSTEM</h1>
                <p style="color: #a855f7; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Nodo de Control de Pedidos</p>
            </div>
            <h2 style="color: #ffffff; font-size: 18px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">¡Hola, {orden.name}!</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Hemos recibido correctamente tu orden. Tu pedido se encuentra en cola de verificación de transferencia en nuestro nodo central.</p>
            <div style="background-color: #0b1122; border: 1px solid #111827; padding: 15px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 5px 0; font-size: 13px;"><strong style="color: #a855f7;">ID de Orden:</strong> #{orden.orderId}</p>
                <p style="margin: 5px 0; font-size: 13px;"><strong style="color: #a855f7;">Destino:</strong> {orden.address}, {orden.city}</p>
                <p style="margin: 5px 0; font-size: 13px;"><strong style="color: #a855f7;">Ref. de Pago:</strong> {orden.paymentRef}</p>
            </div>
            <table style="border-collapse: collapse; font-size: 13px; margin-top: 10px; width: 100%;">
                <thead>
                    <tr style="background-color: #0b1122; color: #94a3b8; text-transform: uppercase; font-size: 10px;">
                        <th style="padding: 10px; text-align: left;">Dispositivo</th>
                        <th style="padding: 10px; text-align: center;">Cant.</th>
                        <th style="padding: 10px; text-align: right;">Precio</th>
                    </tr>
                </thead>
                <tbody>{items_html}</tbody>
            </table>
            <div style="text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; color: #ffffff;">
                Monto Neto: <span style="color: #34d399;">${orden.total:,} ARS</span>
            </div>
        </div>
        """
        msg = Message(subject=f"LUVOX Ecosystem | Confirmación de Orden #{orden.orderId}", recipients=[orden.email], html=html_content)
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error enviando correo inicial: {e}")
        return False

# 2. NUEVO: Correo de Pago Aprobado (Listo para Despacho)
def enviar_correo_aprobado(orden):
    # Validaciones de seguridad por si el email viene vacío o incorrecto
    if not orden.email or orden.email == "No especificado" or "@" not in orden.email:
        return False
    try:
        # 🔍 CORRECCIÓN DE ATRIBUTOS: Usamos .id y manejamos seguros los campos de envío
        id_orden = getattr(orden, 'id', getattr(orden, 'orderId', 'N/A'))
        metodo_envio = getattr(orden, 'shipping_method', getattr(orden, 'shippingMethod', 'No especificado'))
        ciudad = getattr(orden, 'city', 'No especificada')

        html_content = f"""
        <div style="background-color: #060913; color: #f3f4f6; font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 45px; height: 45px; background: linear-gradient(to top right, #10b981, #06b6d4); font-weight: bold; color: white; font-size: 24px; line-height: 45px; border-radius: 12px; margin-bottom: 10px;">L</div>
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LUVOX ECOSYSTEM</h1>
                <p style="color: #10b981; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Verificación de Pago Exitosa</p>
            </div>
            <h2 style="color: #ffffff; font-size: 18px; border-bottom: 1px solid #10b981; padding-bottom: 10px;">¡Buenas noticias, {orden.name}!</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Tu transferencia por un total de <span style="color: #10b981; font-weight: bold;">${orden.total:,} ARS</span> correspondiente a la orden <strong>#{id_orden}</strong> ha sido verificada y aprobada con éxito en nuestro sistema.</p>
            
            <div style="background-color: #0b1122; border-left: 4px solid #10b981; padding: 15px; border-radius: 0 12px 12px 0; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #ffffff;"><strong>Estado del Pedido:</strong> Preparando Hardware para Logística</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Te notificaremos o despacharemos tu paquete hacia <strong>{ciudad}</strong> mediante el método acordado ({metodo_envio}).</p>
            </div>
            
            <p style="color: #94a3b8; font-size: 13px;">¡Gracias por confiar en el ecosistema LUVOX!</p>
            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;">
            <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">LUVOX Central Node - Operación Automática.</p>
        </div>
        """
        msg = Message(subject=f"LUVOX Ecosystem | Pago APROBADO de Orden #{id_orden}", recipients=[orden.email], html=html_content)
        mail.send(msg)
        return True
    except Exception as e:
        print(f"❌ Error enviando correo aprobado: {e}")
        return False

# 3. NUEVO: Correo de Pago Rechazado / Cancelado
def enviar_correo_rechazado(orden):
    if not orden.email or orden.email == "No especificado" or "@" not in orden.email:
        return False
    try:
        html_content = f"""
        <div style="background-color: #060913; color: #f3f4f6; font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #1e293b;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 45px; height: 45px; background: linear-gradient(to top right, #f43f5e, #a855f7); font-weight: bold; color: white; font-size: 24px; line-height: 45px; border-radius: 12px; margin-bottom: 10px;">L</div>
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LUVOX ECOSYSTEM</h1>
                <p style="color: #f43f5e; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin: 4px 0 0 0;">Alerta de Verificación</p>
            </div>
            <h2 style="color: #ffffff; font-size: 18px; border-bottom: 1px solid #f43f5e; padding-bottom: 10px;">Aviso sobre tu Orden #{orden.orderId}</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Hola, {orden.name}. Te informamos que no hemos podido validar de forma exitosa la transferencia vinculada a tu pedido de la orden de referencia.</p>
            
            <div style="background-color: #0b1122; border-left: 4px solid #f43f5e; padding: 15px; border-radius: 0 12px 12px 0; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #ffffff;"><strong>Estado del Pedido:</strong> Rechazado / No Validado</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Esto puede deberse a un error en el comprobante adjuntado o a que el monto neto (${orden.total:,} ARS) no impactó en nuestras cuentas.</p>
            </div>
            
            <p style="color: #94a3b8; font-size: 13px;">Por favor, ponete en contacto con soporte respondiendo a este mensaje o mandando un WhatsApp para solucionar el inconveniente y re-procesar tu solicitud.</p>
            <hr style="border: 0; border-top: 1px solid #1e293b; margin: 30px 0;">
            <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">LUVOX Central Node.</p>
        </div>
        """
        msg = Message(subject=f"LUVOX Ecosystem | Problema en Validación de Orden #{orden.orderId}", recipients=[orden.email], html=html_content)
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error enviando correo rechazado: {e}")
        return False
from flask_mail import Message # O la librería de mail que estés usando

def enviar_mail_despacho(order):
    try:
        # Creamos el mensaje
        msg = Message(
            subject=f"🚀 ¡Tu hardware LUVOX ha sido despachado! (# {order.id})",
            sender=app.config['MAIL_USERNAME'],
            recipients=[order.email]
        )
        
        # Estructuramos el cuerpo del mail con HTML y CSS alineado a tu marca
        msg.html = f"""
        <div style="background-color: #030712; color: #f3f4f6; padding: 30px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e1b4b;">
            <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #a855f7; margin: 0; font-size: 28px; letter-spacing: 2px;">LUVOX</h1>
                <p style="color: #06b6d4; font-size: 12px; text-transform: uppercase; margin-top: 5px;">Ecosistema Hardware | Confirmación de Despacho</p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6;">¡Buenas noticias! Tu pedido ha sido procesado con éxito y ya fue entregado a la empresa de logística para su distribución.</p>
            
            <div style="background-color: #090d16; border: 1px solid #2e1065; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; text-transform: uppercase; font-size: 11px; color: #94a3b8; tracking-widest: 1px;">Código de Seguimiento</p>
                <p style="font-family: monospace; font-size: 22px; color: #22d3ee; font-weight: bold; margin: 10px 0;">{order.tracking_code}</p>
                <p style="margin: 0; font-size: 12px; color: #a78bfa;">Copiá este código en la web del correo correspondiente para seguir el recorrido de tu paquete en tiempo real.</p>
            </div>
            
            <div style="border-top: 1px solid #1f2937; padding-top: 20px; font-size: 13px; color: #94a3b8;">
                <p style="margin: 5px 0;"><strong>Orden de Compra:</strong> #{order.id}</p>
                <p style="margin: 5px 0;"><strong>Estado del Nodo:</strong> Despachado / En Viaje</p>
            </div>
            
            <p style="text-align: center; font-size: 11px; color: #4b5563; margin-top: 30px;">
                Este es un mail automático generado por LUVOX Central Node. No lo respondas.
            </p>
        </div>
        """
        
        # Disparamos el correo
        mail.send(msg)
        print(f"Mail de despacho enviado con éxito a {order.email}")
        return True
    except Exception as e:
        print(f"Cortocircuito al enviar el mail de despacho: {str(e)}")
        return False

# ==========================================
#      INYECTAR PRODUCTOS INICIALES DE BASE
# ==========================================
def init_db_data():
    if Product.query.count() == 0:
        prod1 = Product(
            name="Teclado Mecánico LUVOX Apex Pro",
            category="PERIFÉRICOS",
            salePrice=85000,
            promoPrice=75000,
            stock=5,
            image="https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=500&auto=format&fit=crop",
            gallery="https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?q=80&w=500&auto=format&fit=crop,https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=500&auto=format&fit=crop",
            specs="Switches ópticos OmniPoint, iluminación RGB por tecla, construcción de aluminio aeronáutico."
        )
        prod2 = Product(
            name="Mouse Gamer LUVOX HyperLight",
            category="PERIFÉRICOS",
            salePrice=42000,
            promoPrice=0,
            stock=3,
            image="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=500&auto=format&fit=crop",
            gallery="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=500&auto=format&fit=crop",
            specs="Sensor de 26K DPI, peso ultra-ligero de 53g, clicks ópticos de alta durabilidad."
        )
        db.session.add(prod1)
        db.session.add(prod2)
        db.session.commit()

categories = ["PERIFÉRICOS", "COMPONENTES", "PRODUCTIVIDAD", "OTROS"]

# ==========================================
#            RUTAS DE LA TIENDA
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/products', methods=['GET'])
def get_products():
    all_products = Product.query.all()
    return jsonify([p.to_dict() for p in all_products])

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(categories)

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    if not data or not data.get('cart'):
        return jsonify({"success": False, "message": "El carrito está vacío"}), 400
        
    order_id = random.randint(10000, 99999)
    total_neto = 0
    for item in data['cart']:
        precio = item['promoPrice'] if (item.get('promoPrice') and item['promoPrice'] > 0) else item['salePrice']
        total_neto += precio * item['quantity']
        
    nueva_orden = Order(
        orderId=order_id,
        name=data.get('name'),
        phone=data.get('phone'),
        email=data.get('email', 'No especificado'),
        city=data.get('city'),
        address=data.get('address'),
        shippingMethod=data.get('shippingMethod', 'No especificado'),
        paymentMethod=data.get('paymentMethod', 'transfer'),
        paymentRef=data.get('paymentRef', 'N/A'),
        cart_json=json.dumps(data.get('cart', [])),
        total=total_neto,
        status="pending",
        shipping_status="Pendiente"
    )
    
    try:
        db.session.add(nueva_orden)
        db.session.commit()
        
        try:
            enviar_correo_confirmacion(nueva_orden)
        except Exception as mail_err:
            print(f"Alerta: Falló el envío del mail inicial: {mail_err}")
            
        return jsonify({"success": True, "orderId": order_id, "total": total_neto})
        
    except Exception as db_err:
        db.session.rollback()
        print(f"Error crítico en base de datos: {db_err}")
        return jsonify({"success": False, "message": "Error interno al procesar el pedido"}), 500

# ==========================================
#          RUTAS DEL PANEL (ADMIN)
# ==========================================
@app.route('/admin')
def admin_panel():
    return render_template('admin.html')

@app.route('/api/admin/orders', methods=['GET'])
def get_admin_orders():
    all_orders = Order.query.order_by(Order.id.desc()).all()
    return jsonify([o.to_dict() for o in all_orders])

# ESTA ES LA RUTA QUE RESPONDE AL DAR CLIC EN APROBAR O RECHAZAR EN TU PANEL
@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def actualizar_status_pago(order_id):
    data = request.get_json()
    nuevo_estado = data.get('status') # 'approved' o 'rejected'
    
    # Buscamos por tu columna orderId obligatoria
    orden = Order.query.filter_by(orderId=order_id).first()
    if not orden:
        return jsonify({'success': False, 'message': 'Orden no encontrada'}), 404
        
    orden.status = nuevo_estado
    db.session.commit()
    
    # 🔥 EL FILTRO DE ENVÍO DE MAILS:
    # Según lo que vino del JavaScript, disparamos el flujo correspondiente
    if nuevo_estado == 'approved':
        print(f"📧 Disparando correo de Aprobación para la Orden #{order_id}...")
        enviar_correo_aprobado(orden)
        
    elif nuevo_estado == 'rejected':
        print(f"📧 Disparando correo de Rechazo para la Orden #{order_id}...")
        enviar_correo_rechazado(orden)
    
    return jsonify({'success': True, 'message': f'Pago actualizado a {nuevo_estado} y cliente notificado.'})

@app.route('/api/admin/orders/<int:order_id>/shipping', methods=['PUT'])
def update_shipping_status(order_id):
    data = request.json
    nuevo_estado = data.get('status')
    
    if nuevo_estado not in ['Pendiente', 'Enviado']:
        return jsonify({"success": False, "message": "Estado de envío inválido"}), 400
        
    o = Order.query.filter_by(orderId=order_id).first()
    if o:
        o.shipping_status = nuevo_estado
        db.session.commit()
        return jsonify({"success": True, "message": f"Despacho actualizado a {nuevo_estado}"})
            
    return jsonify({"success": False, "message": "Orden no encontrada"}), 404

# --- ABM PRODUCTOS ---
@app.route('/api/admin/products', methods=['POST'])
def create_product():
    data = request.json
    gallery_raw = data.get('gallery', '')
    if isinstance(gallery_raw, list):
        gallery_str = ",".join(gallery_raw)
    else:
        gallery_str = gallery_raw if gallery_raw.strip() else data.get('image')

    nuevo_prod = Product(
        name=data.get('name'),
        category=data.get('category', 'OTROS').upper(),
        salePrice=int(data.get('salePrice', 0)),
        promoPrice=int(data.get('promoPrice', 0)),
        stock=int(data.get('stock', 0)),
        image=data.get('image'),
        gallery=gallery_str,
        specs=data.get('specs', '')
    )
    db.session.add(nuevo_prod)
    db.session.commit()
    return jsonify({"success": True, "product": nuevo_prod.to_dict()})

@app.route('/api/admin/products/<int:prod_id>', methods=['PUT', 'DELETE'])
def handle_product_crud(prod_id):
    prod = Product.query.get(prod_id)
    if not prod:
        return jsonify({"success": False, "message": "Producto no encontrado"}), 404

    if request.method == 'DELETE':
        db.session.delete(prod)
        db.session.commit()
        return jsonify({"success": True})
        
    elif request.method == 'PUT':
        data = request.json
        gallery_raw = data.get('gallery', '')
        if isinstance(gallery_raw, list):
            gallery_str = ",".join(gallery_raw)
        else:
            gallery_str = gallery_raw if gallery_raw.strip() else data.get('image')
                
        prod.name = data.get('name', prod.name)
        prod.category = data.get('category', prod.category).upper()
        prod.salePrice = int(data.get('salePrice', prod.salePrice))
        prod.promoPrice = int(data.get('promoPrice', 0))
        prod.stock = int(data.get('stock', prod.stock))
        prod.image = data.get('image', prod.image)
        prod.gallery = gallery_str
        prod.specs = data.get('specs', prod.specs)
        
        db.session.commit()
        return jsonify({"success": True, "product": prod.to_dict()})

# --- GESTIÓN DE CATEGORÍAS ---
@app.route('/api/admin/categories', methods=['POST'])
def add_category():
    data = request.json
    nueva_cat = data.get('name', '').upper().strip()
    if nueva_cat and nueva_cat not in categories:
        categories.append(nueva_cat)
        return jsonify({"success": True, "categories": categories})
    return jsonify({"success": False, "message": "Categoría inválida o ya existente"}), 400

@app.route('/api/admin/categories', methods=['DELETE'])
def remove_category():
    data = request.json
    cat_a_borrar = data.get('name', '').upper().strip()
    if cat_a_borrar in categories:
        categories.remove(cat_a_borrar)
        return jsonify({"success": True, "categories": categories})
    return jsonify({"success": False, "message": "Categoría no encontrada"}), 404

@app.route('/api/admin/orders/<int:order_id>/despachar', methods=['PUT'])
def despachar_orden(order_id):
    data = request.get_json()
    tracking = data.get('tracking_code')
    
    if not tracking:
        return jsonify({'success': False, 'message': 'Falta el código de seguimiento'}), 400
        
    orden = Order.query.filter_by(orderId=order_id).first()
    
    if not orden:
        return jsonify({'success': False, 'message': f'No se encontró la orden #{order_id}'}), 404
        
    # 🌟 CORRECCIÓN AQUÍ: El pago sigue estando "approved", lo que cambia es el envío
    orden.shipping_status = 'Enviado'  # <-- Guardamos en la columna correcta
    orden.tracking_code = tracking
    db.session.commit()
    
    enviar_mail_despacho(orden)
    
    return jsonify({
        'success': True, 
        'message': 'Orden despachada con éxito en la base de datos.'
    })
    
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        init_db_data()
    app.run(debug=False, port=5000)