document.addEventListener('appReady', () => {
    // Default to today
    document.getElementById('dateFilter').valueAsDate = new Date();

    document.getElementById('dateFilter').addEventListener('change', loadOrders);
    document.getElementById('statusFilter').addEventListener('change', loadOrders);
    document.getElementById('tokenSearch').addEventListener('input', loadOrders);

    loadOrders();
});

let allOrders = [];

async function loadOrders() {
    try {
        allOrders = await window.dbService.getAll('orders');

        const dateInput = document.getElementById('dateFilter').value;
        const statusInput = document.getElementById('statusFilter').value;
        const searchInput = document.getElementById('tokenSearch').value.toLowerCase();

        const filtered = allOrders.filter(o => {
            // Date Filter
            let matchDate = true;
            if (dateInput) {
                const oDate = new Date(o.timestamp).toISOString().split('T')[0];
                matchDate = oDate === dateInput;
            }

            // Status Filter
            let matchStatus = true;
            if (statusInput) {
                matchStatus = o.status === statusInput;
            }

            // Token Search
            let matchToken = true;
            if (searchInput) {
                matchToken = o.tokenNumber.toString().toLowerCase().includes(searchInput);
            }

            return matchDate && matchStatus && matchToken;
        });

        // Sort descending by timestamp
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        renderTable(filtered);

    } catch (err) {
        console.error("Orders reporting error:", err);
    }
}

function renderTable(orders) {
    const tbody = document.getElementById('reportsTableBody');
    const empty = document.getElementById('emptyState');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';

            const timeStr = new Date(o.timestamp).toLocaleString();
            const itemsSummary = o.items.map(i => `${i.qty}x ${i.name}`).join(', ');
            let badgeStyle = '';

            switch (o.status) {
                case 'cancelled': badgeStyle = 'background: rgba(239, 68, 68, 0.1); color: var(--danger);'; break;
                case 'completed': badgeStyle = 'background: rgba(16, 185, 129, 0.1); color: var(--success);'; break;
                case 'ready': badgeStyle = 'background: rgba(52, 211, 153, 0.1); color: var(--success);'; break;
                default: break;
            }

            tr.innerHTML = `
                <td data-label="Token" style="padding: 12px; font-weight: bold;">#${o.tokenNumber}</td>
                <td data-label="Time" style="padding: 12px; font-size: 0.85rem;" class="text-muted">${timeStr}</td>
                <td data-label="Items" style="padding: 12px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${itemsSummary}</td>
                <td data-label="Total" style="padding: 12px; font-weight: 600;">$${o.total.toFixed(2)}</td>
                <td data-label="Status" style="padding: 12px;">
                    <span class="badge" style="text-transform: uppercase; ${badgeStyle}">${o.status}</span>
                </td>
                <td data-label="Action" style="padding: 12px; text-align: right;">
                    ${(o.status !== 'cancelled' && o.status !== 'completed')
                    ? `<button class="btn btn-outline" style="padding:4px 8px;font-size:0.75rem" onclick="markCompleted('${o.id}')">Complete</button>
                           <button class="btn btn-danger" style="padding:4px 8px;font-size:0.75rem" onclick="cancelOrder('${o.id}')">Cancel</button>`
                    : ''
                }
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function markCompleted(id) {
    if (confirm("Mark order as completed? It will be removed from display views.")) {
        try {
            const order = await window.dbService.get('orders', id);
            order.status = 'completed';
            await window.dbService.put('orders', order);
            await window.dbService.logActivity(`Order ${order.tokenNumber} marked completed`);
            loadOrders();
        } catch (err) {
            alert(err);
        }
    }
}

async function cancelOrder(id) {
    if (confirm("Cancel order and log refund?")) {
        try {
            const order = await window.dbService.get('orders', id);
            order.status = 'cancelled';
            await window.dbService.put('orders', order);
            await window.dbService.logActivity(`Order ${order.tokenNumber} cancelled/refunded`);
            loadOrders();
        } catch (err) {
            alert(err);
        }
    }
}

// Backup Export Data (Database to JSON)
async function exportData() {
    try {
        const fullDB = {
            menuItems: await window.dbService.getAll('menuItems'),
            orders: await window.dbService.getAll('orders'),
            settings: await window.dbService.getAll('settings'),
            users: await window.dbService.getAll('users'),
            logs: await window.dbService.getAll('logs')
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDB));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `smart_canteen_full_backup_${Date.now()}.json`);
        dlAnchor.click();
    } catch (err) {
        alert("Export failed: " + err);
    }
}

// Restore Import Data (JSON to Database)
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (confirm("WARNING: Importing data will completely overwrite the current database. Proceed?")) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const data = JSON.parse(e.target.result);
                // Clear and dump
                if (data.menuItems) {
                    await window.dbService.clear('menuItems');
                    for (let i of data.menuItems) await window.dbService.put('menuItems', i);
                }
                if (data.orders) {
                    await window.dbService.clear('orders');
                    for (let i of data.orders) await window.dbService.put('orders', i);
                }
                if (data.logs) {
                    await window.dbService.clear('logs');
                    for (let i of data.logs) await window.dbService.put('logs', i);
                }
                alert("Database successfully restored! Reloading...");
                window.location.reload();
            } catch (err) {
                alert("Failed to parse JSON file or restore DB: " + err);
            }
        };
        reader.readAsText(file);
    }
    // reset input
    event.target.value = '';
}
