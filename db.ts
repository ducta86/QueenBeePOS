
import { Dexie, type Table } from 'dexie';
import { Product, ProductPrice, PriceType, Customer, CustomerType, Order, Purchase, ProductGroup, User } from './types';
import { argon2id } from 'hash-wasm';

// Hàm tạo Salt ngẫu nhiên 16 bytes
export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Chuyển hex string sang Uint8Array
const hexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

// Helper mã hóa mật khẩu bằng Argon2id với salt tùy biến
export const hashPassword = async (password: string, saltHex: string): Promise<string> => {
  return argon2id({
    password: password,
    salt: hexToUint8Array(saltHex), 
    parallelism: 1,
    iterations: 3, // Tăng lên 3 để tăng độ khó
    memorySize: 1024, // Tăng lên 1MB
    hashLength: 32,
    outputType: 'hex',
  });
};

export class POSDatabase extends Dexie {
  products!: Table<Product>;
  productPrices!: Table<ProductPrice>;
  priceTypes!: Table<PriceType>;
  productGroups!: Table<ProductGroup>;
  customers!: Table<Customer>;
  customerTypes!: Table<CustomerType>;
  orders!: Table<Order>;
  purchases!: Table<Purchase>;
  users!: Table<User>;

  constructor() {
    super('POSDatabase');
    (this as Dexie).version(7).stores({ // Nâng cấp version để tương thích User schema mới
      products: 'id, name, code, barcode, groupId, lineId, synced, updatedAt, deleted',
      productPrices: 'id, productId, priceTypeId',
      priceTypes: 'id, name',
      productGroups: 'id, name',
      customers: 'id, name, phone, typeId, synced, updatedAt, deleted',
      customerTypes: 'id, name, defaultPriceTypeId',
      orders: 'id, customerId, status, synced, updatedAt, deleted',
      purchases: 'id, supplierName, createdAt, deleted',
      users: 'id, username, role, deleted'
    });
  }
}

export const db = new POSDatabase();

export const seedDatabase = async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    const salt = generateSalt();
    const defaultPwHash = await hashPassword('user@123', salt);
    await db.users.add({
      id: 'user-default',
      username: 'admin',
      passwordHash: defaultPwHash,
      passwordSalt: salt,
      fullName: 'Quản trị viên',
      role: 'admin',
      updatedAt: Date.now(),
      synced: 1,
      deleted: 0
    });
  }

  const count = await db.priceTypes.count();
  if (count === 0) {
    const p1 = 'pt-retail';
    const p2 = 'pt-wholesale';
    
    await db.priceTypes.bulkAdd([
      { id: p1, name: 'Giá bán lẻ' },
      { id: p2, name: 'Giá bán sỉ' }
    ]);

    await db.productGroups.bulkAdd([
      { id: 'pg-1', name: 'Điện thoại' },
      { id: 'pg-2', name: 'Laptop' },
      { id: 'pg-3', name: 'Phụ kiện' }
    ]);

    const ct1 = 'ct-normal';
    const ct2 = 'ct-vip';

    await db.customerTypes.bulkAdd([
      { id: ct1, name: 'Khách lẻ', defaultPriceTypeId: p1 },
      { id: ct2, name: 'Khách VIP', defaultPriceTypeId: p2 }
    ]);

    await db.products.add({
      id: 'P-SAMPLE1',
      name: 'iPhone 15 Pro Max',
      code: 'IP15PM',
      barcode: '88888888',
      image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400',
      groupId: 'pg-1',
      unit: 'Cái',
      lineId: 'apple',
      stock: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      synced: 1,
      deleted: 0
    });

    await db.productPrices.bulkAdd([
      { id: 'PP-S1', productId: 'P-SAMPLE1', priceTypeId: p1, price: 34000000 },
      { id: 'PP-S2', productId: 'P-SAMPLE1', priceTypeId: p2, price: 32000000 }
    ]);

    await db.customers.add({
      id: 'C-WALKIN',
      name: 'Nguyễn Văn A',
      phone: '0901234567',
      birthday: '',
      address: '',
      facebook: '',
      typeId: ct1,
      isLoyal: false,
      totalSpent: 0,
      orderCount: 0,
      updatedAt: Date.now(),
      synced: 1,
      deleted: 0
    });
  }
};
