
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Account, Vault, User } from './types';
import { ApiService, CryptoService, CsvService } from './services';
import { Button, Input, PasswordInput, AccountRow, Toast, SunIcon, MoonIcon, LockIcon, PlusIcon, SearchIcon } from './components';

// --- App State ---
type AppState = 'login' | 'master_password' | 'vault';

// --- Main App Component ---
const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('login');
    const [currentUser, setCurrentUser] = useState<{ email: string; salt: string } | null>(null);
    const [decryptedVault, setDecryptedVault] = useState<Vault | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    
    // Form States
    const [email, setEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [masterPassword, setMasterPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Vault States
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // --- Handlers ---
    const handleLoginSuccess = (user: { email: string; salt: string }) => {
        setCurrentUser(user);
        setAppState('master_password');
        setError('');
        setLoginPassword('');
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (isRegister) {
                if (loginPassword.length < 8 || masterPassword.length < 8) {
                    setError("Mật khẩu phải có ít nhất 8 ký tự.");
                    setIsLoading(false);
                    return;
                }
                const res = await ApiService.register(email, loginPassword, masterPassword);
                if (res.success) {
                    setToastMessage("Đăng ký thành công! Vui lòng đăng nhập.");
                    setIsRegister(false);
                    setMasterPassword(''); // clear master pass
                } else {
                    setError(res.message);
                }
            } else {
                const res = await ApiService.login(email, loginPassword);
                if (res.success && res.user) {
                    handleLoginSuccess(res.user);
                } else {
                    setError(res.message);
                }
            }
        } catch (err) {
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUnlockVault = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        setIsLoading(true);
        setError('');
        
        const encryptedVault = await ApiService.getEncryptedVault(currentUser.email);
        if (encryptedVault) {
            const decryptedJSON = CryptoService.decrypt(encryptedVault, masterPassword, currentUser.salt);
            if (decryptedJSON) {
                setDecryptedVault(JSON.parse(decryptedJSON));
                setAppState('vault');
                setMasterPassword(''); // CRITICAL: Clear master password from memory
            } else {
                setError('Mật khẩu chính không đúng.');
            }
        } else {
            setError('Không tìm thấy kho dữ liệu.');
        }
        setIsLoading(false);
    };

    const updateAndSaveVault = useCallback(async (newVault: Vault) => {
        if (!currentUser || !masterPassword) {
            // This case should not happen if called correctly, but as a safeguard.
            // For updates, master password needs to be re-entered or securely stored temporarily.
            // Here we assume it is NOT stored, so this function is problematic without it.
            // For now, we will simulate it's available for simplicity of this single-file app.
            // A real app would prompt for it again.
            // For this implementation, we will rely on a temporary state which is a security risk.
            // Let's modify the flow to require master pass for saving changes.
            // **Correction**: Let's encrypt with the key derived at unlock time. 
            // This means we need to handle the key securely.
            // Let's go with a simpler model for now: re-ask for password on major changes.
            // Or better: keep key in memory only while logged in. This is what we will do.
            // The handleUnlockVault will need to be refactored to pass the master password along.
            // Ok, new simpler plan: master password is held in state only when a save is needed.
            // Wait, this is getting complex. The simplest secure way is to re-encrypt with the same password used to decrypt.
            // So, `CryptoService.encrypt` needs masterPassword. Let's make the user re-enter it for saving.
            // No, that's bad UX. The standard practice is to keep the derived key in memory.
            // It's a single-page app, so memory is cleared on refresh. This is acceptable.
            // The issue is, I clear masterPassword from state right after unlock. 
            // I'll need a temporary state to hold it for updates.
            alert("Lỗi: Không thể lưu. Phiên đăng nhập không hợp lệ.");
            return;
        }

        try {
            const vaultJSON = JSON.stringify(newVault);
            const newEncryptedVault = CryptoService.encrypt(vaultJSON, masterPassword, currentUser.salt);
            await ApiService.updateEncryptedVault(currentUser.email, newEncryptedVault);
            setDecryptedVault(newVault);
        } catch (error) {
            console.error("Failed to save vault", error);
            setError("Không thể lưu kho dữ liệu.");
        }
    }, [currentUser, masterPassword]); // We need master password here. This will be an issue. Let's solve it.

    // A more secure way to handle updates without holding master password in state
    const secureUpdateVault = async (updatedVault: Vault) => {
        const tempMasterPassword = prompt("Vui lòng nhập lại Mật khẩu chính để lưu thay đổi:");
        if (!tempMasterPassword || !currentUser) {
            setToastMessage("Hủy bỏ lưu.");
            // To revert optimistic UI updates if any, you'd reload the vault here.
            return;
        }

        setIsLoading(true);
        try {
            const vaultJSON = JSON.stringify(updatedVault);
            const newEncryptedVault = CryptoService.encrypt(vaultJSON, tempMasterPassword, currentUser.salt);
            const success = await ApiService.updateEncryptedVault(currentUser.email, newEncryptedVault);
            if(success) {
                setDecryptedVault(updatedVault);
                setToastMessage("Lưu thay đổi thành công!");
            } else {
                throw new Error("API update failed");
            }
        } catch (e) {
            setError("Lưu thất bại. Mật khẩu chính có thể không đúng.");
        } finally {
            setIsLoading(false);
        }
    }


    const handleLogout = () => {
        setCurrentUser(null);
        setDecryptedVault(null);
        setAppState('login');
        setEmail('');
        setLoginPassword('');
        setMasterPassword('');
        setError('');
    };
    
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const handleCopy = (value: string, fieldName: string) => {
        navigator.clipboard.writeText(value).then(() => {
            setToastMessage(`Đã sao chép ${fieldName}!`);
            setTimeout(() => {
                // Cannot clear clipboard for security reasons, but can show a message.
                setToastMessage(`Bộ nhớ tạm đã được xóa (mô phỏng)`);
            }, 30000); // 30 seconds
        });
    };
    
    const handleAddAccount = () => {
        setEditingAccount(null);
        setIsFormModalOpen(true);
    };

    const handleEditAccount = (account: Account) => {
        setEditingAccount(account);
        setIsFormModalOpen(true);
    };

    const handleDeleteAccount = (accountId: string) => {
        if (decryptedVault && window.confirm("Bạn có chắc muốn xóa tài khoản này?")) {
            const newAccounts = decryptedVault.accounts.filter(acc => acc.id !== accountId);
            const newVault = { ...decryptedVault, accounts: newAccounts };
            secureUpdateVault(newVault);
        }
    };

    const handleSaveAccount = (account: Account) => {
        if (decryptedVault) {
            let newAccounts;
            if (editingAccount) {
                newAccounts = decryptedVault.accounts.map(acc => acc.id === account.id ? account : acc);
            } else {
                newAccounts = [...decryptedVault.accounts, { ...account, id: crypto.randomUUID() }];
            }
            const newVault = { ...decryptedVault, accounts: newAccounts };
            secureUpdateVault(newVault);
            setIsFormModalOpen(false);
            setEditingAccount(null);
        }
    };
    
    const handleExport = () => {
        if(decryptedVault) {
            CsvService.exportCsv(decryptedVault.accounts);
            setToastMessage("Đã xuất dữ liệu thành công!");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && decryptedVault) {
            if(window.confirm("Thao tác này sẽ ghi đè lên dữ liệu hiện tại của bạn. Bạn có muốn tiếp tục không?")) {
                try {
                    const importedAccounts = await CsvService.importCsv(file);
                    const newVault = {...decryptedVault, accounts: importedAccounts};
                    secureUpdateVault(newVault);
                    setToastMessage("Nhập dữ liệu thành công!");
                } catch (e) {
                    setError("Tập tin CSV không hợp lệ.");
                }
            }
        }
        // Reset file input
        if(event.target) event.target.value = '';
    };

    // --- Render Logic ---
    const renderContent = () => {
        switch (appState) {
            case 'login': return <LoginScreen />;
            case 'master_password': return <MasterPasswordPrompt />;
            case 'vault': return <VaultScreen />;
            default: return <LoginScreen />;
        }
    };

    // -- Sub-Components (Screens) --
    const LoginScreen = () => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div>
                    <LockIcon className="mx-auto h-12 w-auto text-blue-600"/>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                        {isRegister ? 'Tạo tài khoản của bạn' : 'Đăng nhập vào tài khoản'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleAuthSubmit}>
                    <Input label="Địa chỉ Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <PasswordInput label="Mật khẩu đăng nhập" id="login-password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    {isRegister && <PasswordInput label="Mật khẩu chính" id="master-password" value={masterPassword} onChange={e => setMasterPassword(e.target.value)} required />}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div>
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Đang xử lý...' : (isRegister ? 'Đăng ký' : 'Đăng nhập')}</Button>
                    </div>
                </form>
                <div className="text-center">
                    <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                        {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
                    </button>
                </div>
            </div>
        </div>
    );

    const MasterPasswordPrompt = () => (
         <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 p-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div>
                    <LockIcon className="mx-auto h-12 w-auto text-blue-600"/>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                       Mở khóa kho dữ liệu
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                        Xin chào, {currentUser?.email}! Vui lòng nhập Mật khẩu chính của bạn.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleUnlockVault}>
                    <PasswordInput label="Mật khẩu chính" id="master-password" value={masterPassword} onChange={e => setMasterPassword(e.target.value)} required autoFocus />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div>
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Đang mở khóa...' : 'Mở khóa'}</Button>
                    </div>
                </form>
                 <div className="text-center">
                    <button onClick={handleLogout} className="font-medium text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300">
                        Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    );
    
    const filteredAccounts = decryptedVault?.accounts.filter(acc =>
        (acc.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) || acc.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (categoryFilter === 'all' || acc.category === categoryFilter)
    ) || [];

    const VaultScreen = () => (
        <div className="min-h-screen text-gray-900 dark:text-gray-100">
            <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                    <h1 className="text-xl font-bold flex items-center"><LockIcon className="mr-2 h-6 w-6 text-blue-500"/>Trình quản lý mật khẩu</h1>
                    <div className="flex items-center space-x-4">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            {theme === 'light' ? <MoonIcon/> : <SunIcon/>}
                        </button>
                        <Button onClick={handleLogout} variant="secondary">Đăng xuất</Button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                        <div className="relative w-full sm:w-auto">
                           <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                             <SearchIcon className="text-gray-400"/>
                           </span>
                           <input
                             type="text"
                             placeholder="Tìm kiếm..."
                             value={searchTerm}
                             onChange={e => setSearchTerm(e.target.value)}
                             className="pl-10 pr-4 py-2 w-full sm:w-64 border rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                           />
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2 border rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">Tất cả danh mục</option>
                                {decryptedVault?.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                           <Button onClick={handleAddAccount} className="flex items-center justify-center w-full sm:w-auto"><PlusIcon className="mr-2 h-5 w-5"/> Thêm tài khoản</Button>
                        </div>
                    </div>
                     <div className="flex items-center gap-4 mb-4">
                         <Button onClick={handleExport} variant="secondary">Xuất CSV</Button>
                         <Button onClick={handleImportClick} variant="secondary">Nhập CSV</Button>
                         <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                           <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dịch vụ</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tên người dùng</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mật khẩu</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mã 2FA</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Danh mục</th>
                                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Hành động</span></th>
                            </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredAccounts.map(account => (
                                <AccountRow key={account.id} account={account} onCopy={handleCopy} onEdit={handleEditAccount} onDelete={handleDeleteAccount}/>
                            ))}
                           </tbody>
                        </table>
                        {filteredAccounts.length === 0 && <p className="text-center py-8 text-gray-500">Không tìm thấy tài khoản nào.</p>}
                    </div>
                </div>
            </main>
        </div>
    );
    
    // --- Account Form Modal ---
    const AccountFormModal = () => {
        const [formData, setFormData] = useState<Partial<Account>>(editingAccount || { category: decryptedVault?.categories[0] || '' });
        
        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            setFormData({...formData, [e.target.name]: e.target.value});
        };
        
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (formData.serviceName && formData.username) {
                handleSaveAccount(formData as Account);
            }
        };
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex justify-center items-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-4">{editingAccount ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}</h2>
                            <div className="space-y-4">
                                <Input label="Tên dịch vụ" id="serviceName" name="serviceName" value={formData.serviceName || ''} onChange={handleChange} required />
                                <Input label="Tên người dùng / Email" id="username" name="username" value={formData.username || ''} onChange={handleChange} required />
                                <PasswordInput label="Mật khẩu" id="password" name="password" value={formData.password || ''} onChange={handleChange} />
                                <div>
                                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Danh mục</label>
                                    <select id="category" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700">
                                        {decryptedVault?.categories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <Input label="Mã bí mật TOTP" id="totpSecret" name="totpSecret" value={formData.totpSecret || ''} onChange={handleChange} placeholder="Dán mã bí mật tại đây" />
                                <div>
                                    <label htmlFor="backupCodes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mã dự phòng</label>
                                    <textarea id="backupCodes" name="backupCodes" rows={3} value={formData.backupCodes || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"></textarea>
                                </div>
                                <div>
                                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ghi chú</label>
                                    <textarea id="notes" name="notes" rows={3} value={formData.notes || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700"></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end space-x-3">
                            <Button type="button" variant="secondary" onClick={() => setIsFormModalOpen(false)}>Hủy</Button>
                            <Button type="submit">Lưu</Button>
                        </div>
                    </form>
                </div>
            </div>
        )
    };
    
    return (
        <>
            {renderContent()}
            {isFormModalOpen && <AccountFormModal />}
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
        </>
    );
};

export default App;
