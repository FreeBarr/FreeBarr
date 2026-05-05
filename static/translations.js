// FreeBarr - Translations
const translations = {
    en: {
        // Nav
        "nav_pos": "POS / Order",
        "nav_cashier": "Cashier / Manager",
        "nav_logout": "Logout",

        // POS View
        "search_placeholder": "Search product...",
        "menu_instruction": "Select a category to begin.",
        "sidebar_title": "Current Order",
        "table_label": "Table No. / Order ID",
        "table_placeholder": "e.g., 12",
        "no_items": "No items added.",
        "comments_label": "Comments",
        "comments_placeholder": "e.g., allergies...",
        "total_label": "Total:",
        "btn_clear": "Clear",
        "btn_submit": "Submit Order",

        // Cashier View
        "cashier_title": "Cashier Management",
        "tab_tables": "Active Tables",
        "tab_history": "History",
        "tab_inventory": "Inventory / Menu",
        "active_orders_title": "Active Orders",
        "no_active_orders": "No active orders.",
        "order_details_title": "Order Details",
        "order_details_placeholder": "Select a table or order to view details.",
        "session_history_title": "Session History",
        "no_closed_orders": "No closed orders.",
        "history_details_title": "History Details",
        "history_details_placeholder": "Select an order to view details and actions.",
        "menu_mgmt_title": "Menu Management",
        "btn_add_product": "+ Add New Product",
        "inventory_search": "Search inventory...",
        "loading_inventory": "Loading inventory...",

        // Modals
        "modal_ok": "OK",
        "modal_confirm_title": "Confirm Action",
        "modal_cancel": "Cancel",
        "modal_confirm": "Confirm",
        "comment_modal_title": "Add Comment",
        "comment_placeholder": "e.g., extra sauce...",
        "comment_save": "Save",
        "print_modal_title": "Print Kitchen Ticket?",
        "print_modal_body": "Send this order to the kitchen printer?",
        "print_no": "No 🚫",
        "print_yes": "Yes 🖨️",
        "payment_modal_title": "Select Payment Method",
        "pay_cash": "Cash 💵",
        "pay_card": "Card 💳",
        "product_modal_add": "Add Product",
        "product_name_label": "Name",
        "product_price_label": "Price",
        "product_category_label": "Category",
        "cat_food": "Food",
        "cat_drink": "Drink",
        "cat_dessert": "Dessert",
        "btn_save": "Save",

        // Login
        "login_password_label": "Password",
        "login_btn": "Sign In",
    },
    es: {
        // Nav
        "nav_pos": "TPV / Pedido",
        "nav_cashier": "Caja / Gestión",
        "nav_logout": "Cerrar Sesión",

        // POS View
        "search_placeholder": "Buscar producto...",
        "menu_instruction": "Selecciona una categoría para comenzar.",
        "sidebar_title": "Pedido Actual",
        "table_label": "Nº Mesa / ID Pedido",
        "table_placeholder": "Ej., 12",
        "no_items": "No hay productos añadidos.",
        "comments_label": "Comentarios",
        "comments_placeholder": "Ej., alergias...",
        "total_label": "Total:",
        "btn_clear": "Limpiar",
        "btn_submit": "Enviar Pedido",

        // Cashier View
        "cashier_title": "Gestión de Caja",
        "tab_tables": "Mesas Activas",
        "tab_history": "Historial",
        "tab_inventory": "Inventario / Menú",
        "active_orders_title": "Pedidos Activos",
        "no_active_orders": "No hay pedidos activos.",
        "order_details_title": "Detalles del Pedido",
        "order_details_placeholder": "Selecciona una mesa o pedido para ver los detalles.",
        "session_history_title": "Historial de Sesión",
        "no_closed_orders": "No hay pedidos cerrados.",
        "history_details_title": "Detalles del Historial",
        "history_details_placeholder": "Selecciona un pedido para ver los detalles y acciones.",
        "menu_mgmt_title": "Gestión del Menú",
        "btn_add_product": "+ Añadir Nuevo Producto",
        "inventory_search": "Buscar en inventario...",
        "loading_inventory": "Cargando inventario...",

        // Modals
        "modal_ok": "Aceptar",
        "modal_confirm_title": "Confirmar Acción",
        "modal_cancel": "Cancelar",
        "modal_confirm": "Confirmar",
        "comment_modal_title": "Añadir Comentario",
        "comment_placeholder": "Ej., salsa extra...",
        "comment_save": "Guardar",
        "print_modal_title": "¿Imprimir Ticket de Cocina?",
        "print_modal_body": "¿Enviar este pedido a la impresora de cocina?",
        "print_no": "No 🚫",
        "print_yes": "Sí 🖨️",
        "payment_modal_title": "Seleccionar Método de Pago",
        "pay_cash": "Efectivo 💵",
        "pay_card": "Tarjeta 💳",
        "product_modal_add": "Añadir Producto",
        "product_name_label": "Nombre",
        "product_price_label": "Precio",
        "product_category_label": "Categoría",
        "cat_food": "Comida",
        "cat_drink": "Bebida",
        "cat_dessert": "Postre",
        "btn_save": "Guardar",

        // Login
        "login_password_label": "Contraseña",
        "login_btn": "Entrar",
    }
};

function applyLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key] !== undefined) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });
    // Update select options
    document.querySelectorAll('[data-i18n-opt]').forEach(el => {
        const key = el.getAttribute('data-i18n-opt');
        if (translations[lang] && translations[lang][key] !== undefined) {
            el.textContent = translations[lang][key];
        }
    });
    localStorage.setItem('freebarr_lang', lang);
    document.documentElement.lang = lang;
    // Update toggle button
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = lang === 'en' ? '🌐 ES' : '🌐 EN';
}

function toggleLang() {
    const current = localStorage.getItem('freebarr_lang') || 'en';
    applyLanguage(current === 'en' ? 'es' : 'en');
}

// Auto-apply on page load
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('freebarr_lang') || 'en';
    applyLanguage(saved);
});