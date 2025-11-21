import sqlite3
import json
import os
import sys
from flask import Flask, render_template, g, request, redirect, url_for, session
from flask_socketio import SocketIO
from datetime import datetime

# --- Windows Printing Module ---
try:
    import win32print
    WINDOWS_PRINTING_ENABLED = True
except ImportError:
    WINDOWS_PRINTING_ENABLED = False
    print("!!! WARNING: 'pywin32' module not found. Printing functionality will be disabled.")

# --- CONFIGURATION ---
PRINTER_NAME = os.environ.get('PRINTER_NAME', 'POS-80C')
DATABASE = 'pos.db'
APP_PASSWORD = os.environ.get('APP_PASSWORD', 'admin123') # Default generic password
SECRET_KEY_APP = os.environ.get('SECRET_KEY_APP', 'replace_this_secret_key')

# --- CONSTANTS ---
ORDER_STATUS_ACTIVE = 'active'
ORDER_STATUS_PAID = 'paid'
ORDER_STATUS_VOID = 'void'
CATEGORY_DRINK = 'drink'
PAYMENT_METHOD_CASH = 'cash'
PAYMENT_METHOD_CARD = 'card'
CMD_PARTIAL_CUT = "\x1d\x56\x01" 

# --- APP INITIALIZATION ---
app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY_APP
socketio = SocketIO(app)

# --- MEMORY CASH SUMMARY ---
current_summary = {
    "total_food": 0.0,
    "total_drink": 0.0,
    "total_cash": 0.0,
    "total_card": 0.0,
    "total_grand": 0.0
}

# --- Database Management ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """
    Creates orders and menu_items tables.
    Clears orders table on startup.
    Inserts initial generic menu only if menu_items table is empty.
    """
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        # 1. Orders Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number TEXT NOT NULL,
                details_json TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                payment_method TEXT 
            )
        ''')
        # Clear active/paid orders on session start
        cursor.execute('DELETE FROM orders')
        
        # 2. Menu Items Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS menu_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                UNIQUE(name)
            )
        ''')
        
        # --- INITIAL DATA INSERTION ---
        item_count = cursor.execute('SELECT COUNT(*) FROM menu_items').fetchone()[0]

        if item_count == 0:
            print(">>> Inserting generic sample menu.")
            # Generic Menu Data (Name, Price, Category)
            menu_items = [
                # Food
                ("Classic Burger", 8.50, "food"), 
                ("Cheeseburger", 9.50, "food"), 
                ("Bacon Burger", 10.50, "food"),
                ("Veggie Burger", 9.00, "food"), 
                ("Chicken Sandwich", 8.00, "food"), 
                ("Hot Dog", 5.00, "food"),
                ("French Fries", 3.50, "food"), 
                ("Onion Rings", 4.00, "food"), 
                ("Caesar Salad", 7.00, "food"),
                ("Grilled Chicken Salad", 9.00, "food"),
                
                # Drinks
                ("Cola", 2.50, "drink"), 
                ("Diet Cola", 2.50, "drink"), 
                ("Lemonade", 3.00, "drink"), 
                ("Iced Tea", 3.00, "drink"),
                ("Water", 1.50, "drink"), 
                ("Sparkling Water", 2.00, "drink"), 
                ("Draft Beer", 5.00, "drink"),
                ("Craft Beer", 6.50, "drink"), 
                ("House Wine (Glass)", 6.00, "drink"), 
                ("Coffee", 2.00, "drink"),
                
                # Desserts
                ("Chocolate Cake", 5.50, "dessert"), 
                ("Cheesecake", 6.00, "dessert"), 
                ("Ice Cream Sundae", 4.50, "dessert"),
                ("Apple Pie", 5.00, "dessert")
            ]

            cursor.executemany('INSERT INTO menu_items (name, price, category) VALUES (?, ?, ?)', menu_items)
            print("Database initialized: 'orders' table created and 'menu_items' populated.")
        else:
            print(">>> Existing menu preserved.")
        
        db.commit()


# --- Helper Functions ---
def calculate_order_totals(details_json):
    try:
        details = json.loads(details_json)
        total_food = 0; total_drink = 0
        for item_details in details.get('items', {}).values():
            price = float(item_details.get('price', 0))
            quantity = int(item_details.get('quantity', 0))
            total_item_price = price * quantity
            
            if item_details.get('category') == CATEGORY_DRINK:
                total_drink += total_item_price
            else:
                total_food += total_item_price
        return total_food, total_drink
    except json.JSONDecodeError:
        print("Error decoding JSON in calculate_order_totals.")
        return 0, 0
    except Exception as e:
        print(f"Unexpected error calculating totals: {e}")
        return 0, 0

def rebuild_summary_from_db():
    print(">>> Rebuilding cash summary from database...")
    with app.app_context():
        db = get_db()
        paid_orders = db.execute("SELECT * FROM orders WHERE status = ?", (ORDER_STATUS_PAID,)).fetchall()

        global current_summary
        current_summary = { "total_food": 0.0, "total_drink": 0.0, "total_cash": 0.0, "total_card": 0.0, "total_grand": 0.0 }

        for order in paid_orders:
            total_order = order['total']
            food, drink = calculate_order_totals(order['details_json'])
            payment_method = order['payment_method']

            current_summary['total_food'] += food
            current_summary['total_drink'] += drink
            current_summary['total_grand'] += total_order

            if payment_method == PAYMENT_METHOD_CASH:
                current_summary['total_cash'] += total_order
            elif payment_method == PAYMENT_METHOD_CARD:
                current_summary['total_card'] += total_order
    
    print(f">>> Summary rebuilt. Grand Total: {current_summary['total_grand']:.2f}")


# --- Formatting & Printing ---
def format_kitchen_ticket(order_data):
    table_number = order_data.get('table', 'N/A')
    timestamp_str = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    general_comment = order_data.get('generalComment', '')
    items = order_data.get('items', {})
    
    ticket = [
        "\n*** KITCHEN TICKET ***", 
        f"Table: {table_number}", 
        f"Time: {timestamp_str.split(' ')[1]}",
        "--------------------------------"
    ]
    for name, details in items.items():
        line = f"{details.get('quantity', 0)}x {name}"
        ticket.append(line)
        if details.get('comment', ''): ticket.append(f"  -> {details.get('comment', '')}")
    
    if general_comment: ticket.extend(["\nGeneral Comments:", f"{general_comment}"])

    ticket.append("\n\n\n\n")
    return "\n".join(ticket)

def format_customer_receipt(order):
    details = json.loads(order['details_json'])
    items = details.get('items', {})
    
    timestamp_original = order['timestamp']
    if '.' in timestamp_original:
        timestamp_original = timestamp_original.split('.')[0]
        
    try:
        date_obj = datetime.strptime(timestamp_original, "%Y-%m-%dT%H:%M:%S")
    except ValueError:
        date_obj = datetime.now() 

    date_formatted = date_obj.strftime('%d/%m/%Y %H:%M')
    
    ticket = [
        "\n  *** FreeBarr ***", 
        "    Thank you for your visit",
        f"\n123 Generic Street, City",
        f"\n\nTax ID: 00000000", 
        f"\nPhone: +1 234 567 890",
        f"\nTable: {order['table_number']}", 
        f"Date: {date_formatted}",
        "--------------------------------"
    ]
    
    for name, item_details in items.items():
        total_item = item_details.get('quantity', 0) * item_details.get('price', 0.0)
        # Generic currency formatting
        line = f"{item_details.get('quantity', 0)}x {name.ljust(18)[:18]} {total_item:,.2f}"
        ticket.append(line)
        
    ticket.extend([
        "--------------------------------",
        f"TOTAL:".ljust(20) + f"{order['total']:,.2f}",
        
    ])

    ticket.append("\n\n\n\n")
    return "\n".join(ticket)

def send_to_printer(ticket_text):
    final_text = ticket_text + CMD_PARTIAL_CUT

    if not WINDOWS_PRINTING_ENABLED:
        print("--- PRINT SIMULATION ---\n" + final_text.replace(CMD_PARTIAL_CUT, "[CUT COMMAND]") + "\n------------------------")
        return True
    try:
        h_printer = win32print.OpenPrinter(PRINTER_NAME)
        try:
            h_job = win32print.StartDocPrinter(h_printer, 1, ("OpenPOS Ticket", None, "RAW"))
            win32print.StartPagePrinter(h_printer)
            win32print.WritePrinter(h_printer, final_text.encode('cp850', errors='replace'))
            win32print.EndPagePrinter(h_printer)
            win32print.EndDocPrinter(h_printer)
        finally:
            win32print.ClosePrinter(h_printer)
        print(">>> Ticket sent to printer.")
        return True
    except Exception as e:
        print(f"!!! PRINT ERROR: {e}")
        socketio.emit('operation_failed', {'message': f'Print error: {e}.'})
        return False

# --- Routes ---
@app.route('/')
def index():
    if not session.get('authenticated'): return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.form.get('password') == APP_PASSWORD:
            session['authenticated'] = True
            return redirect(url_for('index'))
        else: error = 'Invalid Password'
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('login'))

# --- Socket.IO Events ---

@socketio.on('get_menu')
def get_menu():
    db = get_db()
    items = [dict(a) for a in db.execute("SELECT id, name, price, category FROM menu_items ORDER BY category, name")]
    
    menu_grouped = {}
    for item in items:
        category = item['category']
        if category not in menu_grouped:
            menu_grouped[category] = []
        menu_grouped[category].append(item)
        
    socketio.emit('menu_received', menu_grouped)

@socketio.on('add_product')
def add_product(data):
    db = get_db()
    try:
        db.execute('INSERT INTO menu_items (name, price, category) VALUES (?, ?, ?)',
                   (data['name'], data['price'], data['category'].lower()))
        db.commit()
        socketio.emit('operation_success', {'message': f"Product '{data['name']}' added."})
        socketio.emit('refresh_menu_and_cash')
    except sqlite3.IntegrityError:
        socketio.emit('operation_failed', {'message': f"Error: Product '{data['name']}' already exists."})
    except Exception as e:
        socketio.emit('operation_failed', {'message': f"Error adding product: {e}"})

@socketio.on('edit_product')
def edit_product(data):
    db = get_db()
    try:
        db.execute('UPDATE menu_items SET name = ?, price = ?, category = ? WHERE id = ?',
                   (data['name'], data['price'], data['category'].lower(), data['id']))
        db.commit()
        socketio.emit('operation_success', {'message': f"Product '{data['name']}' updated."})
        socketio.emit('refresh_menu_and_cash')
    except sqlite3.IntegrityError:
        socketio.emit('operation_failed', {'message': f"Error: Name '{data['name']}' already taken."})
    except Exception as e:
        socketio.emit('operation_failed', {'message': f"Error editing product: {e}"})

@socketio.on('delete_product')
def delete_product(data):
    db = get_db()
    try:
        db.execute('DELETE FROM menu_items WHERE id = ?', (data['id'],))
        db.commit()
        socketio.emit('operation_success', {'message': f"Product deleted."})
        socketio.emit('refresh_menu_and_cash')
    except Exception as e:
        socketio.emit('operation_failed', {'message': f"Error deleting product: {e}"})

@socketio.on('orders_update')
def handle_orders_update():
    socketio.emit('refresh_orders_view')

@socketio.on('submit_order')
def handle_order(order_data):
    db = get_db()
    print_ticket = order_data.pop('print_command', True) 
    
    db.execute('INSERT INTO orders (table_number, details_json, total, status, timestamp, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
               (order_data['table'], json.dumps(order_data), order_data['total'], ORDER_STATUS_ACTIVE, order_data['timestamp'], None))
    db.commit()
    
    if print_ticket:
        send_to_printer(format_kitchen_ticket(order_data)) 
    else:
        print(f">>> Order for {order_data['table']} received (Print skipped).")
        
    socketio.emit('refresh_orders_view')

@socketio.on('update_order')
def handle_order_update(updated_data):
    db = get_db()
    original_table = updated_data['originalTable']
    new_table = updated_data['table']

    # 1. Delete old active order
    db.execute("DELETE FROM orders WHERE table_number = ? AND status = ?", 
               (original_table, ORDER_STATUS_ACTIVE))

    # 2. Insert new order
    db.execute('INSERT INTO orders (table_number, details_json, total, status, timestamp, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
               (new_table, json.dumps(updated_data), updated_data['total'], ORDER_STATUS_ACTIVE, updated_data['timestamp'], None))
    
    db.commit()

    # 3. Print modified ticket
    modified_ticket = format_kitchen_ticket(updated_data)
    final_ticket = "*** MODIFIED ORDER ***\n" + modified_ticket
    send_to_printer(final_ticket) 
    
    socketio.emit('refresh_orders_view')

@socketio.on('get_active_orders')
def get_active_orders():
    orders = [dict(p) for p in get_db().execute("SELECT * FROM orders WHERE status = ? ORDER BY table_number", (ORDER_STATUS_ACTIVE,))]
    socketio.emit('active_orders_data', orders)

@socketio.on('get_paid_orders')
def get_paid_orders():
    orders = [dict(p) for p in get_db().execute("SELECT * FROM orders WHERE status = ? OR status = ? ORDER BY timestamp DESC", (ORDER_STATUS_PAID, ORDER_STATUS_VOID))]
    socketio.emit('paid_orders_data', orders)

@socketio.on('print_bill')
def print_bill(data):
    table_number = data['table']
    db = get_db()
    table_orders = db.execute("SELECT * FROM orders WHERE table_number = ? AND status = ?", (table_number, ORDER_STATUS_ACTIVE)).fetchall()
    
    if not table_orders:
        return

    # Consolidate items
    total_table = sum(p['total'] for p in table_orders)
    first_order = table_orders[0]
    all_items = {}
    
    for p in table_orders:
        details = json.loads(p['details_json'])
        for name, item_detail in details.get('items', {}).items():
            if name in all_items:
                all_items[name]['quantity'] += item_detail.get('quantity', 0)
            else:
                all_items[name] = item_detail.copy()
                all_items[name]['quantity'] = item_detail.get('quantity', 0)
                
    consolidated_order = {
        "table_number": first_order["table_number"], 
        "total": total_table,
        "timestamp": first_order["timestamp"], 
        "details_json": json.dumps({"items": all_items})
    }
    
    send_to_printer(format_customer_receipt(consolidated_order))

@socketio.on('mark_as_paid')
def mark_as_paid(data):
    db = get_db()
    method = data.get('method')
    table_number = data.get('table')
    
    if not method or not table_number: return

    orders_to_pay = db.execute("SELECT id, total, details_json FROM orders WHERE table_number = ? AND status = ?", (table_number, ORDER_STATUS_ACTIVE)).fetchall()
    if not orders_to_pay: return

    for order in orders_to_pay:
        food, drink = calculate_order_totals(order['details_json'])
        total = order['total']
        
        global current_summary
        current_summary['total_food'] += food
        current_summary['total_drink'] += drink
        current_summary['total_grand'] += total

        if method == PAYMENT_METHOD_CASH:
            current_summary['total_cash'] += total
        elif method == PAYMENT_METHOD_CARD:
            current_summary['total_card'] += total
    
    db.execute("UPDATE orders SET status = ?, payment_method = ? WHERE table_number = ? AND status = ?", 
               (ORDER_STATUS_PAID, method, table_number, ORDER_STATUS_ACTIVE))
    db.commit()
    socketio.emit('refresh_orders_view')


@socketio.on('delete_order')
def delete_order(data):
    db = get_db()
    db.execute("DELETE FROM orders WHERE table_number = ? AND status = ?", (data['table'], ORDER_STATUS_ACTIVE))
    db.commit()
    socketio.emit('refresh_orders_view')

# --- CASH LOGIC ---
@socketio.on('get_daily_summary')
def get_daily_summary():
    socketio.emit('daily_summary_data', current_summary)

def _adjust_summary(order_id, original_status):
    """Adjusts in-memory summary when reverting a paid order."""
    db = get_db()
    order = db.execute("SELECT * FROM orders WHERE id = ? AND status = ?", (order_id, original_status)).fetchone()
    if not order: return False
    
    food, drink = calculate_order_totals(order['details_json'])
    total = order['total']
    method = order['payment_method']

    global current_summary
    current_summary['total_food'] -= food
    current_summary['total_drink'] -= drink
    current_summary['total_grand'] -= total

    if method == PAYMENT_METHOD_CASH:
        current_summary['total_cash'] -= total
    elif method == PAYMENT_METHOD_CARD:
        current_summary['total_card'] -= total

    return True

@socketio.on('undo_payment')
def undo_payment(data):
    order_id = data.get('id')
    if _adjust_summary(order_id, ORDER_STATUS_PAID):
        db = get_db()
        db.execute("UPDATE orders SET status = ?, payment_method = NULL WHERE id = ?", (ORDER_STATUS_ACTIVE, order_id))
        db.commit()
        socketio.emit('refresh_orders_view')
        socketio.emit('operation_success', {'message': f'Payment reverted for order #{order_id}.'})
    else:
        socketio.emit('operation_failed', {'message': f'Order #{order_id} not found.'})


@socketio.on('void_order')
def void_order(data):
    order_id = data.get('id')
    if _adjust_summary(order_id, ORDER_STATUS_PAID):
        db = get_db()
        db.execute("UPDATE orders SET status = ? WHERE id = ?", (ORDER_STATUS_VOID, order_id))
        db.commit()
        socketio.emit('refresh_orders_view')
        socketio.emit('operation_success', {'message': f'Order #{order_id} voided.'})
    else:
        socketio.emit('operation_failed', {'message': f'Order #{order_id} not found.'})


if __name__ == '__main__':
    no_reset_flag = '--no-reset' in sys.argv

    if not no_reset_flag:
        print(">>> START MODE: Database will be cleared for a new session.")
        init_db()
    else:
        print(">>> RESTART MODE: Database preserved.")
        with app.app_context():
            db = get_db()
            cursor = db.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS menu_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    price REAL NOT NULL,
                    category TEXT NOT NULL,
                    UNIQUE(name)
                )
            ''')
            db.commit()
        rebuild_summary_from_db()
    
    print("--- FreeBarr Server ---\n")
    print(f"Current Summary: {current_summary['total_grand']:.2f}")
    print(f"Open your browser at: http://127.0.0.1:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)