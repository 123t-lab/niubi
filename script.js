const INITIAL_AMOUNT = 300;
const USE_AMOUNT = 30;
let editingMemberId = null;
let usingMemberId = null;
let rechargingMemberId = null;
let editingProductId = null;

// 分页相关变量
let currentMemberPage = 1;
let currentProductPage = 1;
const pageSize = 10;

// 商品分类相关变量
let currentProductCategory = 'all';

function loadMembers() {
    const members = localStorage.getItem('members');
    return members ? JSON.parse(members) : [];
}

function saveMembers(members) {
    localStorage.setItem('members', JSON.stringify(members));
    fetch('/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(members)
    })
}

function addMember() {
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const birthday = document.getElementById('birthday').value;

    if (!name) {
        alert('请输入会员姓名');
        return;
    }
    if (!phone) {
        alert('请输入联系电话');
        return;
    }

    const members = loadMembers();
    const newMember = {
        id: Date.now(),
        name: name,
        phone: phone,
        birthday: birthday || '',
        amount: INITIAL_AMOUNT,
        status: 'active',
        history: []
    };

    members.push(newMember);
    saveMembers(members);

    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('birthday').value = '';

    renderMembers();
    alert('会员登记成功！');
}

function useAmount(id) {
    const members = loadMembers();
    const member = members.find(m => m.id === id);

    if (!member) return;

    if (!member.history) {
        member.history = [];
    }

    if (member.status === 'inactive') {
        alert('该会员已失效，无法使用');
        return;
    }

    if (member.amount < USE_AMOUNT) {
        member.amount = 0;
        member.status = 'inactive';
        member.history.unshift({
            date: new Date().toLocaleString(),
            amount: USE_AMOUNT,
            balance: 0,
            type: 'inactive'
        });
        saveMembers(members);
        renderMembers();
        alert('余额不足，会员已失效！');
        return;
    }

    usingMemberId = id;
    // 清空搜索框和表单
    document.getElementById('productSearch').value = '';
    document.getElementById('productSearchResults').innerHTML = '';
    document.getElementById('productCode').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productSize').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('selectedProductId').value = '';
    document.getElementById('productModal').classList.add('show');
}

function searchProductInModal() {
    const keyword = document.getElementById('productSearch').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('productSearchResults');
    
    if (!keyword) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    const products = loadProducts();
    const filteredProducts = products.filter(product =>
        product.code.toLowerCase().includes(keyword) ||
        product.name.toLowerCase().includes(keyword)
    );
    
    if (filteredProducts.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item" style="color: #999;">未找到匹配的商品</div>';
        return;
    }
    
    resultsContainer.innerHTML = filteredProducts.map(product => `
        <div class="search-result-item" onclick="selectProductFromSearch(${product.id})">
            <div class="search-result-main">
                <span class="product-code">${product.code}</span>
                <span class="product-name">${product.name}</span>
            </div>
            <div class="search-result-details">
                <span class="product-category">${product.category}</span>
                <span class="product-size">尺码: ${product.size || '-'}</span>
                <span class="product-price">${product.price.toFixed(2)}元</span>
            </div>
        </div>
    `).join('');
}

function selectProductFromSearch(productId) {
    const products = loadProducts();
    const product = products.find(p => p.id == productId);
    
    if (product) {
        document.getElementById('productCode').value = product.code;
        document.getElementById('productName').value = product.name;
        document.getElementById('productSize').value = product.size || '';
        document.getElementById('productPrice').value = product.price;
        document.getElementById('selectedProductId').value = product.id;
        document.getElementById('productSearchResults').innerHTML = '';
        document.getElementById('productSearch').value = product.name;
    }
}

function confirmProduct() {
    const productCode = document.getElementById('productCode').value.trim();
    const productName = document.getElementById('productName').value.trim();
    const productSize = document.getElementById('productSize').value.trim();
    const productPrice = document.getElementById('productPrice').value.trim();
    const selectedProductId = document.getElementById('selectedProductId').value;

    if (!productCode) {
        alert('请输入商品编号');
        return;
    }
    if (!productName) {
        alert('请输入商品名称');
        return;
    }
    if (!productPrice) {
        alert('请输入商品价格');
        return;
    }

    const members = loadMembers();
    const member = members.find(m => m.id === usingMemberId);

    if (!member) return;

    member.amount -= USE_AMOUNT;

    member.history.unshift({
        date: new Date().toLocaleString(),
        amount: USE_AMOUNT,
        balance: member.amount,
        type: 'use',
        productCode: productCode,
        productName: productName,
        productSize: productSize,
        productPrice: parseFloat(productPrice)
    });

    // 自动删除商品 - 使用ID而不是编号
    const products = loadProducts();
    const productIndex = products.findIndex(p => p.id == selectedProductId);
    if (productIndex !== -1) {
        products.splice(productIndex, 1);
        saveProducts(products);
        renderProducts();
    }

    if (member.amount <= 0) {
        member.amount = 0;
        member.status = 'inactive';
        alert('余额已用完，会员已失效！');
    } else {
        alert('使用成功，扣除30元，剩余 ' + member.amount + ' 元');
    }

    saveMembers(members);
    renderMembers(members);
    closeProductModal();
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
    usingMemberId = null;
}

function deleteMember(id) {
    if (!confirm('确定要删除该会员吗？')) return;

    let members = loadMembers();
    members = members.filter(m => m.id !== id);
    saveMembers(members);
    renderMembers();
}

function renderMembers(members) {
    if (!members) {
        members = loadMembers();
    }

    const tbody = document.getElementById('memberTable');

    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">暂无会员信息</td></tr>';
        document.getElementById('memberCount').textContent = '(0人)';
        document.getElementById('memberPagination')?.remove();
        return;
    }

    const today = new Date();

    members = members.map(member => {
        let isBirthday = false;
        let displayBirthday = '';
        if (member.birthday) {
            const bParts = member.birthday.split('-');
            if (bParts.length === 3) {
                const bYear = parseInt(bParts[0]);
                const bMonth = parseInt(bParts[1]);
                const bDate = parseInt(bParts[2]);
                displayBirthday = `${bYear}年${bMonth}月${bDate}日`;
                
                // 使用公历生日判断
                const today = new Date();
                const todayMonth = today.getMonth() + 1;
                const todayDate = today.getDate();
                isBirthday = (bMonth === todayMonth && bDate === todayDate);
            }
        }
        return { ...member, isBirthday, displayBirthday };
    });

    members.sort((a, b) => {
        if (a.isBirthday && !b.isBirthday) return -1;
        if (!a.isBirthday && b.isBirthday) return 1;
        return 0;
    });

    const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    let displayCount = members.length;
    if (keyword) {
        members = members.filter(member =>
            member.name.toLowerCase().includes(keyword) ||
            member.phone.toLowerCase().includes(keyword)
        );
        document.getElementById('memberCount').textContent = `(${displayCount}人，显示${members.length}人)`;
    } else {
        document.getElementById('memberCount').textContent = `(${members.length}人)`;
    }

    // 分页处理
    const totalPages = Math.ceil(members.length / pageSize);
    const totalCount = members.length;
    const startIndex = (currentMemberPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMembers = members.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedMembers.map(member => `
        <tr class="${member.isBirthday ? 'birthday-row' : ''}">
            <td>${member.name} ${member.isBirthday ? '🎂' : ''}</td>
            <td>${member.phone}</td>
            <td>${member.displayBirthday || '-'}</td>
            <td class="amount-display">${member.amount} 元</td>
            <td>
                <span class="${member.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${member.status === 'active' ? '有效' : '已失效'}
                </span>
            </td>
            <td>
                <button class="btn btn-success use-btn" onclick="useAmount(${member.id})" ${member.status === 'inactive' ? 'disabled' : ''}>
                    使用
                </button>
                <button class="btn btn-warning use-btn" onclick="editMember(${member.id})">
                    修改
                </button>
                <button class="btn btn-primary use-btn" onclick="rechargeMember(${member.id})">
                    充值
                </button>
                <button class="btn btn-danger delete-btn" onclick="deleteMember(${member.id})">
                    删除
                </button>
                <button class="btn btn-info use-btn" onclick="showHistory(${member.id})">
                    历史
                </button>
            </td>
        </tr>
    `).join('');

    // 添加分页控件
    addMemberPagination(totalPages, totalCount);
}

function addMemberPagination(totalPages, totalCount) {
    const oldPagination = document.getElementById('memberPagination');
    if (oldPagination) {
        oldPagination.remove();
    }

    if (totalPages <= 1) return;

    const pagination = document.createElement('div');
    pagination.id = 'memberPagination';
    pagination.className = 'pagination';

    let paginationHTML = `<span class="pagination-info">共 ${totalCount} 条，第 ${currentMemberPage}/${totalPages} 页</span>`;
    
    paginationHTML += `<button class="btn btn-sm" onclick="changeMemberPage(${currentMemberPage - 1})" ${currentMemberPage === 1 ? 'disabled' : ''}>&laquo; 上一页</button>`;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentMemberPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="btn btn-sm" onclick="changeMemberPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="btn btn-sm ${i === currentMemberPage ? 'active' : ''}" onclick="changeMemberPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="btn btn-sm" onclick="changeMemberPage(${totalPages})">${totalPages}</button>`;
    }
    
    paginationHTML += `<button class="btn btn-sm" onclick="changeMemberPage(${currentMemberPage + 1})" ${currentMemberPage === totalPages ? 'disabled' : ''}>下一页 &raquo;</button>`;
    
    pagination.innerHTML = paginationHTML;
    
    const table = document.querySelector('#membersTab .member-list');
    if (table) {
        table.parentNode.insertBefore(pagination, table.nextSibling);
    }
}

function changeMemberPage(page) {
    currentMemberPage = page;
    renderMembers();
}

function searchMembers() {
    currentMemberPage = 1;
    renderMembers();
}

function editMember(id) {
    const password = prompt('请输入管理密码：');
    if (password !== '5684166') {
        if (password !== null) {
            alert('密码错误！');
        }
        return;
    }

    const members = loadMembers();
    const member = members.find(m => m.id === id);

    if (!member) return;

    editingMemberId = id;
    document.getElementById('editName').value = member.name;
    document.getElementById('editPhone').value = member.phone;
    document.getElementById('editBirthday').value = member.birthday || '';
    document.getElementById('editModal').classList.add('show');
}

function confirmEdit() {
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const birthday = document.getElementById('editBirthday').value;

    if (!name) {
        alert('请输入会员姓名');
        return;
    }
    if (!phone) {
        alert('请输入联系电话');
        return;
    }

    const members = loadMembers();
    const member = members.find(m => m.id === editingMemberId);

    if (member) {
        member.name = name;
        member.phone = phone;
        member.birthday = birthday || '';
        saveMembers(members);
        renderMembers();
    }

    closeModal();
    alert('会员信息修改成功！');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('show');
    editingMemberId = null;
}

function showHistory(id) {
    const members = loadMembers();
    const member = members.find(m => m.id === id);

    if (!member) return;

    const historyList = document.getElementById('historyList');

    if (!member.history || member.history.length === 0) {
        historyList.innerHTML = '<div class="no-history">暂无消费记录</div>';
    } else {
        historyList.innerHTML = member.history.map(item => `
            <div class="history-item">
                <div>
                    <div class="history-date">${item.date}</div>
                    <div class="history-amount">${item.type === 'recharge' ? '充值 +' : '消费 -'}${item.amount} 元</div>
                    ${item.productCode && item.productName ? `
                        <div class="history-product">
                            <div>商品编号: ${item.productCode}</div>
                            <div>商品名称: ${item.productName}</div>
                            ${item.productSize ? `<div>尺码号: ${item.productSize}</div>` : ''}
                            <div>商品价格: ${item.productPrice} 元</div>
                        </div>
                    ` : ''}
                </div>
                <div class="history-balance">余额: ${item.balance} 元</div>
            </div>
        `).join('');
    }

    document.getElementById('historyModal').classList.add('show');
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('show');
}

function rechargeMember(id) {
    rechargingMemberId = id;
    document.getElementById('rechargeAmount').value = '';
    document.getElementById('rechargeModal').classList.add('show');
}

function confirmRecharge() {
    const amount = parseFloat(document.getElementById('rechargeAmount').value);
    
    if (isNaN(amount) || amount < 10) {
        alert('请输入有效的充值金额（至少10元）');
        return;
    }
    
    const members = loadMembers();
    const member = members.find(m => m.id === rechargingMemberId);
    
    if (!member) return;
    
    member.amount += amount;
    
    if (!member.history) {
        member.history = [];
    }
    
    member.history.unshift({
        date: new Date().toLocaleString(),
        amount: amount,
        balance: member.amount,
        type: 'recharge'
    });
    
    if (member.status === 'inactive') {
        member.status = 'active';
    }
    
    saveMembers(members);
    renderMembers();
    closeRechargeModal();
    alert('充值成功！当前余额：' + member.amount + ' 元');
}

function closeRechargeModal() {
    document.getElementById('rechargeModal').classList.remove('show');
    rechargingMemberId = null;
}

// 商品管理相关函数
function loadProducts() {
    const products = localStorage.getItem('products');
    return products ? JSON.parse(products) : [];
}

function saveProducts(products) {
    localStorage.setItem('products', JSON.stringify(products));
}

function addProduct() {
    document.getElementById('addProductCode').value = '';
    document.getElementById('addProductName').value = '';
    document.getElementById('addProductSize').value = '';
    document.getElementById('addProductPrice').value = '';
    document.getElementById('addProductModal').classList.add('show');
}

function confirmAddProduct() {
    const code = document.getElementById('addProductCode').value.trim();
    const name = document.getElementById('addProductName').value.trim();
    const size = document.getElementById('addProductSize').value.trim();
    const price = parseFloat(document.getElementById('addProductPrice').value);
    const category = document.getElementById('addProductCategory').value;
    
    if (!code) {
        alert('请输入商品编号');
        return;
    }
    if (!name) {
        alert('请输入商品名称');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('请输入有效的商品价格');
        return;
    }
    
    const products = loadProducts();
    
    // 检查商品编号是否已存在
    if (products.some(p => p.code === code)) {
        alert('商品编号已存在');
        return;
    }
    
    const newProduct = {
        id: Date.now(),
        code: code,
        name: name,
        size: size,
        price: price,
        category: category
    };
    
    products.push(newProduct);
    saveProducts(products);
    renderProducts();
    closeAddProductModal();
    alert('商品添加成功！');
}

function closeAddProductModal() {
    document.getElementById('addProductModal').classList.remove('show');
}

function editProduct(id) {
    const products = loadProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) return;
    
    editingProductId = id;
    document.getElementById('editProductCode').value = product.code;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductSize').value = product.size || '';
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductCategory').value = product.category || '男鞋';
    document.getElementById('editProductModal').classList.add('show');
}

function confirmEditProduct() {
    const code = document.getElementById('editProductCode').value.trim();
    const name = document.getElementById('editProductName').value.trim();
    const size = document.getElementById('editProductSize').value.trim();
    const price = parseFloat(document.getElementById('editProductPrice').value);
    const category = document.getElementById('editProductCategory').value;
    
    if (!code) {
        alert('请输入商品编号');
        return;
    }
    if (!name) {
        alert('请输入商品名称');
        return;
    }
    if (isNaN(price) || price < 0) {
        alert('请输入有效的商品价格');
        return;
    }
    
    const products = loadProducts();
    const product = products.find(p => p.id === editingProductId);
    
    if (product) {
        // 检查商品编号是否与其他商品重复
        if (products.some(p => p.code === code && p.id !== editingProductId)) {
            alert('商品编号已存在');
            return;
        }
        
        product.code = code;
        product.name = name;
        product.size = size;
        product.price = price;
        product.category = category;
        saveProducts(products);
        renderProducts();
        closeEditProductModal();
        alert('商品修改成功！');
    }
}

function closeEditProductModal() {
    document.getElementById('editProductModal').classList.remove('show');
    editingProductId = null;
}

function deleteProduct(id) {
    if (!confirm('确定要删除该商品吗？')) return;
    
    let products = loadProducts();
    products = products.filter(p => p.id !== id);
    saveProducts(products);
    renderProducts();
    alert('商品删除成功！');
}

function renderProducts() {
    const products = loadProducts();
    const tbody = document.getElementById('productTable');
    
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">暂无商品信息</td></tr>';
        document.getElementById('productCount').textContent = '(0件)';
        document.getElementById('productPagination')?.remove();
        return;
    }
    
    const keyword = document.getElementById('productSearchInput').value.trim().toLowerCase();
    let filteredProducts = products;
    let totalProductCount = products.length;
    
    // 根据分类过滤
    if (currentProductCategory !== 'all') {
        filteredProducts = filteredProducts.filter(product => product.category === currentProductCategory);
    }
    
    // 根据关键词搜索
    if (keyword) {
        filteredProducts = filteredProducts.filter(product =>
            product.code.toLowerCase().includes(keyword) ||
            product.name.toLowerCase().includes(keyword)
        );
        document.getElementById('productCount').textContent = `(${totalProductCount}件，显示${filteredProducts.length}件)`;
    } else {
        document.getElementById('productCount').textContent = `(${filteredProducts.length}件)`;
    }
    
    // 分页处理
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    const totalCount = filteredProducts.length;
    const startIndex = (currentProductPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedProducts.map(product => `
        <tr>
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.category || '-'}</td>
            <td>${product.size || '-'}</td>
            <td>${product.price.toFixed(2)} 元</td>
            <td>
                <button class="btn btn-warning use-btn" onclick="editProduct(${product.id})">&nbsp;修改&nbsp;</button>
                <button class="btn btn-danger delete-btn" onclick="deleteProduct(${product.id})">删除</button>
            </td>
        </tr>
    `).join('');
    
    // 添加分页控件
    addProductPagination(totalPages, totalCount);
}

function addProductPagination(totalPages, totalCount) {
    const oldPagination = document.getElementById('productPagination');
    if (oldPagination) {
        oldPagination.remove();
    }
    
    if (totalPages <= 1) return;
    
    const pagination = document.createElement('div');
    pagination.id = 'productPagination';
    pagination.className = 'pagination';
    
    let paginationHTML = `<span class="pagination-info">共 ${totalCount} 条，第 ${currentProductPage}/${totalPages} 页</span>`;
    
    paginationHTML += `<button class="btn btn-sm" onclick="changeProductPage(${currentProductPage - 1})" ${currentProductPage === 1 ? 'disabled' : ''}>&laquo; 上一页</button>`;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentProductPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHTML += `<button class="btn btn-sm" onclick="changeProductPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="btn btn-sm ${i === currentProductPage ? 'active' : ''}" onclick="changeProductPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="btn btn-sm" onclick="changeProductPage(${totalPages})">${totalPages}</button>`;
    }
    
    paginationHTML += `<button class="btn btn-sm" onclick="changeProductPage(${currentProductPage + 1})" ${currentProductPage === totalPages ? 'disabled' : ''}>下一页 &raquo;</button>`;
    
    pagination.innerHTML = paginationHTML;
    
    const table = document.querySelector('#productsTab .member-list');
    if (table) {
        table.parentNode.insertBefore(pagination, table.nextSibling);
    }
}

function changeProductPage(page) {
    currentProductPage = page;
    renderProducts();
}

function searchProducts() {
    currentProductPage = 1;
    renderProducts();
}

function switchProductCategory(category) {
    currentProductCategory = category;
    currentProductPage = 1;
    
    // 更新标签页状态
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        if (tab.textContent.trim() === (category === 'all' ? '全部' : category)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    renderProducts();
}

function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));
    
    document.getElementById(tab + 'Tab').classList.add('active');
}

// 导入会员列表
function importMembers() {
    document.getElementById('excelFile').value = '';
    document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
    document.getElementById('importModal').classList.remove('show');
}

function confirmImport() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请选择Excel文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            alert('Excel文件为空');
            return;
        }
        
        const members = loadMembers();
        let successCount = 0;
        let errorCount = 0;
        
        jsonData.forEach(row => {
            const name = (row['姓名'] || row['name'] || row['Name'] || '').toString().trim();
            const phone = (row['电话'] || row['phone'] || row['Phone'] || '').toString().trim();
            const birthday = (row['生日'] || row['birthday'] || row['Birthday'] || '').toString().trim();
            
            if (!name || !phone) {
                errorCount++;
                return;
            }
            
            const newMember = {
                id: Date.now() + Math.random(),
                name: name,
                phone: phone,
                birthday: formatBirthday(birthday),
                amount: INITIAL_AMOUNT,
                status: 'active',
                history: []
            };
            
            members.push(newMember);
            successCount++;
        });
        
        saveMembers(members);
        renderMembers();
        alert(`导入完成！成功：${successCount}个，失败：${errorCount}个`);
        closeImportModal();
    };
    
    reader.onerror = function() {
        alert('文件读取失败');
    };
    
    reader.readAsArrayBuffer(file);
}

function formatBirthday(birthday) {
    if (!birthday || birthday.length !== 8) return '';
    const year = birthday.substring(0, 4);
    const month = birthday.substring(4, 6);
    const day = birthday.substring(6, 8);
    return `${year}-${month}-${day}`;
}

// 导出会员列表
function exportMembers() {
    const members = loadMembers();
    
    if (members.length === 0) {
        alert('暂无会员数据可导出');
        return;
    }
    
    const exportData = members.map(member => ({
        '姓名': member.name,
        '电话': member.phone,
        '生日': member.birthday || '',
        '剩余金额': member.amount,
        '状态': member.status === 'active' ? '有效' : '已失效'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '会员列表');
    
    const fileName = `会员列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// 导入商品
function importProducts() {
    document.getElementById('productExcelFile').value = '';
    document.getElementById('importProductModal').classList.add('show');
}

// 导出商品
function exportProducts() {
    const products = loadProducts();
    
    if (products.length === 0) {
        alert('暂无商品数据可导出');
        return;
    }
    
    const exportData = products.map(product => ({
        '商品编号': product.code,
        '商品名称': product.name,
        '商品分类': product.category || '',
        '尺码号': product.size || '',
        '商品价格': product.price
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '商品列表');
    
    const fileName = `商品列表_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function closeImportProductModal() {
    document.getElementById('importProductModal').classList.remove('show');
}

function confirmImportProducts() {
    const fileInput = document.getElementById('productExcelFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择Excel文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            alert('Excel文件为空');
            return;
        }

        const importedProducts = [];
        let successCount = 0;
        let errorCount = 0;

        jsonData.forEach((row, index) => {
            const code = (row['商品编号'] || row['code'] || row['Code'] || '').toString().trim();
            const name = (row['商品名称'] || row['name'] || row['Name'] || '').toString().trim();
            const category = (row['商品分类'] || row['category'] || row['Category'] || '').toString().trim();
            const size = (row['尺码号'] || row['size'] || row['Size'] || '').toString().trim();
            const price = parseFloat(row['商品价格'] || row['price'] || row['Price'] || 0);

            if (!code || !name) {
                errorCount++;
                return;
            }

            const validCategories = ['男鞋', '女鞋', '运动鞋'];
            let validCategory = category;
            if (!validCategories.includes(category)) {
                validCategory = '男鞋';
            }

            const newProduct = {
                id: Date.now() + index,
                code: code,
                name: name,
                category: validCategory,
                size: size,
                price: isNaN(price) ? 0 : price
            };

            importedProducts.push(newProduct);
            successCount++;
        });

        if (importedProducts.length > 0) {
            const existingProducts = loadProducts();
            
            const existingCodes = new Set(existingProducts.map(p => p.code));
            const uniqueProducts = importedProducts.filter(p => !existingCodes.has(p.code));
            
            const allProducts = [...existingProducts, ...uniqueProducts];
            saveProducts(allProducts);
            renderProducts();
        }

        alert(`导入完成！成功：${successCount}个，失败：${errorCount}个`);
        closeImportProductModal();
    };

    reader.onerror = function () {
        alert('文件读取失败');
    };

    reader.readAsArrayBuffer(file);
}

// 页面加载时初始化
window.onload = function() {
    renderMembers();
    renderProducts();
};