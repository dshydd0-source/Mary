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
        dress_ramadan: {
            name: 'فستان رمضان',
            price: 5000,
            store_icon: 'dress_ramadan.png',
            game_file: 'character_ramadan.png'
        },
    },
    backgrounds: {
        bg_bears: { name: 'خلفية دببة', price: 1000, file: 'bg_bears.jpg' },
        bg_space: { name: 'خلفية الفضاء', price: 2500, file: 'bg_space.jpg' },
        bg_temp1: { name: 'خلفية كارومي', price: 1000, file: 'bg_temp1.jpg' },
        bg_temp2: { name: 'خلفية الغابة', price: 1000, file: 'bg_temp2.jpg' },
        bg_temp3: { name: 'خلفية مملكة العلكة', price: 1000, file: 'bg_temp3.jpg' }
    },
    powers: {
        power_double_points: { name: 'نقاط مضاعفة', price: 65, description: 'تجعل الدوائر تزيد النقاط *2 لمدة 30 ثانية.' },
        power_no_triangles: { name: 'حجب المثلثات', price: 60, description: 'يحجب نزول المثلثاث لمدة 30 ثانية.' },
        power_attract_circles: { name: 'جاذب الدوائر', price: 50, description: 'تجعل الدوائر تنجذب للاعب لمدة 30 ثانية.' }
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

// Added a mapping from the plural category ID to the singular equipment type.
const categoryToEquipType = {
    dresses: 'dress',
    backgrounds: 'background'
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

    if (storeItemListEl) {
        storeItemListEl.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button || button.disabled) {
                return;
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
}

export function renderStore() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    userBalanceEl.textContent = `رصيدك: ${currentUser.balance || 0} يمي`;
    storeItemListEl.innerHTML = '';

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

            // -- START OF MODIFICATION --
            // Check if the item's category is equippable (dresses, backgrounds).
            if (categoryToEquipType[categoryId]) {
                const equipType = categoryToEquipType[categoryId];
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
            } else { // For non-equippable items like powers and vouchers.
                 if (isOwned) {
                     const count = currentUser.inventory[itemId];
                     buttonHtml = `<button class="equip-btn equipped" disabled>تم الشراء (x${count})</button>`;
                 } else {
                    buttonHtml = `<button class="buy-btn" ${dataAttrs} ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
                 }
            }

            // Use item.file as a fallback for the store icon.
            const iconSrc = item.store_icon || item.file;

            li.innerHTML = `
                ${iconSrc ? `<img src="${iconSrc}" class="store-item-icon">` : ''}
                <div class="store-item-main">
                    <div class="store-item-details">
                        <span class="item-name">${item.name}</span>
                        <span class="item-price">${item.price} يمي</span>
                        ${buttonHtml}
                    </div>
                    <small>${item.description || ''}</small>
                </div>
            `;
            // -- END OF MODIFICATION --
            storeItemListEl.appendChild(li);
        }
    }
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

    const equipType = categoryToEquipType[category];
    if (!equipType) {
        console.error("Equip Error: Unknown category", category);
        return;
    }

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        const keyToUpdate = `equipped.${equipType}`;
        await updateDoc(userDocRef, {
            [keyToUpdate]: itemId
        });

        const updatedUser = { ...currentUser };
        if (!updatedUser.equipped) updatedUser.equipped = {};
        updatedUser.equipped[equipType] = itemId;
        updateUser(updatedUser);

        showWelcomeMessage("تم تجهيز العنصر بنجاح!");
        applyEquippedItems(updatedUser);
        renderStore();

    } catch (error) {
        console.error("Equip Error:", error);
        showWelcomeMessage("خطأ في تجهيز العنصر.");
    }
}

async function unequipItem(itemId, category) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const equipType = categoryToEquipType[category];
    if (!equipType) {
        console.error("Unequip Error: Unknown category", category);
        return;
    }

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        const keyToUpdate = `equipped.${equipType}`;
        await updateDoc(userDocRef, {
            [keyToUpdate]: 'default'
        });

        const updatedUser = { ...currentUser };
        if (!updatedUser.equipped) updatedUser.equipped = {};
        updatedUser.equipped[equipType] = 'default';
        updateUser(updatedUser);

        showWelcomeMessage("تم إلغاء تجهيز العنصر.");
        applyEquippedItems(updatedUser);
        renderStore();

    } catch (error) {
        console.error("Unequip Error:", error);
        showWelcomeMessage("خطأ في إلغاء تجهيز العنصر.");
    }
}
