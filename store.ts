
import { create } from 'zustand';
import { db, hashPassword, generateSalt } from './db';
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
  
  fetchInitialData: () => Promise<void>;
  setError: (msg: string | null) => void;
  
  // Auth Actions
  login: (username: string, passwordPlain: string) => Promise<boolean>;
  logout: () => void;
  
  // User Management Actions
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
}

const DEFAULT_STORE_CONFIG: StoreConfig = {
  name: 'Elite POS System',
  address: '123 Đường Công Nghệ, TP. HCM',
  phone: '0900.000.000',
  costPriceTypeId: 'pt-retail',
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

  setError: (error) => set({ error }),

  fetchInitialData: async () => {
    set({ isLoading: true });
    const users = await db.users.where('deleted').equals(0).toArray();
    const products = await db.products.where('deleted').equals(0).toArray();
    const customers = await db.customers.where('deleted').equals(0).toArray();
    const priceTypes = await db.priceTypes.toArray();
    const customerTypes = await db.customerTypes.toArray();
    const productGroups = await db.productGroups.toArray();
    
    const loyalty = JSON.parse(localStorage.getItem('loyalty_config') || '{"minSpend": 10000000, "minOrders": 10, "enabled": true}');
    const storeRaw = localStorage.getItem('store_config');
    const store = storeRaw ? JSON.parse(storeRaw) : DEFAULT_STORE_CONFIG;
    
    if (store && store.lowStockThreshold === undefined) {
      store.lowStockThreshold = 10;
    }

    set({ users, products, customers, priceTypes, customerTypes, productGroups, loyaltyConfig: loyalty, storeConfig: store, isLoading: false });
  },

  login: async (username, passwordPlain) => {
    const user = await db.users.where('username').equals(username.toLowerCase()).first();
    if (user && user.deleted === 0) {
      // Thực hiện băm mật khẩu nhập vào bằng Salt của user đó
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
    const id = `user-${Math.random().toString(36).substr(2, 9)}`;
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
      await db.products.add(product);
      const priceRecords: ProductPrice[] = prices.map(p => ({
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        priceTypeId: p.priceTypeId,
        price: p.price
      }));
      await db.productPrices.bulkAdd(priceRecords);
    });
    set((state) => ({ products: [...state.products, product] }));
  },

  updateProduct: async (product, prices) => {
    await (db as Dexie).transaction('rw', [db.products, db.productPrices], async () => {
      await db.products.put(product);
      await db.productPrices.where('productId').equals(product.id).delete();
      const priceRecords: ProductPrice[] = prices.map(p => ({
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        priceTypeId: p.priceTypeId,
        price: p.price
      }));
      await db.productPrices.bulkAdd(priceRecords);
    });
    set((state) => ({
      products: state.products.map(p => p.id === product.id ? product : p)
    }));
  },

  deleteProduct: async (id) => {
    await db.products.update(id, { deleted: 1, updatedAt: Date.now(), synced: 0 });
    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));
  },

  addPriceType: async (name) => {
    const id = `pt-${Date.now()}`;
    await (db as Dexie).transaction('rw', [db.priceTypes, db.products, db.productPrices], async () => {
      await db.priceTypes.add({ id, name });
      const allProducts = await db.products.where('deleted').equals(0).toArray();
      const newPrices: ProductPrice[] = allProducts.map(p => ({
        id: `pp-${Math.random().toString(36).substr(2, 9)}`,
        productId: p.id,
        priceTypeId: id,
        price: 0
      }));
      await db.productPrices.bulkAdd(newPrices);
    });
    const priceTypes = await db.priceTypes.toArray();
    set({ priceTypes });
  },

  updatePriceType: async (id, name) => {
    await db.priceTypes.update(id, { name });
    const priceTypes = await db.priceTypes.toArray();
    set({ priceTypes });
  },

  deletePriceType: async (id) => {
    const inUseProduct = await db.productPrices.where('priceTypeId').equals(id).filter(p => p.price > 0).count();
    const inUseCustomer = await db.customers.where('typeId').equals(id).count();
    
    if (inUseProduct > 0 || inUseCustomer > 0) {
      set({ error: "Không thể xóa loại giá này vì đang được áp dụng cho sản phẩm hoặc khách hàng." });
      setTimeout(() => set({ error: null }), 4000);
      throw new Error("Deletion blocked");
    }

    await (db as Dexie).transaction('rw', [db.priceTypes, db.productPrices], async () => {
      await db.priceTypes.delete(id);
      await db.productPrices.where('priceTypeId').equals(id).delete();
    });
    const priceTypes = await db.priceTypes.toArray();
    set({ priceTypes });
  },

  addProductGroup: async (name) => {
    const id = `pg-${Date.now()}`;
    await db.productGroups.add({ id, name });
    const productGroups = await db.productGroups.toArray();
    set({ productGroups });
  },

  updateProductGroup: async (id, name) => {
    await db.productGroups.update(id, { name });
    const productGroups = await db.productGroups.toArray();
    set({ productGroups });
  },

  deleteProductGroup: async (id) => {
    const count = await db.products.where('groupId').equals(id).count();
    if (count > 0) {
      set({ error: "Nhóm sản phẩm này đang chứa sản phẩm, không thể xóa." });
      setTimeout(() => set({ error: null }), 4000);
      return;
    }
    await db.productGroups.delete(id);
    const productGroups = await db.productGroups.toArray();
    set({ productGroups });
  },

  addCustomer: async (customer) => {
    await db.customers.add(customer);
    set((state) => ({ customers: [...state.customers, customer] }));
  },

  updateCustomer: async (customer) => {
    await db.customers.put(customer);
    set((state) => ({
      customers: state.customers.map(c => c.id === customer.id ? customer : c)
    }));
  },

  deleteCustomer: async (id) => {
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
    await db.purchases.add(purchase);
    for (const item of purchase.items) {
      const p = await db.products.get(item.productId);
      if (p) {
        await db.products.update(p.id, { stock: p.stock + item.qty, updatedAt: Date.now(), synced: 0 });
      }
    }
    const products = await db.products.where('deleted').equals(0).toArray();
    set({ products });
  }
}));
