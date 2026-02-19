// store.js

let db, doc, updateDoc, increment;
let getCurrentUser, updateUser, showWelcomeMessage;
let userBalanceEl, storeItemListEl;

// 1. تم إعادة هيكلة المنتجات لتكون ضمن أقسام
const storeItems = {
    dresses: {
        dress_pink: { name: 'فستان وردي', price: 250, file: 'character_pink.png' },
        dress_blue: { name: 'فستان أزرق', price: 250, file: 'character_blue.png' }
    },
    backgrounds: {
        bg_forest: { name: 'خلفية الغابة', price: 500, file: 'bg_forest.jpg' },
        bg_space: { name: 'خلفية الفضاء', price: 500, file: 'bg_space.jpg' }
    },
    powers: {
        power_shield: { name: 'درع حماية (x1)', price: 150, description: 'يحميك من مثلث لمرة واحدة.' },
        power_slowmo: { name: 'إبطاء الوقت (x1)', price: 200, description: 'يبطئ سرعة سقوط الأشكال.' }
    },
    vouchers: {
        voucher_100: { name: 'قسيمة شراء حقيقية', price: 1000, description: 'تواصل معنا لاستلامها.' }
    }
};

// قاموس لترجمة أسماء الأقسام
const categoryTitles = {
    dresses: "👗 فساتين جديدة",
    backgrounds: "🖼️ خلفيات لعب",
    powers: "⚡️ قوى مساعدة (Powers)",
    vouchers: "🎟️ قسائم شراء حقيقية"
};


/**
 * دالة لتهيئة وحدة المتجر
 */
export function initializeStore(config) {
    db = config.db;
    doc = config.doc;
    updateDoc = config.updateDoc;
    increment = config.increment;
    getCurrentUser = config.getCurrentUser;
    updateUser = config.updateUser;
    showWelcomeMessage = config.showWelcomeMessage;
    userBalanceEl = config.elements.userBalance;
    storeItemListEl = config.elements.storeItemList;
}

/**
 * 2. تم تحديث دالة العرض لإنشاء الأقسام والعناوين
 */
export function renderStore() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    userBalanceEl.textContent = `رصيدك: ${currentUser.balance || 0}`;
    storeItemListEl.innerHTML = ''; // مسح المحتوى القديم

    // المرور على كل قسم في المتجر
    for (const categoryId in storeItems) {
        const category = storeItems[categoryId];
        
        // إنشاء عنوان للقسم
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = categoryTitles[categoryId] || categoryId;
        storeItemListEl.appendChild(categoryTitle);

        // المرور على كل منتج داخل القسم
        for (const itemId in category) {
            const item = category[itemId];
            const li = document.createElement('li');
            li.className = 'store-item';
            
            const ownedCount = currentUser.inventory?.[itemId] || 0;

            li.innerHTML = `
                <div class="store-item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${item.price} نقطة</span>
                    <button class="buy-btn" data-item-id="${itemId}">شراء</button>
                </div>
                <small>${item.description || `تمتلك: ${ownedCount}`}</small>
            `;
            storeItemListEl.appendChild(li);
        }
    }

    // إضافة معالجات الأحداث لأزرار الشراء
    storeItemListEl.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => buyItem(btn.dataset.itemId));
    });
}

/**
 * 3. دالة مساعدة للبحث عن المنتج في الهيكل الجديد
 */
function findItem(itemId) {
    for (const categoryId in storeItems) {
        if (storeItems[categoryId][itemId]) {
            return storeItems[categoryId][itemId];
        }
    }
    return null; // المنتج غير موجود
}

/**
 * دالة لمعالجة عملية شراء عنصر
 */
async function buyItem(itemId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const item = findItem(itemId); // استخدام الدالة المساعدة
    if (!item) {
        console.error("Item not found:", itemId);
        return;
    }

    if ((currentUser.balance || 0) < item.price) {
        showWelcomeMessage("رصيدك غير كافٍ لشراء هذا العنصر!");
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
        showWelcomeMessage("حدث خطأ أثناء الشراء. حاول مرة أخرى.");
    }
}
