const PRODUCTS_URL = 'db/products.json';
let products = [];
let cart = {}; // { [id]: { product, qty } }

const el = {
    productsGrid: document.getElementById('products'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    refreshList: document.getElementById('refreshList'),
    cartModal: document.getElementById('cartModal'),
    cartItems: document.getElementById('cartItems'),
    totalPrice: document.getElementById('totalPrice'),
    openCartBtn: document.getElementById('openCartBtn'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartCount: document.getElementById('cartCount'),
    clearCart: document.getElementById('clearCart'),
    checkout: document.getElementById('checkout')
};

async function loadProducts() {
    try {
        const res = await fetch(PRODUCTS_URL, { cache: 'no-store' });
        if (!res.ok) {
            throw new Error('Failed to load products.json');
        }
        products = await res.json();
        renderProducts(products);
    } catch (err) {
        console.error(err);
        if (el.productsGrid) {
            el.productsGrid.innerHTML = `
                <div style="padding:20px;background:#fee;grid-column:1/-1;border-radius:8px">
                    Error: ${err.message}
                </div>
            `;
        }
    }
}

function renderProducts(list) {
    if (!el.productsGrid) {
        return;
    }

    if (!Array.isArray(list)) {
        list = [];
    }

    if (list.length === 0) {
        el.productsGrid.innerHTML = `
            <div style="grid-column:1/-1;padding:20px;background:#fff;border-radius:8px;text-align:center">
                No products found.
            </div>
        `;
        return;
    }

    el.productsGrid.innerHTML = '';

    list.forEach((p) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `
            <img src="${p.image}" alt="${escapeHtml(p.name)}">
            <div class="card-body">
                <div class="title">${escapeHtml(p.name)}</div>
                <div class="muted">ID: ${p.id}</div>
                <div class="price">${formatPrice(p.price)} €</div>
                <div class="card-actions">
                    <button class="btn add" data-id="${p.id}">Add to cart</button>
                </div>
            </div>
        `;
        el.productsGrid.appendChild(card);
    });

    el.productsGrid.querySelectorAll('.btn.add').forEach((btn) => {
        btn.addEventListener('click', () => {
            addToCart(parseInt(btn.dataset.id, 10));
        });
    });
}

el.searchInput.addEventListener('input', () => {
    const q = el.searchInput.value.trim().toLowerCase();

    if (!q) {
        renderProducts(products);
        return;
    }

    const filtered = products.filter((p) => p.name.toLowerCase().includes(q));
    renderProducts(filtered);
});

el.clearSearch.addEventListener('click', () => {
    el.searchInput.value = '';
    el.searchInput.dispatchEvent(new Event('input'));
});

el.refreshList.addEventListener('click', () => {
    el.searchInput.dispatchEvent(new Event('input'));
});

function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p) {
        return;
    }

    if (!cart[id]) {
        cart[id] = { product: p, qty: 0 };
    }

    cart[id].qty += 1;

    saveCart();
    renderCart();
}

function changeQty(id, delta) {
    if (!cart[id]) {
        return;
    }

    cart[id].qty += delta;

    if (cart[id].qty <= 0) {
        delete cart[id];
    }

    saveCart();
    renderCart();
}

function removeFromCart(id) {
    if (cart[id]) {
        delete cart[id];
        saveCart();
        renderCart();
    }
}

function renderCart() {
    if (!el.cartItems) {
        return;
    }

    el.cartItems.innerHTML = '';

    const entries = Object.values(cart);

    if (entries.length === 0) {
        el.cartItems.innerHTML = `
            <div style="padding:12px;color:var(--muted)">Cart is empty</div>
        `;
        el.totalPrice.textContent = '0.00';
        el.cartCount.textContent = '0';
        return;
    }

    entries.forEach(({ product, qty }) => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <img src="${product.image}" alt="">
            <div style="flex:1">
                <div style="font-weight:700">${escapeHtml(product.name)}</div>
                <div style="font-size:13px;color:var(--muted)">Price: ${formatPrice(product.price)} €</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end">
                <div class="qty-controls">
                    <button class="btn" data-action="dec" data-id="${product.id}">-</button>
                    <div style="min-width:28px;text-align:center">${qty}</div>
                    <button class="btn" data-action="inc" data-id="${product.id}">+</button>
                </div>
                <button
                    class="btn secondary"
                    data-action="remove"
                    data-id="${product.id}"
                    style="margin-top:8px"
                >
                    Remove
                </button>
            </div>
        `;
        el.cartItems.appendChild(row);
    });

    el.cartItems.querySelectorAll('button').forEach((b) => {
        const id = parseInt(b.dataset.id, 10);
        const act = b.dataset.action;

        if (act === 'inc') {
            b.addEventListener('click', () => changeQty(id, 1));
        }

        if (act === 'dec') {
            b.addEventListener('click', () => changeQty(id, -1));
        }

        if (act === 'remove') {
            b.addEventListener('click', () => removeFromCart(id));
        }
    });

    const total = entries.reduce((sum, { product, qty }) => {
        return sum + Number(product.price) * qty;
    }, 0);

    el.totalPrice.textContent = formatPrice(total) + " €";

    const count = entries.reduce((sum, { qty }) => sum + qty, 0);
    el.cartCount.textContent = String(count);
}

function saveCart() {
    try {
        localStorage.setItem('cart_v1', JSON.stringify(cart));
    } catch (e) {
        console.warn('Failed to save cart', e);
    }
}

function loadCart() {
    try {
        const raw = localStorage.getItem('cart_v1');
        if (!raw) {
            return;
        }
        cart = JSON.parse(raw) || {};
    } catch (e) {
        console.warn('Failed to load cart', e);
        cart = {};
    }
}

function openModal(modal) {
    if (!modal) {
        return;
    }

    modal.removeAttribute('hidden');

    modal.offsetHeight; 

    modal.classList.add('show');
    document.body.style.overflow = 'hidden'

    modal._previousActive = document.activeElement;

    modal._keyHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal(modal);
        }
    };

    document.addEventListener('keydown', modal._keyHandler);
}

function closeModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove('show');
    document.body.style.overflow = '';

    const handleHidden = () => {
        modal.setAttribute('hidden', '');
        if (modal._previousActive) {
            modal._previousActive.focus();
        }
        if (modal._keyHandler) {
            document.removeEventListener('keydown', modal._keyHandler);
        }
        modal.removeEventListener('transitionend', handleHidden);
    };

    modal.addEventListener('transitionend', handleHidden);
    setTimeout(handleHidden, 350);
}

function maintainFocus(e, focusable) {
    if (!focusable || focusable.length === 0) {
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const isFirst = document.activeElement === first;
    const isLast = document.activeElement === last;

    if (e.shiftKey && isFirst) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && isLast) {
        e.preventDefault();
        first.focus();
    }
}

el.openCartBtn.addEventListener('click', () => {
    openModal(el.cartModal);
    renderCart();
});

el.closeCartBtn.addEventListener('click', () => {
    closeModal(el.cartModal);
});

el.cartModal.addEventListener('click', (e) => {
    if (e.target.dataset.dismiss) {
        closeModal(el.cartModal);
    }
});

el.clearCart.addEventListener('click', () => {
    if (confirm('Clear cart?')) {
        cart = {};
        saveCart();
        renderCart();
    }
});

el.checkout.addEventListener('click', () => {
    if (confirm('Proceed to checkout?')) {
        alert('Checkout is not implemented.');
    }
});

function formatPrice(n) {
    return Number(n)
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c];
    });
}



loadCart();

loadProducts().then(() => {
    Object.keys(cart).forEach((key) => {
        const id = parseInt(key, 10);
        const p = products.find((x) => x.id === id);

        if (p) {
            cart[id].product = p;
        } else {
            delete cart[id];
        }
    });

    renderCart();
});
