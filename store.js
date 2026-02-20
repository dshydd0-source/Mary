// store.js

let db, doc, updateDoc, increment;
let getCurrentUser, updateUser, showWelcomeMessage, applyEquippedItems;
let userBalanceEl, storeItemListEl;

export const storeItems = {
    dresses: {
        dress_sky: {
            name: 'فستان سمائي',
            price: 2000,
            store_icon: 'dress_sky.png',
            game_file: 'character_sky.png'
        },
        dress_white: {
            name: 'فستان أبيض',
            price: 3000,
            store_icon: 'dress_white.png',
            game_file: 'character_white.png'
        },
        dress_pink: { name: 'فستان وردي', price: 250, game_file: 'character_pink.png' },
    },
    backgrounds: {
        bg_forest: { name: 'خلفية الغابة', price: 500, file: 'bg_forest.jpg' }
    },
    powers: {
        power_shield: { name: 'درع حماية (x1)', price: 150, description: 'يحميك من مثلث لمرة واحدة.' }
    },
    vouchers: {
        secret_gift_1: { name: 'اكتشف الهدية!', price: 1000, description: 'تواصل مع المطور لاستلام هديتك.' }
    }
};

const categoryTitles = {
    dresses: "👗 فساتين جديدة",
    backgrounds: "🖼️ خلفيات لعب",
    powers: "⚡️ قوى مساعدة (Powers)",
    vouchers: "🎁 هدية سرية من مريم"
};

export function initializeStore(config) {
    db = config.db;
    doc = config.doc;
    updateDoc = config.updateDoc;
    increment = config.increment;
    getCurrentUser = config.getCurrentUser;
    updateUser = config.updateUser;
    showWelcomeMessage = config.showWelcomeMessage;
    applyEquippedItems = config.applyEquippedItems;
    userBalanceEl = config.elements.userBalance;
    storeItemListEl = config.elements.storeItemList;

    // --- START: NEW DELEGATED EVENT LISTENER ---
    // This single listener is attached to the parent list.
    // It will handle clicks on any button inside it.
    if (storeItemListEl) {
        storeItemListEl.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button || button.disabled) {
                return; // Ignore clicks that aren't on an enabled button
            }

            const itemId = button.dataset.itemId;
            const category = button.dataset.category;

            if (button.classList.contains('buy-btn')) {
                buyItem(itemId);
            } else if (button.classList.contains('equip-btn')) {
                equipItem(itemId, category);
            } else if (button.classList.contains('unequip-btn')) {
                unequipItem(itemId, category);
            }
        });
    }
    // --- END: NEW DELEGATED EVENT LISTENER ---
}

export function renderStore() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    userBalanceEl.textContent = `رصيدك: ${currentUser.balance || 0} يمي`;
    storeItemListEl.innerHTML = ''; // Clear the list before re-rendering

    for (const categoryId in storeItems) {
        const category = storeItems[categoryId];

        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = categoryTitles[categoryId] || categoryId;
        storeItemListEl.appendChild(categoryTitle);

        for (const itemId in category) {
            const item = category[itemId];
            const li = document.createElement('li');
            li.className = 'store-item';

            const isOwned = currentUser.inventory?.[itemId] > 0;

            let buttonHtml;
            const dataAttrs = `data-item-id="${itemId}" data-category="${categoryId}"`;

            // Logic for equippable items (e.g., dresses)
            if (item.game_file) {
                const equipType = categoryId.slice(0, -1);
                const isEquipped = currentUser.equipped?.[equipType] === itemId;

                if (isOwned) {
                    if (isEquipped) {
                        buttonHtml = `<button class="unequip-btn" ${dataAttrs}>إلغاء التجهيز</button>`;
                    } else {
                        buttonHtml = `<button class="equip-btn" ${dataAttrs}>تجهيز</button>`;
                    }
                } else {
                    buttonHtml = `<button class="buy-btn" ${dataAttrs} ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
                }
            }
            // Logic for non-equippable items
            else {
                 if (isOwned) {
                     const count = currentUser.inventory[itemId];
                     buttonHtml = `<button class="equip-btn equipped" disabled>تم الشراء (x${count})</button>`;
                 } else {
                    buttonHtml = `<button class="buy-btn" ${dataAttrs} ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
                 }
            }

            li.innerHTML = `
                ${item.store_icon ? `<img src="${item.store_icon}" class="store-item-icon">` : ''}
                <div class="store-item-main">
                    <div class="store-item-details">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">${item.price} يمي</span>
                        ${buttonHtml}
                    </div>
                    <small>${item.description || ''}</small>
                </div>
            `;
            storeItemListEl.appendChild(li);
        }
    }
    // --- REMOVED ---
    // The old querySelectorAll loops for attaching listeners have been removed from here.
}

function findItem(itemId) {
    for (const categoryId in storeItems) {
        if (storeItems[categoryId][itemId]) {
            return { item: storeItems[categoryId][itemId], categoryId: categoryId };
        }
    }
    return null;
}

async function buyItem(itemId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const result = findItem(itemId);
    if (!result) return;
    const { item } = result;

    if ((currentUser.balance || 0) < item.price) {
        showWelcomeMessage("رصيدك غير كافٍ!");
        return;
    }

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        await updateDoc(userDocRef, {
            balance: increment(-item.price),
            [`inventory.${itemId}`]: increment(1)
        });

        const updatedUser = { ...currentUser };
        updatedUser.balance -= item.price;
        if (!updatedUser.inventory) updatedUser.inventory = {};
        updatedUser.inventory[itemId] = (updatedUser.inventory[itemId] || 0) + 1;
        updateUser(updatedUser);

        showWelcomeMessage(`تم شراء "${item.name}" بنجاح!`);
        renderStore();

    } catch (error) {
        console.error("Purchase Error: ", error);
        showWelcomeMessage("حدث خطأ أثناء الشراء.");
    }
}

async function equipItem(itemId, category) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        const keyToUpdate = `equipped.${category.slice(0, -1)}`;
        await updateDoc(userDocRef, {
            [keyToUpdate]: itemId
        });

        const updatedUser = { ...currentUser };
        if (!updatedUser.equipped) updatedUser.equipped = {};
        updatedUser.equipped[category.slice(0, -1)] = itemId;
        updateUser(updatedUser);

        showWelcomeMessage("تم تجهيز العنصر بنجاح!");
        applyEquippedItems(); // تطبيق التغيير فوراً
        renderStore();

    } catch (error) {
        console.error("Equip Error:", error);
        showWelcomeMessage("خطأ في تجهيز العنصر.");
    }
}

async function unequipItem(itemId, category) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        const keyToUpdate = `equipped.${category.slice(0, -1)}`;
        await updateDoc(userDocRef, {
            [keyToUpdate]: 'default'
        });

        const updatedUser = { ...currentUser };
        if (!updatedUser.equipped) updatedUser.equipped = {};
        updatedUser.equipped[category.slice(0, -1)] = 'default';
        updateUser(updatedUser);

        showWelcomeMessage("تم إلغاء تجهيز العنصر.");
        applyEquippedItems();
        renderStore();

    } catch (error) {
        console.error("Unequip Error:", error);
        showWelcomeMessage("خطأ في إلغاء تجهيز العنصر.");
    }
}
