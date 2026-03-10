let orders = [];
let currentFilter = 'All';
let timerInterval;

document.addEventListener('appReady', () => {
    loadOrders();
    // Auto refresh kitchen display every 5 seconds to get new orders
    setInterval(loadOrders, 5000);
    // Update timers every second
    timerInterval = setInterval(renderOrders, 1000);

    // Filter Buttons
    document.getElementById('filterAll').addEventListener('click', (e) => setFilter(e, 'All'));
    document.getElementById('filterPending').addEventListener('click', (e) => setFilter(e, 'pending'));
    document.getElementById('filterPreparing').addEventListener('click', (e) => setFilter(e, 'preparing'));
});

async function loadOrders() {
    try {
        const allOrders = await window.dbService.getAll('orders');
        // Only keep pending and preparing orders
        orders = allOrders.filter(o => o.status === 'pending' || o.status === 'preparing');
        // Sort by timestamp (oldest first)
        orders.sort((a, b) => a.timestamp - b.timestamp);

        updateCounts();
        renderOrders();
    } catch (err) {
        console.error("Failed to load orders for kitchen:", err);
    }
}

function updateCounts() {
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    document.getElementById('pendingCount').innerText = pending;
    document.getElementById('preparingCount').innerText = preparing;
}

function setFilter(e, filter) {
    document.querySelectorAll('.btn-outline').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = filter;
    renderOrders();
}

function renderOrders() {
    const grid = document.getElementById('kitchenGrid');
    if (!grid) return; // In case page unloads

    grid.innerHTML = '';

    let filtered = orders;
    if (currentFilter !== 'All') {
        filtered = orders.filter(o => o.status === currentFilter);
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-muted" style="grid-column: 1 / -1; text-align: center; margin-top: 50px; font-size: 1.25rem;">No orders to show. Kitchen is clear! 🍽️</p>';
        return;
    }

    const now = Date.now();

    filtered.forEach(order => {
        const elapsedS = Math.floor((now - order.timestamp) / 1000);
        const elapsedMins = Math.floor(elapsedS / 60);
        const elapsedSecs = elapsedS % 60;
        const timeStr = `${elapsedMins.toString().padStart(2, '0')}:${elapsedSecs.toString().padStart(2, '0')}`;

        // Delay logic
        const estimatedMins = order.estimatedPrepMins || 10;
        const isDelayed = elapsedMins >= estimatedMins && order.status === 'preparing';

        const card = document.createElement('div');
        card.className = `order-card status-${order.status} ${isDelayed ? 'status-delayed' : ''}`;

        // Actions based on status
        let actionsHtml = '';
        if (order.status === 'pending') {
            actionsHtml = `<button class="btn btn-primary" style="width: 100%;" onclick="updateOrderStatus('${order.id}', 'preparing')">Start Preparing</button>`;
        } else if (order.status === 'preparing') {
            actionsHtml = `<button class="btn btn-success" style="width: 100%;" onclick="updateOrderStatus('${order.id}', 'ready')">Mark Ready</button>`;
        }

        let itemsHtml = order.items.map(i => `<div><strong>${i.qty}x</strong> ${i.name}</div>`).join('');

        let notesHtml = order.notes ? `<div style="margin-top: 10px; padding: 8px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--warning); font-size: 0.9rem;"><strong>Note:</strong> ${order.notes}</div>` : '';

        card.innerHTML = `
            <div class="order-header">
                <div class="token-number">#${order.tokenNumber}</div>
                <div class="order-timer ${isDelayed ? 'text-danger' : 'text-muted'}">${timeStr}</div>
            </div>
            <div style="margin-bottom: 10px;">
                <span class="badge badge-${order.status}" style="text-transform: uppercase;">${order.status}</span>
                ${isDelayed ? '<span class="badge badge-pending" style="background:var(--danger); color:white; margin-left: 5px;">DELAYED</span>' : ''}
            </div>
            <div class="order-items">
                ${itemsHtml}
            </div>
            ${notesHtml}
            <div class="order-actions">
                ${actionsHtml}
            </div>
        `;

        grid.appendChild(card);
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const order = await window.dbService.get('orders', orderId);
        if (order) {
            order.status = newStatus;
            await window.dbService.put('orders', order);
            await window.dbService.logActivity(`Order ${order.tokenNumber} moved to ${newStatus}`);
            // Optimistic update
            const idx = orders.findIndex(o => o.id === orderId);
            if (idx > -1) {
                if (newStatus === 'ready') {
                    orders.splice(idx, 1); // remove from array since we only show pending/preparing
                } else {
                    orders[idx].status = newStatus;
                }
            }
            updateCounts();
            renderOrders();
        }
    } catch (err) {
        alert("Failed to update status: " + err);
    }
}
