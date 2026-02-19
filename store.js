// store.js

let db, doc, updateDoc, increment;
let getCurrentUser, updateUser, showWelcomeMessage, applyEquippedItems;
let userBalanceEl, storeItemListEl;

// 1. تمت إضافة بيانات الفستان الجديد مع تحديد الصور
export const storeItems = {
    dresses: {
        dress_sky: { 
            name: 'فستان سمائي', 
            price: 2000, 
            store_icon: 'dress_sky.png', // صورة الأيقونة في المتجر
            game_file: 'character_sky.png' // ملف الشخصية الجديد للعبة
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
    applyEquippedItems = config.applyEquippedItems; // استيراد دالة التجهيز
    userBalanceEl = config.elements.userBalance;
    storeItemListEl = config.elements.storeItemList;
}

export function renderStore() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    userBalanceEl.textContent = `رصيدك: ${currentUser.balance || 0} يمي`; // 2. تغيير العملة
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
            const isEquipped = currentUser.equipped?.dress === itemId;

            let buttonHtml;
            if (isOwned) {
                if (isEquipped) {
                    buttonHtml = `<button class="equip-btn equipped" disabled>مجهز حاليًا</button>`;
                } else {
                    buttonHtml = `<button class="equip-btn" data-item-id="${itemId}" data-category="dresses">تجهيز</button>`;
                }
            } else {
                buttonHtml = `<button class="buy-btn" data-item-id="${itemId}" ${ (currentUser.balance || 0) < item.price ? 'disabled' : '' }>شراء</button>`;
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

    storeItemListEl.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => buyItem(btn.dataset.itemId));
    });
    
    storeItemListEl.querySelectorAll('.equip-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => equipItem(btn.dataset.itemId, btn.dataset.category));
    });
}

function findItem(itemId) {
    for (const categoryId in storeItems) {
        if (storeItems[categoryId][itemId]) {
            return storeItems[categoryId][itemId];
        }
    }
    return null;
}

async function buyItem(itemId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const item = findItem(itemId);
    if (!item) return;

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

// 3. دالة جديدة لتجهيز العنصر
async function equipItem(itemId, category) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        const keyToUpdate = `equipped.${category.slice(0, -1)}`; // 'dresses' -> 'dress'
        await updateDoc(userDocRef, {
            [keyToUpdate]: itemId
        });

        const updatedUser = { ...currentUser };
        if (!updatedUser.equipped) updatedUser.equipped = {};
        updatedUser.equipped[category.slice(0, -1)] = itemId;
        updateUser(updatedUser);

        showWelcomeMessage("تم تجهيز العنصر بنجاح!");
        applyEquippedItems(); // تطبيق التغيير فوراً على اللعبة
        renderStore(); // إعادة عرض المتجر لتحديث الأزرار

    } catch (error) {
        console.error("Equip Error:", error);
        showWelcomeMessage("خطأ في تجهيز العنصر.");
    }
}
