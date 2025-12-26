
import React, { useEffect, useState } from 'react';
import { User, UserStatus, PaymentStatus } from '../types';
import { StorageService } from '../services/storageService';
import { ShieldCheck, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface VerificationViewProps {
    userId: string;
}

const VerificationView: React.FC<VerificationViewProps> = ({ userId }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const fetchedUser = await StorageService.getUserById(userId);
                setUser(fetchedUser);
            } catch (e) {
                setError("Failed to verify user.");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [userId]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="animate-spin text-primary text-4xl mb-4">
                    <i className="fa-solid fa-circle-notch"></i>
                </div>
                <p className="text-slate-500 font-medium">Verifying Member Identity...</p>
            </div>
        );
    }

    if (!user || error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900">Verification Failed</h2>
                    <p className="text-slate-500 mt-2">Invalid or unknown member ID.</p>
                </div>
            </div>
        );
    }

    const isVerified = user.status === UserStatus.APPROVED && user.paymentStatus === PaymentStatus.PAID;

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full">
                {/* Header Status */}
                <div className={`p-6 text-center ${isVerified ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                    {isVerified ? (
                        <>
                            <ShieldCheck className="w-12 h-12 text-white mx-auto mb-2" />
                            <h1 className="text-2xl font-bold text-white">Active Member</h1>
                            <p className="text-white/80 text-sm">Official Verification Successful</p>
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-12 h-12 text-white mx-auto mb-2" />
                            <h1 className="text-2xl font-bold text-white">Verification Alert</h1>
                            <p className="text-white/80 text-sm">
                                {user.paymentStatus !== PaymentStatus.PAID ? 'Membership Fees Pending' : 'Account Pending Approval'}
                            </p>
                        </>
                    )}
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        {user.photoUrl ? (
                            <img src={user.photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg -mt-16 bg-white" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-slate-200 mx-auto -mt-16 border-4 border-white shadow-lg flex items-center justify-center text-slate-400 text-2xl font-bold">
                                {user.fullName.charAt(0)}
                            </div>
                        )}
                        <h2 className="text-xl font-bold text-slate-900 mt-4">{user.fullName}</h2>
                        <p className="text-slate-500 font-mono text-sm">{user.membershipNo}</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 text-sm font-medium">Mandalam</span>
                            <span className="font-bold text-slate-900 text-sm">{user.mandalam}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 text-sm font-medium">Emirate</span>
                            <span className="font-bold text-slate-900 text-sm">{user.emirate}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 text-sm font-medium">Mobile</span>
                            <span className="font-bold text-slate-900 text-sm">{user.mobile}</span>
                        </div>
                         <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-500 text-sm font-medium">Joined</span>
                            <span className="font-bold text-slate-900 text-sm">{user.registrationYear}</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Vadakara NRI Forum</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationView;
