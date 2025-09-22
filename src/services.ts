
import type { User, Vault, Account } from './types';

// Access CDN libraries from the window object
declare const CryptoJS: any;
declare const Papa: any;
declare const OTPAuth: any;

// --- Crypto Service ---
// Handles Zero-Knowledge encryption and decryption of the vault.
const CryptoService = {
  // Key derivation using PBKDF2
  deriveKey: (masterPassword: string, salt: string): string => {
    return CryptoJS.PBKDF2(masterPassword, salt, {
      keySize: 256 / 32,
      iterations: 100000
    }).toString(CryptoJS.enc.Hex);
  },

  // Encrypt data (the vault)
  encrypt: (data: string, masterPassword: string, salt: string): string => {
    const key = CryptoService.deriveKey(masterPassword, salt);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);
    const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(key), {
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    // Prepend IV to ciphertext for use in decryption
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
  },

  // Decrypt data (the vault)
  decrypt: (encryptedData: string, masterPassword:string, salt: string): string | null => {
    try {
      const key = CryptoService.deriveKey(masterPassword, salt);
      const parts = encryptedData.split(':');
      const iv = CryptoJS.enc.Hex.parse(parts.shift()!);
      const ciphertext = parts.join(':');
      const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
      });
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) {
          throw new Error("Decryption resulted in empty string.");
      }
      return decryptedText;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  },

  // Generate a random salt for new users
  generateSalt: (): string => {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
  },

  // Hash the login password (not the master password)
  hashPassword: (password: string, salt: string): string => {
    return CryptoJS.PBKDF2(password, salt, {
        keySize: 512 / 32,
        iterations: 200000
    }).toString(CryptoJS.enc.Hex);
  }
};

// --- Mock API Service ---
// Simulates a backend API using localStorage.
const DB_KEY = 'secure_password_manager_db';

const ApiService = {
  _getDb: (): { users: User[] } => {
    const db = localStorage.getItem(DB_KEY);
    return db ? JSON.parse(db) : { users: [] };
  },
  _saveDb: (db: { users: User[] }) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  },

  register: async (email: string, loginPassword: string, masterPassword: string): Promise<{ success: boolean; message: string }> => {
    const db = ApiService._getDb();
    if (db.users.find(u => u.email === email)) {
      return { success: false, message: 'Email đã tồn tại.' };
    }
    
    const salt = CryptoService.generateSalt();
    const passwordHash = CryptoService.hashPassword(loginPassword, salt);
    const initialVault: Vault = { accounts: [], categories: ['Mạng xã hội', 'Công việc', 'Cá nhân'] };
    const encryptedVault = CryptoService.encrypt(JSON.stringify(initialVault), masterPassword, salt);

    const newUser: User = { email, passwordHash, salt, encryptedVault };
    db.users.push(newUser);
    ApiService._saveDb(db);
    
    return { success: true, message: 'Đăng ký thành công!' };
  },

  login: async (email: string, loginPassword: string): Promise<{ success: boolean; message: string; user?: { email: string; salt: string } }> => {
    const db = ApiService._getDb();
    const user = db.users.find(u => u.email === email);

    if (!user) {
      return { success: false, message: 'Email hoặc mật khẩu không đúng.' };
    }

    const passwordHash = CryptoService.hashPassword(loginPassword, user.salt);
    if (passwordHash !== user.passwordHash) {
      return { success: false, message: 'Email hoặc mật khẩu không đúng.' };
    }

    return { success: true, message: 'Đăng nhập thành công!', user: { email: user.email, salt: user.salt } };
  },

  getEncryptedVault: async (email: string): Promise<string | null> => {
    const db = ApiService._getDb();
    const user = db.users.find(u => u.email === email);
    return user ? user.encryptedVault : null;
  },

  updateEncryptedVault: async (email: string, newEncryptedVault: string): Promise<boolean> => {
    const db = ApiService._getDb();
    const userIndex = db.users.findIndex(u => u.email === email);
    if (userIndex === -1) {
      return false;
    }
    db.users[userIndex].encryptedVault = newEncryptedVault;
    ApiService._saveDb(db);
    return true;
  }
};

// --- CSV Service ---
const CsvService = {
  exportCsv: (accounts: Account[]) => {
    const csvData = Papa.unparse(accounts.map(acc => ({
        serviceName: acc.serviceName,
        username: acc.username,
        password: acc.password || '',
        totpSecret: acc.totpSecret || '',
        backupCodes: acc.backupCodes || '',
        category: acc.category,
        notes: acc.notes || ''
    })));
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'password_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  importCsv: (file: File): Promise<Account[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: any[] }) => {
                const importedAccounts: Account[] = results.data.map(row => ({
                    id: crypto.randomUUID(),
                    ...row
                }));
                resolve(importedAccounts);
            },
            error: (error: Error) => {
                reject(error);
            }
        });
    });
  }
};

// --- TOTP Service ---
const TotpService = {
  generate: (secret: string): { code: string; period: number; remaining: number } => {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "PasswordManager",
        label: "2FA",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: secret,
      });
      const code = totp.generate();
      const period = totp.period;
      const remaining = period - (Math.floor(Date.now() / 1000) % period);
      return { code, period, remaining };
    } catch (e) {
      return { code: "Lỗi", period: 30, remaining: 0 };
    }
  }
}

export { CryptoService, ApiService, CsvService, TotpService };
