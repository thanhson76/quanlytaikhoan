
import React, { useState, useEffect, useRef } from 'react';
import type { Account, Vault } from './types';
import { TotpService } from './services';

// --- Icon Components ---
export const EyeIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);
export const EyeOffIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>
);
export const CopyIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
);
export const CheckIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"></polyline></svg>
);
export const SunIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
);
export const MoonIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
);
export const LockIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);
export const PlusIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
);
export const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
);
export const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
);
export const EditIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
);

// --- Reusable UI Components ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, ...props }) => {
  const baseClasses = "px-4 py-2 rounded-md font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-colors";
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export const Input: React.FC<InputProps> = ({ label, id, type = 'text', ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="mt-1">
        <input
          id={id}
          type={type}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          {...props}
        />
      </div>
    </div>
  );
};

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export const PasswordInput: React.FC<PasswordInputProps> = ({ label, id, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <div className="mt-1 relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          {showPassword ? <EyeOffIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
        </button>
      </div>
    </div>
  );
}

// --- TOTP Display Component ---
const TOTPDisplay: React.FC<{ secret: string }> = ({ secret }) => {
    const [totp, setTotp] = useState({ code: '------', period: 30, remaining: 0 });
    
    useEffect(() => {
        const updateTotp = () => {
            const newTotp = TotpService.generate(secret);
            setTotp(newTotp);
        };

        updateTotp(); // Initial generation
        const intervalId = setInterval(updateTotp, 1000); // Update every second

        return () => clearInterval(intervalId);
    }, [secret]);

    const progress = (totp.remaining / totp.period) * 100;

    return (
        <div className="flex flex-col items-center">
            <div className="font-mono text-xl tracking-widest text-blue-500 dark:text-blue-400">{totp.code}</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                <div 
                    className="bg-blue-600 h-1 rounded-full transition-all duration-1000 linear" 
                    style={{ width: `${progress}%` }}>
                </div>
            </div>
        </div>
    );
};


// --- Account Row Component ---
interface AccountRowProps {
    account: Account;
    onCopy: (value: string, fieldName: string) => void;
    onEdit: (account: Account) => void;
    onDelete: (accountId: string) => void;
}
export const AccountRow: React.FC<AccountRowProps> = ({ account, onCopy, onEdit, onDelete }) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = (value: string, fieldName: string) => {
        onCopy(value, fieldName);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    }
    
    const getFaviconUrl = (serviceName: string) => {
        try {
            // A simple way to guess a domain. This is not foolproof.
            let domain = serviceName.toLowerCase().replace(/\s/g, '');
            if (!domain.includes('.')) {
                domain = `${domain}.com`;
            }
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch (e) {
            return `https://picsum.photos/64/64?random=${serviceName}`; // Fallback
        }
    }

    return (
        <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                    <img className="h-8 w-8 rounded-full object-contain mr-3" src={getFaviconUrl(account.serviceName)} alt={`${account.serviceName} logo`} />
                    <span className="font-medium text-gray-900 dark:text-white">{account.serviceName}</span>
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                    <span className="text-gray-600 dark:text-gray-300">{account.username}</span>
                    <button onClick={() => handleCopy(account.username, 'username')} className="ml-2 text-gray-400 hover:text-blue-500">
                       {copiedField === 'username' ? <CheckIcon className="text-green-500" /> : <CopyIcon />}
                    </button>
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center">
                    <span className="font-mono">{passwordVisible ? account.password : '••••••••'}</span>
                    <button onClick={() => setPasswordVisible(!passwordVisible)} className="ml-2 text-gray-400 hover:text-blue-500">
                        {passwordVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5"/>}
                    </button>
                    <button onClick={() => handleCopy(account.password || '', 'password')} className="ml-2 text-gray-400 hover:text-blue-500">
                        {copiedField === 'password' ? <CheckIcon className="text-green-500" /> : <CopyIcon />}
                    </button>
                </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {account.totpSecret ? (
                    <div className="flex items-center">
                        <TOTPDisplay secret={account.totpSecret} />
                        <button onClick={() => handleCopy(TotpService.generate(account.totpSecret || '').code, 'totp')} className="ml-2 text-gray-400 hover:text-blue-500 self-start">
                            {copiedField === 'totp' ? <CheckIcon className="text-green-500" /> : <CopyIcon />}
                        </button>
                    </div>
                ) : <span className="text-gray-400 dark:text-gray-500">-</span>}
            </td>
             <td className="px-4 py-3 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {account.category}
                </span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => onEdit(account)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 mr-3">
                    <EditIcon />
                </button>
                <button onClick={() => onDelete(account.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                    <TrashIcon />
                </button>
            </td>
        </tr>
    );
};

// --- Toast Notification ---
interface ToastProps {
    message: string;
    onClose: () => void;
}
export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-down">
            {message}
        </div>
    );
};
