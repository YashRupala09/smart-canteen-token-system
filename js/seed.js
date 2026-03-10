async function seedDummyData() {
    if (!confirm("This will add 50 dummy records to Menu, Orders, and Logs. Proceed?")) return;

    try {
        const categories = ['Breakfast', 'Lunch', 'Snacks', 'Beverages'];
        const statuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
        const foodNames = ['Burger', 'Pizza', 'Salad', 'Sandwich', 'Pasta', 'Coffee', 'Tea', 'Fries', 'Wrap', 'Taco', 'Noodles', 'Shake', 'Burrito', 'Sushi', 'Cake'];
        const adjectives = ['Spicy', 'Crispy', 'Classic', 'Deluxe', 'Cheesy', 'Vegan', 'Double', 'Special', 'Sweet', 'Healthy', 'Jumbo', 'Mini', 'Toasted', 'Iced', 'Hot'];

        let addedMenuIds = [];

        // 1. Generate 50 Menu Items
        for (let i = 1; i <= 50; i++) {
            const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
            const food = foodNames[Math.floor(Math.random() * foodNames.length)];
            const name = `${adj} ${food} ${i}`;
            const category = categories[Math.floor(Math.random() * categories.length)];
            const price = parseFloat((Math.random() * 15 + 2).toFixed(2));
            const prepTime = Math.floor(Math.random() * 15) + 3;
            const popular = Math.random() > 0.8;
            
            // Use local dummy images to ensure offline/APK functionality
            const dummyImages = ['./images/coffee.jpg', './images/strawberry.jpg', './images/tomato.jpg', './images/ingredients.jpg'];
            const image = dummyImages[Math.floor(Math.random() * dummyImages.length)];

            const id = 'item_dummy_' + Date.now() + '_' + i;
            addedMenuIds.push({ id, name, price, category, prepTime });

            await window.dbService.put('menuItems', {
                id, name, category, price, prepTime, available: true, popular, image: image
            });
        }

        // 2. Generate 50 Orders
        let nextToken = await window.dbService.getNextToken();
        const now = Date.now();

        for (let i = 1; i <= 50; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const numItems = Math.floor(Math.random() * 4) + 1;
            const orderItems = [];
            let total = 0;
            let maxPrep = 0;

            for (let j = 0; j < numItems; j++) {
                const rndItem = addedMenuIds[Math.floor(Math.random() * addedMenuIds.length)];
                const qty = Math.floor(Math.random() * 3) + 1;
                orderItems.push({
                    id: rndItem.id,
                    name: rndItem.name,
                    price: rndItem.price,
                    qty: qty,
                    prepTime: rndItem.prepTime
                });
                total += rndItem.price * qty;
                if (rndItem.prepTime > maxPrep) maxPrep = rndItem.prepTime;
            }

            // Random timestamp spanning last 48 hours to make reports look full
            const randomTimeOffset = Math.floor(Math.random() * 48 * 60 * 60 * 1000);
            const timestamp = now - randomTimeOffset;

            await window.dbService.put('orders', {
                id: 'ord_dummy_' + Date.now() + '_' + i,
                tokenNumber: nextToken++,
                items: orderItems,
                total: parseFloat(total.toFixed(2)),
                status: status,
                timestamp: timestamp,
                notes: Math.random() > 0.8 ? "Dummy customer note" : "",
                estimatedPrepMins: maxPrep,
                cashier: "DummySeeder"
            });
        }
        await window.dbService.put('settings', { key: 'currentToken', value: nextToken });

        // 3. Generate 50 Logs
        for (let i = 1; i <= 50; i++) {
            await window.dbService.put('logs', {
                action: `System dummy action #${i} generated`,
                user: 'DummyAdmin',
                timestamp: now - Math.floor(Math.random() * 48 * 60 * 60 * 1000)
            });
        }

        alert("Successfully generated 50 dummy menu items, 50 orders, and 50 activity logs!");
        window.location.reload();

    } catch (err) {
        alert("Error seeding data: " + err);
    }
}
