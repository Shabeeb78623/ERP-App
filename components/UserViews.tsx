
import React, { useState, useEffect } from 'react';
import { User, BenefitRecord, Notification } from '../types';
import { HeartHandshake, Settings, Lock, Bell, Trash2, UserCircle, CalendarCheck } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface BaseProps {
    user: User;
    isLoading?: boolean;
    notifications?: Notification[]; // Added prop
}

// --- User Benefits View ---
interface UserBenefitsProps extends BaseProps {
    benefits: BenefitRecord[];
}

export const UserBenefits: React.FC<UserBenefitsProps> = ({ user, benefits }) => {
    const userBenefits = benefits.filter(b => b.userId === user.id);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
             <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-pink-50 rounded-xl text-pink-500">
                        <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">My Benefits</h2>
                        <p className="text-slate-500">Track financial assistance history</p>
                    </div>
                </div>

                {userBenefits.length > 0 ? (
                    <div className="space-y-4">
                        {userBenefits.map(b => (
                            <div key={b.id} className="flex flex-col sm:flex-row justify-between items-center p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                                        <CalendarCheck className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{b.type} Assistance</h4>
                                        <p className="text-xs text-slate-500">{b.date} • {b.remarks}</p>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-emerald-600 bg-white px-4 py-1 rounded-lg border border-emerald-100 shadow-sm">AED {b.amount}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                        <p className="text-slate-400 font-medium">No benefits records found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Account Settings View ---
interface AccountSettingsProps extends BaseProps {
    onUpdateUser: (userId: string, updates: Partial<User>) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onUpdateUser }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleChangePassword = () => {
        if (newPassword !== confirmNewPassword) return alert("Passwords do not match");
        if (newPassword.length < 6) return alert("Password too short");
        onUpdateUser(user.id, { password: newPassword });
        alert("Password update initiated.");
        setNewPassword('');
        setConfirmNewPassword('');
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                 <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Account Settings</h2>
                    <p className="text-slate-500">Manage your profile and security</p>
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Profile Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Full Name</p>
                                <p className="font-medium text-slate-900">{user.fullName}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Reg No</p>
                                <p className="font-medium text-slate-900 font-mono">{user.membershipNo}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Mobile</p>
                                <p className="font-medium text-slate-900">{user.mobile}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Email</p>
                                <p className="font-medium text-slate-900">{user.email || 'Not set'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Security</h3>
                         <div className="max-w-md space-y-4">
                             <input 
                                type="password" 
                                placeholder="New Password" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                             <input 
                                type="password" 
                                placeholder="Confirm Password" 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                             />
                             <button 
                                onClick={handleChangePassword}
                                className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                             >
                                 Update Password
                             </button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Notifications View ---
export const UserNotifications: React.FC<BaseProps> = ({ user, notifications = [] }) => {
    // Filter notifications logic
    const myNotifs = notifications.filter(n => {
         // 1. Direct recipient check (highest priority)
         if (n.recipients && n.recipients.length > 0) {
             return n.recipients.includes(user.id);
         }
         
         // 2. Broadcast check
         if (n.type === 'BROADCAST') {
             if (n.targetAudience === 'All Members' || n.targetAudience === 'ALL') return true;
             // Mandalam specific broadcast
             if (n.targetAudience === `${user.mandalam} Members`) return true;
             // Custom text match fallback
             if (n.targetAudience === 'My Members' && user.mandalam) return true; // Assuming context implies same mandalam
         }
         
         return false;
    });

    const handleClear = async (id: string) => {
        if(window.confirm("Delete this message?")) {
            await StorageService.deleteNotification(id); 
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
             <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-h-[600px]">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Inbox</h2>
                    <span className="text-xs font-bold bg-blue-50 text-primary px-3 py-1 rounded-full">{myNotifs.length} Messages</span>
                </div>

                <div className="space-y-4">
                    {myNotifs.length > 0 ? (
                        myNotifs.map(n => (
                            <div key={n.id} className="p-5 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900">{n.title}</h4>
                                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">{n.date}</span>
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed mb-3">{n.message}</p>
                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleClear(n.id)}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Bell className="w-12 h-12 mb-4 opacity-20" />
                            <p>No new notifications</p>
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
};
