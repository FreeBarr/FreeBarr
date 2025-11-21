document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const socket = io();
    const menuContainer = document.getElementById('menu-container');
    const menuNav = document.getElementById('menu-nav');
    const menuInstruction = document.getElementById('menu-instruction');
    
    // Navigation
    const tabPedidos = document.getElementById('tab-pedidos');
    const tabCaja = document.getElementById('tab-caja');
    const vistaPedidos = document.getElementById('vista-pedidos');
    const vistaCaja = document.getElementById('vista-caja');

    // Order Panel
    const listaPedido = document.getElementById('order-list');
    const elementoPrecioTotal = document.getElementById('total-price');
    const inputNumeroMesa = document.getElementById('table-number');
    const inputComentariosGenerales = document.getElementById('general-comments');
    const panelPedido = document.getElementById('panel-pedido');
    const tiradorPanel = document.getElementById('tirador-panel');
    const submitBtn = document.getElementById('submit-order-btn');
    
    // Cashier Elements
    const listaMesas = document.getElementById('lista-mesas');
    const detallesPedido = document.getElementById('detalles-pedido');
    const listaPedidosCerrados = document.getElementById('lista-pedidos-cerrados');
    const detallesHistorial = document.getElementById('detalles-historial'); // NEW ELEMENT
    const gestionCajaContainer = document.getElementById('gestion-caja-container');
    
    // Subtabs
    const subtabMesas = document.getElementById('subtab-mesas');
    const subtabHistorial = document.getElementById('subtab-historial');
    const subtabInventario = document.getElementById('subtab-inventario');
    const cajaMesasYDetalles = document.getElementById('caja-mesas-y-detalles');
    const cajaHistorial = document.getElementById('caja-historial');
    const cajaInventario = document.getElementById('caja-inventario');

    // Modals & Search
    const modalMensaje = document.getElementById('message-modal');
    const textoModal = document.getElementById('modal-text');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmText = document.getElementById('confirm-text');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    
    const itemCommentModal = document.getElementById('item-comment-modal');
    const itemCommentTitle = document.getElementById('item-comment-title');
    const itemCommentInput = document.getElementById('item-comment-input');
    const itemCommentSaveBtn = document.getElementById('item-comment-save-btn');
    const itemCommentCancelBtn = document.getElementById('item-comment-cancel-btn');
    
    const barraBusqueda = document.getElementById('barra-busqueda');
    const printConfirmModal = document.getElementById('print-confirm-modal');
    const printYesBtn = document.getElementById('print-yes-btn');
    const printNoBtn = document.getElementById('print-no-btn');
    
    // Payment Modal
    const paymentMethodModal = document.getElementById('payment-method-modal');
    const payCashBtn = document.getElementById('pay-cash-btn');
    const payCardBtn = document.getElementById('pay-card-btn');
    const paymentCancelBtn = document.getElementById('payment-cancel-btn');

    // Inventory Modal
    const btnAbrirAñadirProducto = document.getElementById('btn-abrir-añadir-producto');
    const listaInventario = document.getElementById('lista-inventario');
    const modalProductoForm = document.getElementById('modal-producto-form');
    const productoModalTitle = document.getElementById('producto-modal-title');
    const productoForm = document.getElementById('producto-form');
    const btnCancelarProducto = document.getElementById('btn-cancelar-producto');
    const productoIdInput = document.getElementById('producto-id');
    const productoNombreInput = document.getElementById('producto-nombre');
    const productoPrecioInput = document.getElementById('producto-precio');
    const productoCategoriaSelect = document.getElementById('producto-categoria');
    const inventarioBusqueda = document.getElementById('inventario-busqueda');
    
    // State Variables
    let pedidoActual = {};
    let pedidosActivos = [];
    let pedidosPagados = [];
    let confirmCallback = null;
    let mesaActivaSeleccionada = null;
    let currentItemNameToComment = null;
    let mesaParaPagar = null;
    let modoEdicion = null;
    let menuDB = {}; 
    let todosLosProductosDB = [];
    let categoriasMenu = [];

    // --- SEARCH LOGIC ---
    barraBusqueda.addEventListener('input', (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();
        if (textoBusqueda === '') {
            navegarMenu('principal');
            return;
        }
        const resultados = todosLosProductosDB.filter(producto => 
            producto.name.toLowerCase().includes(textoBusqueda)
        );
        menuContainer.innerHTML = '';
        menuNav.innerHTML = '';
        
        if (resultados.length > 0) {
            menuInstruction.textContent = `Results for "${e.target.value}":`;
            crearGridDeItems(resultados);
        } else {
            menuInstruction.textContent = `No results for "${e.target.value}"`;
        }
    });
    
    function navegarMenu(vista, seccion = null, subcategoria = null, categoria_db = null) {
        menuContainer.innerHTML = '';
        menuNav.innerHTML = '';
        switch (vista) {
            case 'categoria_db':
                menuInstruction.textContent = `Select items from ${categoria_db.charAt(0).toUpperCase() + categoria_db.slice(1)}.`;
                mostrarBotonAtras('principal');
                crearGridDeItems(menuDB[categoria_db]); 
                break;

            case 'principal':
            default:
                menuInstruction.textContent = "Select a category to begin.";
                mostrarVistaPrincipal();
                break;
        }
    }
    
    function mostrarVistaPrincipal() {
        menuContainer.innerHTML = '';
        const gridDiv = document.createElement('div');
        gridDiv.className = "category-grid"; // Semantic Class

        categoriasMenu.forEach(categoria => {
            const btn = document.createElement('button');
            btn.dataset.action = "navegar";
            btn.dataset.vista = "categoria_db"; 
            btn.dataset.categoria_db = categoria; 
            
            let emoji = '🏷️';
            if (categoria.includes('drink')) emoji = '🥤';
            else if (categoria.includes('food')) emoji = '🍔';
            else if (categoria.includes('dessert')) emoji = '🍰';

            btn.className = "cat-card"; // Semantic Class
            btn.innerHTML = `<span class="cat-emoji">${emoji}</span><h2 class="cat-title">${categoria.charAt(0).toUpperCase() + categoria.slice(1)}</h2>`;
            gridDiv.appendChild(btn);
        });

        menuContainer.appendChild(gridDiv);
    }
    
    function crearGridDeItems(items) {
        const gridDiv = document.createElement('div');
        gridDiv.className = "items-grid"; // Semantic Class
        items.forEach(item => {
            const button = document.createElement('button');
            button.className = "item-card menu-item"; // Semantic Class
            button.dataset.name = item.name; 
            button.dataset.price = item.price; 
            button.dataset.category = item.category; 
            button.innerHTML = `<h3 class="item-name">${item.name}</h3><p class="item-price">${item.price.toFixed(2)}</p>`;
            gridDiv.appendChild(button);
        });
        menuContainer.appendChild(gridDiv);
    }
    
    function mostrarBotonAtras(vistaDestino) {
        menuNav.innerHTML = `
            <button data-action="navegar" data-vista="${vistaDestino}" class="btn btn-secondary">
                 Back
            </button>
        `;
    }

    menuContainer.addEventListener('click', (e) => {
        const navButton = e.target.closest('button[data-action="navegar"]');
        const itemButton = e.target.closest('.menu-item');

        if (navButton) {
            const { vista, categoria_db } = navButton.dataset;
            navegarMenu(vista, null, null, categoria_db); 
            return;
        }

        if (itemButton) {
            const n = itemButton.dataset.name, p = parseFloat(itemButton.dataset.price), c = itemButton.dataset.category;
            if (pedidoActual[n]) {
                pedidoActual[n].quantity++;
            } else {
                pedidoActual[n] = { name: n, price: p, quantity: 1, category: c, comment: '' };
            }
            mostrarPedido();
            return;
        }
    });

    menuNav.addEventListener('click', (e) => {
        const backButton = e.target.closest('button[data-action="navegar"]');
        if (backButton) {
            navegarMenu(backButton.dataset.vista);
        }
    });

    function mostrarPedido() {
        listaPedido.innerHTML = ''; let total = 0;
        const articulos = Object.values(pedidoActual);
        if (articulos.length === 0) { 
            listaPedido.innerHTML = '<p class="text-center mt-4 text-muted">No items added.</p>';
        } else {
            for (const articulo of articulos) {
                total += articulo.price * articulo.quantity;
                const el = document.createElement('div'); 
                el.className = 'order-item'; // Semantic
                el.innerHTML = `
                    <div class="order-item-header">
                        <div>
                            <p class="item-name" style="font-size: 0.95rem;">${articulo.name}</p>
                            <p class="item-price">${articulo.price.toFixed(2)}</p>
                        </div>
                        <div class="order-item-controls">
                            <button class="btn-qty" data-name="${articulo.name}" data-change="-1">-</button>
                            <span class="qty-display">${articulo.quantity}</span>
                            <button class="btn-qty" data-name="${articulo.name}" data-change="1">+</button>
                        </div>
                    </div>
                    ${articulo.comment ? `<p class="item-comment">↳ "${articulo.comment}"</p>` : ''}
                    <div class="text-right mt-1">
                        <button class="btn-comment" data-name="${articulo.name}">${articulo.comment ? 'Edit' : 'Add'} comment</button>
                    </div>
                `;
                listaPedido.appendChild(el);
            }
        }
        elementoPrecioTotal.textContent = `${total.toFixed(2)}`;
    }
    
    listaPedido.addEventListener('click', (e) => {
        const qtyBtn = e.target.closest('button.btn-qty');
        if (qtyBtn) {
            const n = qtyBtn.dataset.name;
            if (pedidoActual[n]) { 
                pedidoActual[n].quantity += parseInt(qtyBtn.dataset.change, 10); 
                if (pedidoActual[n].quantity <= 0) delete pedidoActual[n];
            }
            mostrarPedido();
        }
        
        const commentBtn = e.target.closest('button.btn-comment');
        if (commentBtn) {
            const itemName = commentBtn.dataset.name;
            openItemCommentModal(itemName);
        }
    });

    function openItemCommentModal(itemName) {
        currentItemNameToComment = itemName;
        itemCommentTitle.textContent = `Comment for ${itemName}`;
        itemCommentInput.value = pedidoActual[itemName]?.comment || '';
        itemCommentModal.classList.remove('hidden');
        itemCommentInput.focus();
    }

    function closeItemCommentModal() {
        itemCommentModal.classList.add('hidden');
        currentItemNameToComment = null;
    }

    itemCommentSaveBtn.addEventListener('click', () => {
        if (currentItemNameToComment && pedidoActual[currentItemNameToComment]) {
            pedidoActual[currentItemNameToComment].comment = itemCommentInput.value.trim();
            mostrarPedido();
        }
        closeItemCommentModal();
    });
    itemCommentCancelBtn.addEventListener('click', closeItemCommentModal);
    
    function limpiarYResetearPedido() {
        pedidoActual = {}; 
        inputNumeroMesa.value = ''; 
        inputComentariosGenerales.value = '';
        modoEdicion = null;
        
        submitBtn.textContent = 'Submit Order';
        // Toggle semantic class for visual state
        submitBtn.classList.remove('mode-edit'); 
        
        mostrarPedido();
    }

    document.getElementById('clear-order-btn').addEventListener('click', limpiarYResetearPedido);

    submitBtn.addEventListener('click', () => {
        const numMesa = inputNumeroMesa.value;
        if (!numMesa || Object.keys(pedidoActual).length === 0) {
            mostrarMensaje(!numMesa ? 'Enter a table number.' : 'Order is empty.');
            return;
        }

        if (modoEdicion) {
            enviarPedido(true); 
        } else {
            printConfirmModal.classList.remove('hidden');
        }
    });

    function enviarPedido(imprimir = true) {
        const numMesa = inputNumeroMesa.value;
        const itemsParaEnviar = {};
        Object.values(pedidoActual).forEach(i => { itemsParaEnviar[i.name] = i; });
        const datosPedido = {
            table: numMesa,
            items: itemsParaEnviar,
            generalComment: inputComentariosGenerales.value.trim(),
            total: parseFloat(elementoPrecioTotal.textContent),
            timestamp: new Date().toISOString(),
            print_command: imprimir 
        };

        if (modoEdicion) {
            datosPedido.originalTable = modoEdicion;
            socket.emit('update_order', datosPedido);
            mostrarMensaje(`Order for "${numMesa}" updated!`);
        } else {
            socket.emit('submit_order', datosPedido);
            mostrarMensaje(`Order for "${numMesa}" submitted!`);
        }
        
        limpiarYResetearPedido();
    }

    printYesBtn.addEventListener('click', () => {
        printConfirmModal.classList.add('hidden');
        enviarPedido(true);
    });

    printNoBtn.addEventListener('click', () => {
        printConfirmModal.classList.add('hidden');
        enviarPedido(false);
    });

    tiradorPanel.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
            panelPedido.classList.toggle('is-open');
        }
    });
    
    // --- CASHIER VIEW LOGIC ---

    function solicitarDatosCaja() {
        socket.emit('get_active_orders');
        socket.emit('get_paid_orders');
        socket.emit('get_daily_summary');
    }
    
    function cambiarSubVistaCaja(subvista) {
        [subtabMesas, subtabHistorial, subtabInventario].forEach(tab => {
            tab.classList.remove('active'); // Semantic active class
        });

        [cajaMesasYDetalles, cajaHistorial, cajaInventario].forEach(vista => vista.classList.add('hidden'));

        if (subvista === 'mesas') {
            cajaMesasYDetalles.classList.remove('hidden');
            subtabMesas.classList.add('active');
            solicitarDatosCaja();
        } else if (subvista === 'historial') {
            cajaHistorial.classList.remove('hidden');
            subtabHistorial.classList.add('active');
            solicitarDatosCaja(); 
        } else if (subvista === 'inventario') {
            cajaInventario.classList.remove('hidden');
            subtabInventario.classList.add('active');
            if (inventarioBusqueda) inventarioBusqueda.value = '';
            cargarInventario();
        } 
    }
    
    subtabMesas.addEventListener('click', () => cambiarSubVistaCaja('mesas'));
    subtabHistorial.addEventListener('click', () => cambiarSubVistaCaja('historial'));
    subtabInventario.addEventListener('click', () => cambiarSubVistaCaja('inventario'));

    function cambiarVista(vista) {
        vistaPedidos.classList.toggle('hidden', vista !== 'pedidos');
        vistaCaja.classList.toggle('hidden', vista !== 'caja');

        if (vista === 'pedidos') {
            tabPedidos.classList.add('active');
            tabCaja.classList.remove('active');
        } else {
            tabCaja.classList.add('active');
            tabPedidos.classList.remove('active');
        }

        if (vista === 'caja') {
            mesaActivaSeleccionada = null;
            detallesPedido.innerHTML = '<p>Select a table or order to view details.</p>';
            // Clear History details when switching views
            detallesHistorial.innerHTML = '<p>Select an order to view details and actions.</p>'; 
            cambiarSubVistaCaja('mesas'); 
        }
    }
    tabPedidos.addEventListener('click', () => cambiarVista('pedidos'));
    tabCaja.addEventListener('click', () => cambiarVista('caja'));

    // --- ACTIVE TABLES LOGIC ---
    function mostrarMesas() {
            listaMesas.innerHTML = '';
            const mesas = [...new Set(pedidosActivos.map(p => p.table_number))];
            if (mesas.length === 0) { listaMesas.innerHTML = '<p class="text-muted">No active orders.</p>'; return; }
            mesas.sort((a, b) => a - b).forEach(mesa => {
                const b = document.createElement('button');
                b.className = 'list-btn'; // Semantic
                b.textContent = `Table / ID: ${mesa}`;
                b.dataset.mesa = mesa;
                if (mesa === mesaActivaSeleccionada) b.classList.add('active');
                listaMesas.appendChild(b);
            });
    }
    
    listaMesas.addEventListener('click', (e) => {
        const mesaBtn = e.target.closest('button');
        if (!mesaBtn) return;
        mesaActivaSeleccionada = mesaBtn.dataset.mesa;
        mostrarMesas();
        mostrarDetallesActivos(mesaActivaSeleccionada);
    });

    function cargarPedidoParaEditar(numeroMesa) {
        const itemsConsolidados = {};
        const pedidosDeLaMesa = pedidosActivos.filter(p => p.table_number === numeroMesa);
        if (pedidosDeLaMesa.length === 0) {
            mostrarMensaje('Error: Order not found.');
            return;
        }

        pedidosDeLaMesa.forEach(pedido => {
            const detalles = JSON.parse(pedido.details_json);
            for (const nombreItem in detalles.items) {
                const item = detalles.items[nombreItem];
                if (itemsConsolidados[nombreItem]) {
                    itemsConsolidados[nombreItem].quantity += item.quantity;
                } else {
                    itemsConsolidados[nombreItem] = { ...item };
                }
            }
        });

        pedidoActual = itemsConsolidados;
        inputNumeroMesa.value = numeroMesa;
        inputComentariosGenerales.value = ''; 

        modoEdicion = numeroMesa;
        submitBtn.textContent = 'Save Changes';
        // Toggle semantic class
        submitBtn.classList.add('mode-edit');

        cambiarVista('pedidos');
        mostrarPedido();
        
        if (window.innerWidth < 1024) {
            panelPedido.classList.add('is-open');
        }
    }

    function mostrarDetallesActivos(numeroMesa) {
        const pedidosDeLaMesa = pedidosActivos.filter(p => p.table_number === numeroMesa);
        let totalMesa = 0;
        let html = `<h3 class="panel-title">Table / ID: ${numeroMesa}</h3><ul class="mb-4">`;
        pedidosDeLaMesa.forEach(p => {
            const d = JSON.parse(p.details_json); totalMesa += p.total;
            for (const detalle of Object.values(d.items)) { html += `<li style="display:flex; justify-content:space-between;"><span>${detalle.quantity}x ${detalle.name}</span><span>${(detalle.quantity * detalle.price).toFixed(2)}</span></li>`; }
        });
        html += `</ul><div style="border-top:1px solid var(--border); padding-top:0.5rem; font-weight:bold; display:flex; justify-content:space-between;"><span>TOTAL</span><span>${totalMesa.toFixed(2)}</span></div>`;
        html += `<div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <button data-action="editar-pedido" data-mesa="${numeroMesa}" class="btn btn-warning">Edit</button>
                            <button data-action="imprimir-cuenta" data-mesa="${numeroMesa}" class="btn btn-primary">Print Bill</button>
                            <button data-action="marcar-pagado" data-mesa="${numeroMesa}" class="btn btn-success">Mark as Paid</button>
                            <button data-action="eliminar-pedido" data-mesa="${numeroMesa}" class="btn btn-danger">Delete</button>
                        </div>`;
        detallesPedido.innerHTML = html;
    }

    detallesPedido.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const mesa = button.dataset.mesa;
        const pedidoId = button.dataset.id;
        
        if (action === 'editar-pedido') {
            cargarPedidoParaEditar(mesa);
        }
        else if (action === 'marcar-pagado') {
            abrirModalMetodoPago(mesa);
        } 
        else if (action === 'eliminar-pedido') {
            abrirModalConfirmacion(`Delete ALL orders for "${mesa}"?`, () => { socket.emit('delete_order', { table: mesa }); detallesPedido.innerHTML = '<p>Select a table.</p>'; });
        }
        else if (action === 'imprimir-cuenta') {
            socket.emit('print_bill', { table: mesa });
        }
        // Removed History Actions (Void/Undo) from here as they belong to the other view
    });

    // --- INVENTORY CRUD ---
    function cargarInventario(itemsToShow = null) {
        listaInventario.innerHTML = '<p class="text-muted">Loading...</p>';
        
        let items;
        let esBusqueda = false;
        
        if (itemsToShow !== null) {
            items = itemsToShow;
            esBusqueda = true;
        } else {
            items = {};
            todosLosProductosDB.forEach(item => {
                const cat = item.category;
                if (!items[cat]) items[cat] = [];
                items[cat].push(item);
            });
        }
        
        const categoriasUnicas = esBusqueda ? [...new Set(items.map(i => i.category))].sort() : Object.keys(items).sort();
        
        if (categoriasUnicas.length === 0) {
                listaInventario.innerHTML = esBusqueda ? '<p>No results found.</p>' : '<p>Inventory empty.</p>';
                return;
        }

        listaInventario.innerHTML = '';
        
        categoriasUnicas.forEach(categoria => {
            const productos = esBusqueda ? items.filter(i => i.category === categoria) : items[categoria];

            const titulo = document.createElement('h3');
            titulo.style.textTransform = 'capitalize';
            titulo.textContent = categoria;
            listaInventario.appendChild(titulo);

            const lista = document.createElement('div');
            lista.style.display = 'flex';
            lista.style.flexDirection = 'column';
            lista.style.gap = '0.5rem';

            productos.forEach(item => {
                const el = document.createElement('div');
                el.className = 'inventory-item';
                el.innerHTML = `
                    <div>
                        <p style="font-weight:bold;">${item.name}</p>
                        <p style="font-size:0.9rem; color:var(--text-muted);">${item.price.toFixed(2)}</p>
                        <span class="tag">${item.category}</span>
                    </div>
                    <div style="display:flex;">
                        <button data-id="${item.id}" data-nombre="${item.name}" data-precio="${item.price}" data-categoria="${item.category}" data-action="editar-producto" class="sm-btn btn-warning">
                            Edit
                        </button>
                        <button data-id="${item.id}" data-nombre="${item.name}" data-action="eliminar-producto" class="sm-btn btn-danger">
                            Delete
                        </button>
                    </div>
                `;
                lista.appendChild(el);
            });
            listaInventario.appendChild(lista);
        });
    }
    
    function filtrarInventario() {
        const textoBusqueda = inventarioBusqueda.value.toLowerCase().trim();

        if (textoBusqueda === '') {
            cargarInventario(null); 
            return;
        }

        const resultados = todosLosProductosDB.filter(producto => 
            producto.name.toLowerCase().includes(textoBusqueda) || 
            producto.category.toLowerCase().includes(textoBusqueda)
        );
        
        cargarInventario(resultados);
    }
    
    inventarioBusqueda.addEventListener('input', filtrarInventario);


    btnAbrirAñadirProducto.addEventListener('click', () => openProductoModal());
    btnCancelarProducto.addEventListener('click', () => modalProductoForm.classList.add('hidden'));

    function openProductoModal(item = null) {
        productoForm.reset();
        modalProductoForm.classList.remove('hidden');

        const select = productoCategoriaSelect;
        select.innerHTML = '';
        const categoriasSet = new Set(['food', 'drink', 'dessert']);
        categoriasMenu.forEach(c => categoriasSet.add(c));

        categoriasSet.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                option.textContent = c.charAt(0).toUpperCase() + c.slice(1);
                select.appendChild(option);
        });
        
        if (item) {
            productoModalTitle.textContent = `Edit: ${item.name}`;
            productoIdInput.value = item.id;
            productoNombreInput.value = item.name;
            productoPrecioInput.value = item.price;
            select.value = item.category; 
            
            if (!select.querySelector(`option[value="${item.category}"]`)) {
                const option = document.createElement('option');
                option.value = item.category;
                option.textContent = item.category.charAt(0).toUpperCase() + item.category.slice(1);
                select.appendChild(option);
                select.value = item.category;
            }

        } else {
            productoModalTitle.textContent = "Add New Product";
            productoIdInput.value = '';
        }
    }
    
    listaInventario.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.id);
        const nombre = btn.dataset.nombre;
        
        if (action === 'editar-producto') {
            const item = {
                id: id,
                name: nombre,
                price: parseFloat(btn.dataset.precio),
                category: btn.dataset.categoria
            };
            openProductoModal(item);
            const saveBtn = document.getElementById('btn-guardar-producto');
            saveBtn.classList.add('mode-edit'); // Visual Cue

        } else if (action === 'eliminar-producto') {
            abrirModalConfirmacion(`Are you sure you want to DELETE "${nombre}"?`, () => {
                socket.emit('delete_product', { id: id });
            });
        }
    });
    
    productoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('btn-guardar-producto');
        saveBtn.classList.remove('mode-edit');

        const data = {
            id: productoIdInput.value ? parseInt(productoIdInput.value) : null,
            name: productoNombreInput.value.trim(),
            price: parseFloat(productoPrecioInput.value),
            category: productoCategoriaSelect.value.toLowerCase(),
        };

        if (data.id) {
            socket.emit('edit_product', data);
        } else {
            socket.emit('add_product', data);
        }
        
        modalProductoForm.classList.add('hidden');
    });

    // --- HISTORY LOGIC ---
    function mostrarPedidosCerrados() {
        listaPedidosCerrados.innerHTML = '';
        if (pedidosPagados.length === 0) {
            listaPedidosCerrados.innerHTML = '<p class="text-muted">No closed orders.</p>';
            return;
        }
        
        pedidosPagados.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(pedido => {
            const el = document.createElement('button');
            el.className = 'list-btn';
            const hora = new Date(pedido.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            let estadoHTML = '';
            if (pedido.status === 'void') {
                el.style.textDecoration = 'line-through';
                el.style.color = '#9ca3af';
                estadoHTML = `<span style="color:red; font-weight:bold;">[VOID]</span>`;
            }

            let metodoPagoHTML = '';
            if (pedido.payment_method === 'cash') {
                metodoPagoHTML = `<span class="tag" style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:10px;">Cash 💵</span>`;
            } else if (pedido.payment_method === 'card') {
                metodoPagoHTML = `<span class="tag" style="background:#dbeafe; color:#1e40af; padding:2px 6px; border-radius:10px;">Card 💳</span>`;
            }
            
            el.innerHTML = `
                <div>
                    <span style="font-weight:bold;">Table: ${pedido.table_number}</span> 
                    <span class="text-muted" style="font-size:0.85rem;">- #${pedido.id} @ ${hora}</span>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    ${estadoHTML} 
                    ${metodoPagoHTML} 
                    <span style="font-weight:bold;">${pedido.total.toFixed(2)}</span>
                </div>`;
            el.dataset.id = pedido.id;
            listaPedidosCerrados.appendChild(el);
        });
    }

    listaPedidosCerrados.addEventListener('click', (e) => {
        const pedidoBtn = e.target.closest('button');
        if (!pedidoBtn) return;
        mostrarDetallesPagado(parseInt(pedidoBtn.dataset.id));
    });

    function mostrarDetallesPagado(pedidoId) {
        const pedido = pedidosPagados.find(p => p.id === pedidoId);
        if (!pedido) return;
        const detalles = JSON.parse(pedido.details_json);
        let html = `<h3 class="panel-title">Order #${pedido.id} (Table: ${pedido.table_number})</h3>`;
        
        if (pedido.status === 'void') {
                html += '<p style="padding:0.5rem; background:#fee2e2; color:#991b1b; font-weight:bold; border-radius:0.25rem; margin-bottom:1rem;">This order was VOIDED.</p>';
        } else if (pedido.payment_method) {
            const metodoTexto = pedido.payment_method === 'cash' ? 'Cash 💵' : 'Card 💳';
            html += `<p style="margin-bottom:1rem; font-weight:bold;">Paid with: ${metodoTexto}</p>`;
        }

        html += `<ul class="mb-4">`;
        for (const detalle of Object.values(detalles.items)) { html += `<li style="display:flex; justify-content:space-between;"><span>${detalle.quantity}x ${detalle.name}</span><span>${(detalle.quantity * detalle.price).toFixed(2)}</span></li>`;}
        html += `</ul><div style="border-top:1px solid var(--border); padding-top:0.5rem; display:flex; justify-content:space-between; font-weight:bold;"><span>TOTAL</span><span>${pedido.total.toFixed(2)}</span></div>`;
        if (pedido.status === 'paid') {
            html += `<div style="margin-top:1.5rem; display:flex; gap:1rem;">
                                    <button data-action="undo-payment" data-id="${pedido.id}" class="btn btn-warning">Revert Payment</button>
                                    <button data-action="void-order" data-id="${pedido.id}" class="btn btn-danger">Void Order</button>
                                </div>`;
        }
        
        // FIX: Update the NEW container
        detallesHistorial.innerHTML = html;
    }
    
    // NEW: Listener for the History Details panel
    detallesHistorial.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        const pedidoId = button.dataset.id;
        
        if (action === 'void-order') {
            abrirModalConfirmacion(`Void order #${pedidoId}?`, () => { 
                socket.emit('void_order', { id: parseInt(pedidoId) }); 
                detallesHistorial.innerHTML = '<p>Select an order to view details and actions.</p>'; 
            });
        } else if (action === 'undo-payment') {
            abrirModalConfirmacion(`Revert payment for order #${pedidoId}?`, () => { 
                socket.emit('undo_payment', { id: parseInt(pedidoId) }); 
                detallesHistorial.innerHTML = '<p>Select an order to view details and actions.</p>'; 
            });
        }
    });
    
    function mostrarGestionCaja(resumen) {
        if (!resumen) {
            gestionCajaContainer.innerHTML = '';
            return;
        }

        gestionCajaContainer.innerHTML = `
            <div class="text-center">
                <button id="btn-mostrar-resumen" class="btn btn-primary">View Session Summary</button>
            </div>`;
        
        const btnMostrar = document.getElementById('btn-mostrar-resumen');
        if (btnMostrar) {
            btnMostrar.addEventListener('click', () => {
                gestionCajaContainer.innerHTML = `
                    <div class="panel">
                        <h2 class="panel-title">Current Session Summary</h2>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom:1.5rem;">
                            <div>
                                <p style="font-size:0.875rem; color:var(--text-muted);">CASH TOTAL</p>
                                <p style="font-size:1.5rem; font-weight:bold; color:var(--success);">${resumen.total_cash.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="font-size:0.875rem; color:var(--text-muted);">CARD TOTAL</p>
                                <p style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${resumen.total_card.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="font-size:0.875rem; color:var(--text-muted);">FOOD SALES</p>
                                <p style="font-size:1.5rem; font-weight:bold;">${resumen.total_food.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style="font-size:0.875rem; color:var(--text-muted);">DRINK SALES</p>
                                <p style="font-size:1.5rem; font-weight:bold;">${resumen.total_drink.toFixed(2)}</p>
                            </div>
                        </div>
                        <div style="border-top:1px solid var(--border); padding-top:1rem; text-align:center;">
                            <p style="font-size:0.875rem; color:var(--text-muted);">GRAND TOTAL</p>
                            <p style="font-size:2.25rem; font-weight:bold; color:var(--text-main);">${resumen.total_grand.toFixed(2)}</p>
                        </div>
                        <div class="text-center mt-4">
                            <button id="btn-ocultar-resumen" class="btn btn-secondary">Hide</button>
                        </div>
                    </div>`;
                
                const btnOcultar = document.getElementById('btn-ocultar-resumen');
                if (btnOcultar) {
                    btnOcultar.addEventListener('click', () => {
                        mostrarGestionCaja(resumen);
                    });
                }
            });
        }
    }
    
    // --- MODALS & SOCKET EVENTS ---
    function abrirModalMetodoPago(mesa) {
        mesaParaPagar = mesa;
        paymentMethodModal.classList.remove('hidden');
    }

    function cerrarModalMetodoPago() {
        mesaParaPagar = null;
        paymentMethodModal.classList.add('hidden');
    }

    payCashBtn.addEventListener('click', () => {
        if (mesaParaPagar) {
            socket.emit('mark_as_paid', { table: mesaParaPagar, method: 'cash' });
            detallesPedido.innerHTML = '<p>Select a table.</p>';
            cerrarModalMetodoPago();
        }
    });

    payCardBtn.addEventListener('click', () => {
            if (mesaParaPagar) {
            socket.emit('mark_as_paid', { table: mesaParaPagar, method: 'card' });
            detallesPedido.innerHTML = '<p>Select a table.</p>';
            cerrarModalMetodoPago();
        }
    });

    paymentCancelBtn.addEventListener('click', cerrarModalMetodoPago);
    
    function abrirModalConfirmacion(texto, callback) { confirmText.textContent = texto; confirmCallback = callback; confirmModal.classList.remove('hidden'); }
    function cerrarModalConfirmacion() { confirmModal.classList.add('hidden'); confirmCallback = null; }
    confirmOkBtn.addEventListener('click', () => { if (confirmCallback) confirmCallback(); cerrarModalConfirmacion(); });
    document.getElementById('confirm-cancel-btn').addEventListener('click', cerrarModalConfirmacion);
    function mostrarMensaje(mensaje) { textoModal.textContent = mensaje; modalMensaje.classList.remove('hidden'); }
    document.getElementById('modal-close-btn').addEventListener('click', () => modalMensaje.classList.add('hidden'));

    // --- SOCKET.IO EVENTS ---
    socket.on('connect', () => { 
        console.log('Connected to server.'); 
        socket.emit('get_menu'); 
        solicitarDatosCaja(); 
    });
    
    socket.on('refresh_orders_view', () => { 
        if (!vistaCaja.classList.contains('hidden')) { 
            detallesPedido.innerHTML = '<p>Select a table.</p>'; 
            solicitarDatosCaja(); 
        }
    });
    
    socket.on('refresh_menu_and_cash', () => {
            socket.emit('get_menu'); 
            if (!vistaCaja.classList.contains('hidden')) {
                if (!cajaInventario.classList.contains('hidden')) cargarInventario(); 
                solicitarDatosCaja(); 
            }
    });
    
    socket.on('active_orders_data', (pedidos) => { pedidosActivos = pedidos; if (cajaMesasYDetalles.classList.contains('hidden') === false) mostrarMesas(); });
    socket.on('paid_orders_data', (pedidos) => { pedidosPagados = pedidos; if (cajaHistorial.classList.contains('hidden') === false) mostrarPedidosCerrados(); });
    
    socket.on('daily_summary_data', (resumen) => { 
        if (cajaMesasYDetalles.classList.contains('hidden') === false) mostrarGestionCaja(resumen); 
    });
    
    socket.on('operation_failed', (data) => mostrarMensaje(data.message));
    socket.on('operation_success', (data) => mostrarMensaje(data.message));

    socket.on('menu_received', (menu_db) => {
        menuDB = menu_db;
        categoriasMenu = Object.keys(menuDB).sort();

        todosLosProductosDB = [];
        for (const categoria in menuDB) {
            todosLosProductosDB.push(...menuDB[categoria]);
        }
        
        if (cajaInventario.classList.contains('hidden') === false) {
            cargarInventario();
        }

        navegarMenu('principal');
    });

    navegarMenu('principal');
});