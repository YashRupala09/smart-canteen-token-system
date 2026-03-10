document.addEventListener('appReady', () => {
    loadMenu();

    // Attach listeners
    document.getElementById('menuForm').addEventListener('submit', handleMenuSubmit);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);

    // Image Upload Preview handler
    document.getElementById('itemImage').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                const imgDisplay = `<img src="${evt.target.result}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">`;
                document.getElementById('imagePreview').innerHTML = imgDisplay;
                // Store base64 inside dataset for saving
                document.getElementById('itemImage').dataset.base64 = evt.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
});

let menuItems = [];

async function loadMenu() {
    try {
        menuItems = await window.dbService.getAll('menuItems');
        renderMenu(menuItems);
    } catch (err) {
        console.error('Failed to load menu items:', err);
    }
}

function renderMenu(items) {
    const tbody = document.getElementById('menuTableBody');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';

    if (items.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border)';
            tr.innerHTML = `
                <td data-label="Image" style="padding: 12px;">
                    ${item.image
                        ? `<img src="${item.image}" alt="img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;"
                               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <div style="width:50px; height:50px; background:var(--bg-base); border-radius:8px; display:none; align-items:center; justify-content:center; font-size:1.5rem;">🍲</div>`
                        : `<div style="width:50px; height:50px; background:var(--bg-base); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">🍲</div>`}
                </td>
                <td data-label="Name" style="padding: 12px; font-weight: 500;">
                    ${item.name}
                    ${item.popular ? '<span class="badge badge-pending" style="margin-left:8px; font-size: 0.65rem;">🌭 Popular</span>' : ''}
                </td>
                <td data-label="Category" style="padding: 12px;">${item.category}</td>
                <td data-label="Price" style="padding: 12px; font-weight:bold;">$${parseFloat(item.price).toFixed(2)}</td>
                <td data-label="Status" style="padding: 12px;">
                    ${item.available
                    ? '<span class="badge badge-ready">Available</span>'
                    : '<span class="badge badge-pending" style="color:var(--danger)">Out of Stock</span>'}
                </td>
                <td data-label="Actions" style="padding: 12px; text-align: right;">
                    <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.75rem;" onclick="editItem('${item.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding: 6px 10px; font-size: 0.75rem;" onclick="deleteItem('${item.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    const filtered = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCat = category === "" || item.category === category;
        return matchesSearch && matchesCat;
    });

    renderMenu(filtered);
}

function openMenuModal() {
    document.getElementById('menuForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('modalTitle').innerText = 'Add Menu Item';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('itemImage').dataset.base64 = '';

    document.getElementById('menuModal').style.display = 'flex';
}

function closeMenuModal() {
    document.getElementById('menuModal').style.display = 'none';
}

async function handleMenuSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('itemId').value || 'item_' + Date.now();
    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    const price = document.getElementById('itemPrice').value;
    const prepTime = document.getElementById('itemPrepTime').value;
    const available = document.getElementById('itemAvailable').checked;
    const popular = document.getElementById('itemPopular').checked;
    const imageBase64 = document.getElementById('itemImage').dataset.base64;

    const itemData = {
        id,
        name,
        category,
        price: parseFloat(price),
        prepTime: parseInt(prepTime),
        available,
        popular,
        image: imageBase64 || null
    };

    // If editing and no new image is provided, keep old image
    if (document.getElementById('itemId').value && !imageBase64) {
        const existing = menuItems.find(i => i.id === id);
        if (existing && existing.image) itemData.image = existing.image;
    }

    try {
        await window.dbService.put('menuItems', itemData);
        await window.dbService.logActivity(id.includes('item_') ? 'Added Items: ' + name : 'Updated Item: ' + name);
        closeMenuModal();
        loadMenu(); // Refresh
    } catch (err) {
        alert("Failed to save item: " + err);
    }
}

function editItem(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemPrepTime').value = item.prepTime;
    document.getElementById('itemAvailable').checked = item.available;
    document.getElementById('itemPopular').checked = item.popular;

    if (item.image) {
        document.getElementById('imagePreview').innerHTML = `<img src="${item.image}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" onerror="this.outerHTML='<div style=\\'width:100px;height:100px;background:var(--bg-base);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:2rem;\\'>🍲</div>'">`;
    } else {
        document.getElementById('imagePreview').innerHTML = '';
    }

    document.getElementById('modalTitle').innerText = 'Edit Menu Item';
    document.getElementById('menuModal').style.display = 'flex';
}

async function deleteItem(id) {
    if (confirm("Are you sure you want to delete this menu item?")) {
        try {
            await window.dbService.delete('menuItems', id);
            await window.dbService.logActivity('Deleted Item: ' + id);
            loadMenu();
        } catch (err) {
            alert("Failed to delete item: " + err);
        }
    }
}
