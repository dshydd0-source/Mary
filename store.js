// store.js

// سيتم تمرير هذه المتغيرات من السكريبت الرئيسي
let db, doc, updateDoc, increment;
let getCurrentUser, updateUser, showWelcomeMessage;
let userBalanceEl, storeItemListEl;

const storeItems = {
    'voucher_100': { name: 'قسيمة شراء', price: 100, description: 'استخدمها في العروض القادمة.' }
};

/**
 * دالة لتهيئة وحدة المتجر وتمرير الاعتماديات من السكريبت الرئيسي
 * @param {object} config - كائن يحتوي على الإعدادات والاعتماديات
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
 * دالة لعرض صفحة المتجر وتحديثها بالبيانات الحالية
 */
export function renderStore() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showWelcomeMessage("خطأ: لا يمكن عرض المتجر بدون مستخدم حالي.");
        return;
    }
    userBalanceEl.textContent = `رصيدك: ${currentUser.balance || 0}`;
    storeItemListEl.innerHTML = '';

    for (const itemId in storeItems) {
        const item = storeItems[itemId];
        const li = document.createElement('li');
        li.className = 'store-item';
        
        const ownedCount = currentUser.inventory?.[itemId] || 0;

        li.innerHTML = `
            <div class="store-item-details">
                <span class="item-name">${item.name}</span>
                <span class="item-price">${item.price} نقطة</span>
                <button class="buy-btn" data-item-id="${itemId}">شراء</button>
            </div>
            <small>تمتلك: ${ownedCount}</small>
        `;
        storeItemListEl.appendChild(li);
    }

    // إضافة معالجات الأحداث لأزرار الشراء
    storeItemListEl.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => buyItem(btn.dataset.itemId));
    });
}

/**
 * دالة لمعالجة عملية شراء عنصر
 * @param {string} itemId - معرف العنصر المراد شراؤه
 */
async function buyItem(itemId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const item = storeItems[itemId];
    if (!item) return;

    if ((currentUser.balance || 0) < item.price) {
        showWelcomeMessage("رصيدك غير كافٍ لشراء هذا العنصر!");
        return;
    }

    const userDocRef = doc(db, "users", currentUser.username);
    try {
        // تحديث قاعدة البيانات
        await updateDoc(userDocRef, {
            balance: increment(-item.price),
            [`inventory.${itemId}`]: increment(1)
        });

        // تحديث الكائن المحلي للمستخدم
        const updatedUser = { ...currentUser };
        updatedUser.balance -= item.price;
        if (!updatedUser.inventory) updatedUser.inventory = {};
        updatedUser.inventory[itemId] = (updatedUser.inventory[itemId] || 0) + 1;
        updateUser(updatedUser); // تحديث المستخدم في السكريبت الرئيسي
        
        showWelcomeMessage(`تم شراء "${item.name}" بنجاح!`);
        renderStore(); // إعادة عرض المتجر لإظهار الرصيد والمخزون المحدث

    } catch (error) {
        console.error("Purchase Error: ", error);
        showWelcomeMessage("حدث خطأ أثناء الشراء. حاول مرة أخرى.");
    }
}

