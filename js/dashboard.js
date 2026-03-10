document.addEventListener('appReady', () => {
    document.getElementById('overviewDate').innerText = new Date().toDateString();
    loadDashboardData();
    loadActivityLogs();
});

async function loadDashboardData() {
    try {
        const orders = await window.dbService.getAll('orders');

        // Filter ONLY today's orders
        const todayStr = new Date().toDateString();
        const todayOrders = orders.filter(o => {
            return new Date(o.timestamp).toDateString() === todayStr;
        });

        const totalRevenue = todayOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + o.total, 0);

        const tokensIssued = todayOrders.length;
        const pending = todayOrders.filter(o => o.status === 'pending' || o.status === 'preparing').length;
        const cancelled = todayOrders.filter(o => o.status === 'cancelled').length;

        document.getElementById('statRevenue').innerText = `$${totalRevenue.toFixed(2)}`;
        document.getElementById('statTokens').innerText = tokensIssued;
        document.getElementById('statPending').innerText = pending;
        document.getElementById('statCancelled').innerText = cancelled;

        renderPopularChart(todayOrders);

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

function renderPopularChart(orders) {
    const chart = document.getElementById('popularChart');

    // Count items 
    const itemMap = {};
    orders.forEach(o => {
        if (o.status === 'cancelled') return;
        o.items.forEach(i => {
            if (!itemMap[i.name]) itemMap[i.name] = 0;
            itemMap[i.name] += i.qty;
        });
    });

    const entries = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5); // top 5

    if (entries.length === 0) {
        chart.innerHTML = `<p class="text-muted" style="align-self: flex-start; margin-top: 100px; width: 100%; text-align: center;">Not enough data today.</p>`;
        return;
    }

    const maxQty = Math.max(...entries.map(e => e[1]));
    let html = '';

    entries.forEach(([name, qty]) => {
        const heightPercent = maxQty > 0 ? (qty / maxQty) * 100 : 0;

        let label = name.length > 10 ? name.substring(0, 8) + '..' : name;

        html += `
            <div class="bar-col" style="height: ${heightPercent}%">
                <div class="bar-val">${qty}</div>
                <div class="bar-label">${label}</div>
            </div>
        `;
    });

    chart.innerHTML = html;
}

async function loadActivityLogs() {
    try {
        const logs = await window.dbService.getAll('logs');
        logs.sort((a, b) => b.timestamp - a.timestamp); // newest first
        const recent = logs.slice(0, 15);

        const container = document.getElementById('activityLogs');
        if (recent.length === 0) {
            container.innerHTML = '<p class="text-muted">No activities found.</p>';
            return;
        }

        let html = '';
        recent.forEach(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            html += `<div style="padding: 8px 0; border-bottom: 1px dotted var(--border);">
                        <span class="text-muted">[${time}]</span> 
                        <strong>${log.user}:</strong> ${log.action}
                     </div>`;
        });
        container.innerHTML = html;

    } catch (err) {
        console.error(err);
    }
}

// Save Today Profit — downloads backup only, does NOT clear data
async function saveTodayProfit() {
    try {
        const orders = await window.dbService.getAll('orders');
        const logs = await window.dbService.getAll('logs');

        // Filter today's orders for a summary
        const todayStr = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.timestamp).toDateString() === todayStr);
        const totalRevenue = todayOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + o.total, 0);

        const backup = {
            date: new Date().toISOString().split('T')[0],
            summary: {
                totalOrders: todayOrders.length,
                totalRevenue: totalRevenue.toFixed(2)
            },
            orders,
            logs,
            exportedAt: new Date().toISOString()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `canteen_profit_${new Date().toISOString().split('T')[0]}.json`);
        dlAnchor.click();

        await window.dbService.logActivity('Today\'s Profit Saved (Backup Downloaded)', 'Admin');
        alert(`✅ Profit saved!\n\nDate: ${new Date().toDateString()}\nTotal Revenue: $${totalRevenue.toFixed(2)}\nOrders: ${todayOrders.length}\n\nFile downloaded. Data NOT cleared.`);
    } catch (err) {
        alert('Error saving profit: ' + err);
    }
}

// Reset the Day — clears orders + logs, resets token counter to 1
async function resetTheDay() {
    if (confirm('⚠️ Reset the Day:\n\nThis will:\n• Clear ALL orders from the database\n• Clear ALL activity logs\n• Reset the token counter to #1\n\nMake sure you have saved today\'s profit first!\n\nProceed?')) {
        try {
            await window.dbService.clear('orders');
            await window.dbService.clear('logs');
            await window.dbService.put('settings', { key: 'currentToken', value: 0 });
            await window.dbService.put('settings', { key: 'tokenDate', value: new Date().toDateString() });
            await window.dbService.logActivity('Day Reset — All orders & logs cleared, token reset to 1', 'Admin');

            alert('✅ Day has been reset!\n\nOrders cleared, logs cleared, token counter reset to #1.');
            window.location.reload();
        } catch (err) {
            alert('Error resetting day: ' + err);
        }
    }
}

