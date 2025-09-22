
export interface Account {
  id: string;
  serviceName: string;
  username: string;
  password?: string;
  totpSecret?: string;
  backupCodes?: string;
  category: string;
  notes?: string;
  iconUrl?: string;
}

export interface Vault {
  accounts: Account[];
  categories: string[];
}

export interface User {
  email: string;
  passwordHash: string;
  salt: string;
  encryptedVault: string;
}
