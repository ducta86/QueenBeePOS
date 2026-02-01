
import { create } from 'zustand';
import { db, hashPassword, generateSalt, generateId } from './db';
import { Product, Customer, Order, PriceType, ProductPrice, ProductGroup, CustomerType, LoyaltyConfig, StoreConfig, Purchase, User, UserRole } from './types';
import { Dexie } from 'dexie';

interface AppState {
  currentUser: User | null;
  users: User[];
  products: Product[];
  customers: Customer[];
  priceTypes: PriceType[];
  customerTypes: CustomerType[];
  productGroups: ProductGroup[];
  loyaltyConfig: LoyaltyConfig | null;
  storeConfig: StoreConfig;
  isLoading: boolean;
  error: string | null;
  
  unsyncedCount: {
    products: number; orders: number; customers: number; users: number; purchases: number;
    priceTypes: number; productGroups: number; productPrices: number;
  };
  setUnsyncedCount: (counts: any) => void;

  fetchInitialData: () => Promise<void>;
  setError: (msg: string | null) => void;
  
  login: (username: string, passwordPlain: string) => Promise<boolean>;
  logout: () => void;
  
  addUser: (username: string, fullName: string, role: UserRole, passwordPlain: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string, passwordPlain: string) => Promise<void>;

  updateStoreConfig: (config: StoreConfig) => Promise<void>;
  addProduct: (product: Product, prices: {priceTypeId: string, price: number}[]) => Promise<void>;
  updateProduct: (product: Product, prices: {priceTypeId: string, price: number}[]) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addPriceType: (name: string) => Promise<void>;
  updatePriceType: (id: string, name: string) => Promise<void>;
  deletePriceType: (id: string) => Promise<void>;
  addProductGroup: (name: string) => Promise<void>;
  updateProductGroup: (id: string, name: string) => Promise<void>;
  deleteProductGroup: (id: string) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateLoyaltyConfig: (config: LoyaltyConfig) => Promise<void>;
  updateStock: (productId: string, delta: number) => Promise<void>;
  addPurchase: (purchase: Purchase) => Promise<void>;
  
  deleteOrder: (id: string) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
}

const DEFAULT_STORE_CONFIG: StoreConfig = {
  name: 'QueenBee POS',
  address: '123 Đường Công Nghệ, TP. HCM',
  phone: '0900.000.000',
  costPriceTypeId: '', 
  lowStockThreshold: 10,
  bankId: 'MB',
  bankAccount: '123456789',
  bankAccountName: 'NGUYEN VAN A',
  printerName: 'Xprinter XP-N160I',
  printerIp: '192.168.1.100',
  printerPort: 9100,
  printerType: 'wireless',
  printerAutoPrint: true,
  printerPaperSize: '80mm',
  printerCopies: 1
};

export const useStore = create<AppState>((set, get) => ({
  currentUser: JSON.parse(localStorage.getItem('session_user') || 'null'),
  users: [],
  products: [],
  customers: [],
  priceTypes: [],
  customerTypes: [],
  productGroups: [],
  loyaltyConfig: null,
  storeConfig: DEFAULT_STORE_CONFIG,
  isLoading: false,
  error: null,
  
  unsyncedCount: {
    products: 0, orders: 0, customers: 0, users: 0, purchases: 0,
    priceTypes: 0, productGroups: 0, productPrices: 0
  },

  setUnsyncedCount: (counts) => set({ unsyncedCount: counts }),

  setError: (error) => set({ error }),

  fetchInitialData: async () => {
    set({ isLoading: true });

    const tablesToMigrate = [
      { table: db.priceTypes, refFields: [{ table: db.productPrices, field: 'priceTypeId' }, { table: db.customers, field: 'typeId' }] },
      { table: db.productGroups, refFields: [{ table: db.products, field: 'groupId' }] },
      { table: db.products, refFields: [{ table: db.productPrices, field: 'productId' }] },
      { table: db.customers, refFields: [{ table: db.orders, field: 'customerId' }] }
    ];

    for (const config of tablesToMigrate) {
      const items = await config.table.toArray();
      for (const item of items) {
        if (item.id.length !== 15) {
          const oldId = item.id;
          const newId = generateId();
          for (const ref of config.refFields) {
            await (ref.table as any).where(ref.field).equals(oldId).modify({ [ref.field]: newId, synced: 0, updatedAt: Date.now() });
          }
          if (config.table === db.priceTypes) {
             const currentStore = JSON.parse(localStorage.getItem('store_config') || '{}');
             if (currentStore.costPriceTypeId === oldId) {
               currentStore.costPriceTypeId = newId;
               localStorage.setItem('store_config', JSON.stringify(currentStore));
             }
          }
          await config.table.delete(oldId);
          await config.table.add({ ...item, id: newId, synced: 0, updatedAt: Date.now() });
        }
      }
    }

    const users = await db.users.where('deleted').equals(0).toArray();
    const products = await db.products.where('deleted').equals(0).toArray();
    const customers = await db.customers.where('deleted').equals(0).toArray();
    const priceTypes = await db.priceTypes.where('deleted').equals(0).toArray();
    const customerTypes = await db.customerTypes.toArray();
    const productGroups = await db.productGroups.where('deleted').equals(0).toArray();
    
    const loyalty = JSON.parse(localStorage.getItem('loyalty_config') || '{"minSpend": 10000000, "minOrders": 10, "enabled": true}');
    const storeRaw = localStorage.getItem('store_config');
    const store = storeRaw ? JSON.parse(storeRaw) : DEFAULT_STORE_CONFIG;
    
    set({ users, products, customers, priceTypes, customerTypes, productGroups, loyaltyConfig: loyalty, storeConfig: store, isLoading: false });
  },

  login: async (username, passwordPlain) => {
    const user = await db.users.where('username').equals(username.toLowerCase()).first();
    if (user && user.deleted === 0) {
      const inputHash = await hashPassword(passwordPlain, user.passwordSalt);
      if (inputHash === user.passwordHash) {
        const sessionUser = { ...user, lastLogin: Date.now() };
        await db.users.update(user.id, { lastLogin: Date.now() });
        localStorage.setItem('session_user', JSON.stringify(sessionUser));
        set({ currentUser: sessionUser });
        return true;
      }
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem('session_user');
    set({ currentUser: null });
  },

  addUser: async (username, fullName, role, passwordPlain) => {
    const id = generateId();
    const salt = generateSalt();
    const passwordHash = await hashPassword(passwordPlain, salt);
    const newUser: User = {
      id, username: username.toLowerCase(), fullName, role, passwordHash, passwordSalt: salt,
      updatedAt: Date.now(), synced: 0, deleted: 0
    };
    await db.users.add(newUser);
    const users = await db.users.where('deleted').equals(0).toArray();
    set({ users });
  },

  updateUser: async (user) => {
    await db.users.put({ ...user, updatedAt: Date.now(), synced: 0 });
    const users = await db.users.where('deleted').equals(0).toArray();
    const current = get().currentUser;
    if (current?.id === user.id) {
       localStorage.setItem('session_user', JSON.stringify(user));
       set({ currentUser: user });
    }
    set({ users });
  },

  deleteUser: async (id) => {
    await db.users.update(id, { deleted: 1, updatedAt: Date.now(), synced: 0 });
    const users = await db.users.where('deleted').equals(0).toArray();
    set({ users });
  },

  resetUserPassword: async (id, passwordPlain) => {
    const salt = generateSalt();
    const passwordHash = await hashPassword(passwordPlain, salt);
    await db.users.update(id, { passwordHash, passwordSalt: salt, updatedAt: Date.now(), synced: 0 });
    const users = await db.users.where('deleted').equals(0).toArray();
    set({ users });
  },

  updateStoreConfig: async (config) => {
    localStorage.setItem('store_config', JSON.stringify(config));
    set({ storeConfig: config });
  },

  addProduct: async (product, prices) => {
    await (db as Dexie).transaction('rw', [db.products, db.productPrices], async () => {
      await db.products.add({ ...product, synced: 0 });
      const priceRecords: ProductPrice[] = prices.map(p => ({
        id: generateId(),
        productId: product.id,
        priceTypeId: p.priceTypeId,
        price: p.price,
        updatedAt: Date.now(),
        synced: 0,
        deleted: 0
      }));
      await db.productPrices.bulkAdd(priceRecords);
    });
    set((state) => ({ products: [...state.products, product] }));
  },

  updateProduct: async (product, prices) => {
    await (db as Dexie).transaction('rw', [db.products, db.productPrices], async () => {
      // Cập nhật thông tin sản phẩm
      await db.products.put({ ...product, synced: 0, updatedAt: Date.now() });
      
      // Lấy các bản ghi giá hiện tại của sản phẩm này
      const currentProductPrices = await db.productPrices.where('productId').equals(product.id).toArray();
      
      for (const p of prices) {
        // Tìm bản ghi giá cũ tương ứng với priceTypeId này
        const existingPrice = currentProductPrices.find(ep => ep.priceTypeId === p.priceTypeId);
        
        if (existingPrice) {
          // Nếu đã tồn tại: CẬP NHẬT (Giữ nguyên ID cũ để PocketBase hiểu là lệnh PATCH)
          await db.productPrices.update(existingPrice.id, {
            price: p.price,
            updatedAt: Date.now(),
            synced: 0,
            deleted: 0
          });
        } else {
          // Nếu chưa tồn tại (trường hợp mới thêm loại giá): THÊM MỚI
          await db.productPrices.add({
            id: generateId(),
            productId: product.id,
            priceTypeId: p.priceTypeId,
            price: p.price,
            updatedAt: Date.now(),
            synced: 0,
            deleted: 0
          });
        }
      }
    });
    const products = await db.products.where('deleted').equals(0).toArray();
    set({ products });
  },

  deleteProduct: async (id) => {
    await (db as Dexie).transaction('rw', [db.products, db.productPrices], async () => {
      await db.products.update(id, { deleted: 1, updatedAt: Date.now(), synced: 0 });
      await db.productPrices.where('productId').equals(id).modify({ deleted: 1, updatedAt: Date.now(), synced: 0 });
    });
    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));
  },

  addPriceType: async (name) => {
    const id = generateId();
    await (db as Dexie).transaction('rw', [db.priceTypes, db.products, db.productPrices], async () => {
      await db.priceTypes.add({ id, name, updatedAt: Date.now(), synced: 0, deleted: 0 });
      const allProducts = await db.products.where('deleted').equals(0).toArray();
      const newPrices: ProductPrice[] = allProducts.map(p => ({
        id: generateId(),
        productId: p.id,
        priceTypeId: id,
        price: 0,
        updatedAt: Date.now(),
        synced: 0,
        deleted: 0
      }));
      await db.productPrices.bulkAdd(newPrices);
    });
    const priceTypes = await db.priceTypes.where('deleted').equals(0).toArray();
    set({ priceTypes });
  },

  updatePriceType: async (id, name) => {
    await db.priceTypes.update(id, { name, updatedAt: Date.now(), synced: 0 });
    const priceTypes = await db.priceTypes.where('deleted').equals(0).toArray();
    set({ priceTypes });
  },

  deletePriceType: async (id) => {
    const config = get().storeConfig;
    
    if (config.costPriceTypeId === id) {
      set({ error: "LỖI: Loại giá này đang được chọn làm 'GIÁ NHẬP KHO' trong phần Cài đặt > Gian hàng. Vui lòng đổi Giá vốn sang loại khác trước khi xóa." });
      setTimeout(() => set({ error: null }), 5000);
      throw new Error("Deletion blocked by system config");
    }

    const activeCustomers = await db.customers.where('typeId').equals(id).filter(c => c.deleted === 0).toArray();
    const activeProductPrices = await db.productPrices.where('priceTypeId').equals(id).filter(pp => pp.price > 0 && pp.deleted === 0).toArray();
    
    const blockers = [];
    if (activeCustomers.length > 0) blockers.push(`${activeCustomers.length} khách hàng`);
    if (activeProductPrices.length > 0) blockers.push(`${activeProductPrices.length} sản phẩm có thiết lập giá`);

    if (blockers.length > 0) {
      set({ error: `KHÔNG THỂ XÓA: Loại giá này đang được sử dụng bởi ${blockers.join(' và ')}. Vui lòng xóa hoặc đổi loại giá cho các mục này trước.` });
      setTimeout(() => set({ error: null }), 5000);
      throw new Error("Deletion blocked by active references");
    }

    await (db as Dexie).transaction('rw', [db.priceTypes, db.productPrices], async () => {
      await db.priceTypes.update(id, { deleted: 1, updatedAt: Date.now(), synced: 0 });
      await db.productPrices.where('priceTypeId').equals(id).modify({ deleted: 1, updatedAt: Date.now(), synced: 0 });
    });

    const priceTypes = await db.priceTypes.where('deleted').equals(0).toArray();
    set({ priceTypes });
  },

  addProductGroup: async (name) => {
    const id = generateId();
    await db.productGroups.add({ id, name, updatedAt: Date.now(), synced: 0, deleted: 0 });
    const productGroups = await db.productGroups.where('deleted').equals(0).toArray();
    set({ productGroups });
  },

  updateProductGroup: async (id, name) => {
    await db.productGroups.update(id, { name, updatedAt: Date.now(), synced: 0 });
    const productGroups = await db.productGroups.where('deleted').equals(0).toArray();
    set({ productGroups });
  },

  deleteProductGroup: async (id) => {
    const count = await db.products.where('groupId').equals(id).filter(p => p.deleted === 0).count();
    if (count > 0) {
      set({ error: "Không thể xóa: Nhóm hàng này vẫn còn sản phẩm đang hoạt động." });
      setTimeout(() => set({ error: null }), 3000);
      throw new Error("Deletion blocked");
    }
    await db.productGroups.update(id, { deleted: 1, updatedAt: Date.now(), synced: 0 });
    const productGroups = await db.productGroups.where('deleted').equals(0).toArray();
    set({ productGroups });
  },

  addCustomer: async (customer) => {
    await db.customers.add({ ...customer, synced: 0 });
    set((state) => ({ customers: [...state.customers, customer] }));
  },

  updateCustomer: async (customer) => {
    await db.customers.put({ ...customer, synced: 0, updatedAt: Date.now() });
    set((state) => ({
      customers: state.customers.map(c => c.id === customer.id ? customer : c)
    }));
  },

  deleteCustomer: async (id) => {
    const orderCount = await db.orders.where('customerId').equals(id).filter(o => o.deleted === 0).count();
    if (orderCount > 0) {
       set({ error: "Không thể xóa: Khách hàng này đã có giao dịch trong lịch sử." });
       setTimeout(() => set({ error: null }), 3000);
       throw new Error("Deletion blocked");
    }
    await db.customers.update(id, { deleted: 1, updatedAt: Date.now(), synced: 0 });
    set((state) => ({
      customers: state.customers.filter(c => c.id !== id)
    }));
  },

  updateLoyaltyConfig: async (config) => {
    localStorage.setItem('loyalty_config', JSON.stringify(config));
    set({ loyaltyConfig: config });
  },

  updateStock: async (productId, delta) => {
    const product = await db.products.get(productId);
    if (product) {
      const newStock = product.stock + delta;
      await db.products.update(productId, { stock: newStock, updatedAt: Date.now(), synced: 0 });
      set((state) => ({
        products: state.products.map(p => p.id === productId ? { ...p, stock: newStock } : p)
      }));
    }
  },

  addPurchase: async (purchase) => {
    await db.purchases.add({ ...purchase, synced: 0 });
    for (const item of purchase.items) {
      const p = await db.products.get(item.productId);
      if (p) {
        await db.products.update(p.id, { stock: p.stock + item.qty, updatedAt: Date.now(), synced: 0 });
      }
    }
    const products = await db.products.where('deleted').equals(0).toArray();
    set({ products });
  },

  deleteOrder: async (id) => {
    const order = await db.orders.get(id);
    if (!order) return;
    
    await (db as Dexie).transaction('rw', [db.orders, db.products], async () => {
      await db.orders.update(id, { deleted: 1, synced: 0, updatedAt: Date.now() });
      for (const item of order.items) {
        const p = await db.products.get(item.productId);
        if (p) {
          await db.products.update(p.id, { stock: p.stock + item.qty, updatedAt: Date.now(), synced: 0 });
        }
      }
    });
    const products = await db.products.where('deleted').equals(0).toArray();
    set({ products });
  },

  deletePurchase: async (id) => {
    const purchase = await db.purchases.get(id);
    if (!purchase) return;
    
    await (db as Dexie).transaction('rw', [db.purchases, db.products], async () => {
      await db.purchases.update(id, { deleted: 1, synced: 0, updatedAt: Date.now() });
      for (const item of purchase.items) {
        const p = await db.products.get(item.productId);
        if (p) {
          await db.products.update(p.id, { stock: Math.max(0, p.stock - item.qty), updatedAt: Date.now(), synced: 0 });
        }
      }
    });
    const products = await db.products.where('deleted').equals(0).toArray();
    set({ products });
  }
}));
