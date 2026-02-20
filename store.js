// store.js

let db, doc, updateDoc, increment;
let getCurrentUser, updateUser, showWelcomeMessage, applyEquippedItems, activatePower;
let userBalanceEl, storeItemListEl;

export const storeItems = {
    dresses: {
        dress_sky: { name: 'فستان سمائي', price: 2000, store_icon: 'dress_sky.png', game_file: 'character_sky.png' },
        dress_white: { name: 'فستان أبيض', price: 3000, store_icon: 'dress_white.png', game_file: 'character_white.png' },
        dress_ramadan: { name: 'فستان رمضان', price: 5000, store_icon: 'dress_ramadan.png', game_file: 'character_ramadan.png' },
    },
    backgrounds: {
        bg_bears: { name: 'خلفية دببة', price: 1000, file: 'bg_bears.jpg' },
        bg_space: { name: 'خلفية الفضاء', price: 2500, file: 'bg_space.jpg' },
        bg_temp1: { name: 'خلفية كارومي', price: 1000, file: 'bg_temp1.jpg' },
        bg_temp2: { name: 'خلفية الغابة', price: 1000, file: 'bg_temp2.jpg' },
        bg_temp3: { name: 'خلفية مملكة العلكة', price: 1000, file: 'bg_temp3.jpg' }
    },
    powers: {
        power_shield: { name: 'درع حماية (x1)', price: 40, description: 'يحميك من الممية لمرة واحدة.' },
        power_double_points: { name: 'نقاط مضاعفة', price: 70, description: 'تجعل الاكل تزيد النقاط *2 لمدة 30 ثانية.' },
        power_no_triangles: { name: 'حجب المميات', price: 60, description: 'يحجب نزول المميات لمدة 30 ثانية.' },
        power_attract_circles: { name: 'مغناطيس الاكل', price: 50, description: 'تجعل الأكل ينجذب للاعب لمدة 30 ثانية.' }
    },
    vouchers: {
        secret_gift_1: { name: 'اكتشف الهدية!', price: 100000, description: 'تواصل مع حساب مريومة على الانستغرام لاستلام هديتك.' }
    }
};


const categoryTitles = {
    dresses: "👗 فساتين جديدة",
    backgrounds: "🖼️ خلفيات لعب",
    powers: "⚡️ قوى مساعدة (Powers)",
    vouchers: "🎁 هدية سرية من مريم"
};

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
    activatePower = config.activatePower; // Get the activatePower function from the game
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
            } else if (button.classList.contains('activate-btn')) { // NEW: Handle activate button click
                activateAndConsumePower(itemId);
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
            
            let buttonHtml;
            const dataAttrs = `data-item-id="${itemId}" data-category="${categoryId}"`;

            if (categoryToEquipType[categoryId]) { // Logic for Dresses and Backgrounds (Equippable)
                const equipType = categoryToEquipType[categoryId];
                const isEquipped = currentUser.equipped?.[equipType] === itemId;
                const isOwned = currentUser.inventory?.[itemId] > 0;

                if (isOwned) {
                    if (isEquipped) {
                        buttonHtml = `<button class="unequip-btn" ${dataAttrs}>إلغاء التجهيز</button>`;
                    } else {
                        buttonHtml = `<button class="equip-btn" ${dataAttrs}>تجهيز</button>`;
                    }
                } else {
                    buttonHtml = `<button class="buy-btn" ${dataAttrs} ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
                }
            } else { // MODIFIED: Logic for Powers and Vouchers (Consumable)
                 const count = currentUser.inventory?.[itemId] || 0;
                 if (categoryId === 'powers') {
                     if (count > 0) {
                         // If player owns the power, show count and Activate button
                         buttonHtml = `
                            <div class="power-actions">
                                <span class="item-count">(لديك: ${count})</span>
                                <button class="activate-btn" ${dataAttrs}>تفعيل</button>
                            </div>`;
                     } else {
                         // Otherwise, show the buy button
                         buttonHtml = `<button class="buy-btn" ${dataAttrs} ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
                     }
                 } else { // For vouchers etc.
                     if (count > 0) {
                         buttonHtml = `<button class="equip-btn equipped" disabled>تم الشراء (x${count})</button>`;
                     } else {
                         buttonHtml = `<button class="buy-btn" ${dataAttrs} ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
                     }
                 }
            }

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
    const { item, categoryId } = result;

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
        
        // REMOVED: The code that automatically activated the power on purchase is deleted from here.

        showWelcomeMessage(`تم شراء "${item.name}" بنجاح!`);
        renderStore();

    } catch (error) {
        console.error("Purchase Error: ", error);
        showWelcomeMessage("حدث خطأ أثناء الشراء.");
    }
}

// NEW: Function to handle activating and consuming a power
async function activateAndConsumePower(itemId) {
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.inventory?.[itemId] || 0) <= 0) {
        showWelcomeMessage("ليس لديك هذه القوة لاستخدامها!");
        return;
    }

    // Check if player is in game? If not, the power will be ready for the next round.
    // The main game logic handles this.

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        // Decrement the power count in Firestore
        await updateDoc(userDocRef, {
            [`inventory.${itemId}`]: increment(-1)
        });

        // Update local user object
        const updatedUser = { ...currentUser };
        updatedUser.inventory[itemId]--;
        updateUser(updatedUser);

        // Call the main game function to apply the power's effect
        if (activatePower) {
            activatePower(itemId);
        } else {
             console.error("activatePower function is not available.");
             // Optional: Revert the transaction if activation fails critically
             await updateDoc(userDocRef, { [`inventory.${itemId}`]: increment(1) });
             updatedUser.inventory[itemId]++;
             updateUser(updatedUser);
             showWelcomeMessage("خطأ في تفعيل القوة.");
             return;
        }
        
        showWelcomeMessage(`تم تفعيل: ${storeItems.powers[itemId].name}`);
        
        // Re-render the store to show the updated count or hide the item if count is zero
        renderStore();

    } catch (error) {
        console.error("Power Activation Error: ", error);
        showWelcomeMessage("حدث خطأ أثناء تفعيل القوة.");
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
