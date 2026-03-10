document.addEventListener('appReady', () => {
    initPOS();
    setInterval(updateTime, 1000);
});

let menuItems = [];
let cart = [];
let currentCategory = 'All';
let nextToken = 1;

async function initPOS() {
    try {
        menuItems = await window.dbService.getAll('menuItems');
        // Filter out unavailable items
        menuItems = menuItems.filter(item => item.available);
        renderMenuGrid();

        nextToken = await window.dbService.getNextToken();
        document.getElementById('nextTokenPlaceholder').innerText = nextToken;

        // Binders
        document.getElementById('menuSearch').addEventListener('input', renderMenuGrid);

        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentCategory = e.target.dataset.cat;
                renderMenuGrid();
            });
        });
    } catch (err) {
        console.error("Failed to initialize POS:", err);
    }
}

function renderMenuGrid() {
    const grid = document.getElementById('menuGrid');
    const searchTerm = document.getElementById('menuSearch').value.toLowerCase();

    grid.innerHTML = '';

    const filtered = menuItems.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchTerm);
        let matchCat = false;
        if (currentCategory === 'All') matchCat = true;
        else if (currentCategory === 'Popular') matchCat = item.popular;
        else matchCat = item.category === currentCategory;

        return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<p class="text-muted" style="grid-column: 1 / -1;">No items found.</p>`;
        return;
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-card';
        // Add image or placeholder
        const imgHtml = item.image
            ? `<img src="${item.image}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div style="width:100%; height:100px; background:var(--bg-base); border-radius:8px; display:none; align-items:center; justify-content:center; font-size: 2rem; margin-bottom:10px;">🍲</div>`
            : `<div style="width:100%; height:100px; background:var(--bg-base); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size: 2rem; margin-bottom:10px;">🍲</div>`;

        div.innerHTML = `
            ${imgHtml}
            <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 5px;">${item.name}</div>
            <div class="text-primary" style="font-weight: bold;">$${parseFloat(item.price).toFixed(2)}</div>
        `;
        div.onclick = () => addToCart(item);
        grid.appendChild(div);
    });
}

function addToCart(item) {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        renderCart();
    }
}

function renderCart() {
    const container = document.getElementById('orderCart');
    const totalEl = document.getElementById('orderTotal');
    const payBtn = document.getElementById('payBtn');

    container.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-muted" style="text-align: center; margin-top: 50px;">Cart is empty. Select items to add.</div>`;
        totalEl.innerText = '$0.00';
        payBtn.disabled = true;
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 500;">${item.name}</div>
                <div class="text-muted" style="font-size: 0.8rem;">$${parseFloat(item.price).toFixed(2)} each</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <button class="cart-qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                <span style="font-weight:bold; width: 20px; text-align:center;">${item.qty}</span>
                <button class="cart-qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
            </div>
            <div style="font-weight: 600; width: 60px; text-align: right;">
                $${itemTotal.toFixed(2)}
            </div>
        `;
        container.appendChild(div);
    });

    totalEl.innerText = `$${total.toFixed(2)}`;
    payBtn.disabled = false;
}

function clearCart() {
    cart = [];
    document.getElementById('orderNotes').value = '';
    renderCart();
}

async function processOrder() {
    const payBtn = document.getElementById('payBtn');
    payBtn.disabled = true;
    payBtn.innerText = 'Processing...';

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const maxPrepTime = Math.max(...cart.map(i => i.prepTime || 5)); // Estimated prep time

    const orderData = {
        id: 'ord_' + Date.now(),
        tokenNumber: nextToken,
        items: cart,
        total: total,
        status: 'pending', // pending -> preparing -> ready -> completed
        timestamp: Date.now(),
        notes: document.getElementById('orderNotes').value,
        estimatedPrepMins: maxPrepTime,
        cashier: localStorage.getItem('canteen_user') || 'Staff'
    };

    try {
        await window.dbService.put('orders', orderData);
        await window.dbService.logActivity('Order Placed - Token ' + nextToken);

        showReceipt(orderData);

        // Prepare for next order
        clearCart();
        nextToken = await window.dbService.getNextToken(); // grabs next sequence
        document.getElementById('nextTokenPlaceholder').innerText = nextToken;

    } catch (err) {
        alert("Failed to save order: " + err);
    } finally {
        payBtn.innerText = 'Generate Token';
    }
}

function showReceipt(order) {
    document.getElementById('receiptToken').innerText = order.tokenNumber;

    let html = '';
    order.items.forEach(i => {
        html += `<div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                    <span>${i.qty}x ${i.name}</span>
                    <span>$${(i.price * i.qty).toFixed(2)}</span>
                 </div>`;
    });

    document.getElementById('receiptItems').innerHTML = html;
    document.getElementById('receiptTotal').innerText = `$${order.total.toFixed(2)}`;

    document.getElementById('receiptModal').style.display = 'flex';
}

function closeReceipt() {
    document.getElementById('receiptModal').style.display = 'none';
}

function updateTime() {
    document.getElementById('currentTime').innerText = new Date().toLocaleTimeString();
}
