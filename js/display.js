document.addEventListener('appReady', () => {
    // Update display every 3 seconds
    setInterval(fetchDisplayData, 3000);
    setInterval(updateClock, 1000);
    fetchDisplayData();
});

let knownReadyTokens = new Set();

async function fetchDisplayData() {
    try {
        const allOrders = await window.dbService.getAll('orders');

        const preparing = allOrders.filter(o => o.status === 'preparing')
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(o => o.tokenNumber);

        const ready = allOrders.filter(o => o.status === 'ready')
            .sort((a, b) => b.timestamp - a.timestamp) // newest ready first
            .slice(0, 15) // Only show the last 15 ready tokens so it doesn't overflow infinitely
            .map(o => o.tokenNumber);

        renderTokens('preparingGrid', preparing, 'preparing');
        renderTokens('readyGrid', ready, 'ready');

        checkForNewReady(ready);

    } catch (err) {
        console.error("Failed to fetch display data:", err);
    }
}

function renderTokens(containerId, tokens, statusClass) {
    const container = document.getElementById(containerId);

    // Instead of completely re-rendering which breaks animations, 
    // we'll update DOM smartly in a real world app, but for simplicity here we'll re-render
    // since we use CSS animations on creation.

    // Quick diff check to avoid unnecessary re-rending
    const currentHTML = container.innerHTML;
    const newHTML = tokens.map(t => `<div class="token-item ${statusClass}">${t}</div>`).join('');

    // Normalizing whitespace for comparison
    if (currentHTML.replace(/\s+/g, '') !== newHTML.replace(/\s+/g, '')) {
        container.innerHTML = newHTML;
    }
}

function checkForNewReady(readyTokens) {
    let playSound = false;

    readyTokens.forEach(token => {
        if (!knownReadyTokens.has(token)) {
            // Found a new token!
            playSound = true;
            knownReadyTokens.add(token);
        }
    });

    if (playSound) {
        // Optional chime for new ready orders
        // Play only if user interacted with the page earlier (browser security)
        const chime = document.getElementById('chimeSound');
        chime.play().catch(e => console.log("Audio play blocked by browser until user interacts."));
    }
}

function updateClock() {
    document.getElementById('clock').innerText = new Date().toLocaleTimeString();
}
