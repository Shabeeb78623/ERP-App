
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, BenefitRecord, RegistrationQuestion } from '../types';
import { HeartHandshake, CheckCircle2, AlertCircle, CreditCard, Wallet, User as UserIcon, ShieldCheck } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface UserDashboardProps {
  user: User;
  benefits: BenefitRecord[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  isLoading?: boolean;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, benefits, onUpdateUser, isLoading }) => {
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);

  useEffect(() => {
      StorageService.getQuestions().then(qs => setQuestions(qs));
  }, []);

  const handlePaymentSubmit = () => {
      if (!paymentRemarks) {
          alert("Please enter remarks.");
          return;
      }
      // Set status to PENDING upon submission, not PAID
      onUpdateUser(user.id, { paymentStatus: PaymentStatus.PENDING });
      alert("Payment details submitted for verification.");
  };

  // Function to map custom data ID to Label
  const getLabel = (id: string) => {
      const q = questions.find(quest => quest.id === id);
      return q ? q.label : id;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-50 text-primary text-xs font-bold uppercase rounded-md tracking-wider">{user.mandalam}</span>
                <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs font-mono rounded-md">{user.membershipNo}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Hello, {user.fullName}</h1>
            <p className="text-slate-500 mt-1">Welcome to your member portal.</p>
          </div>
          
          <div className="flex gap-4 relative z-10">
               <div className={`px-4 py-3 rounded-xl flex items-center gap-3 border ${user.status === UserStatus.APPROVED ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                   {user.status === UserStatus.APPROVED ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                   <div>
                       <p className="text-xs font-bold uppercase opacity-70">Account Status</p>
                       <p className="font-bold">{user.status}</p>
                   </div>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Payment Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 text-primary rounded-lg">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Membership Fees</h2>
                </div>

                {user.paymentStatus === PaymentStatus.UNPAID ? (
                    <div className="space-y-6">
                         <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                             <div>
                                 <p className="text-sm text-slate-500">Annual Fee ({user.registrationYear})</p>
                                 <p className="text-2xl font-bold text-slate-900">AED 60.00</p>
                             </div>
                             <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">DUE</span>
                         </div>

                         <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-700">Payment Reference</label>
                             <textarea 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all resize-none h-24 text-sm"
                                placeholder="Transaction ID, Bank Transfer Ref, or 'Paid Cash to Admin'..."
                                value={paymentRemarks}
                                onChange={(e) => setPaymentRemarks(e.target.value)}
                             />
                         </div>
                         <button 
                            onClick={handlePaymentSubmit}
                            disabled={isLoading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
                         >
                             {isLoading ? 'Processing...' : 'Submit Payment Proof'}
                         </button>
                    </div>
                ) : (
                    <div className="text-center py-8">
                         <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                             user.paymentStatus === PaymentStatus.PAID 
                             ? 'bg-emerald-50 text-emerald-600' 
                             : 'bg-amber-50 text-amber-600'
                         }`}>
                            {user.paymentStatus === PaymentStatus.PAID ? <CheckCircle2 className="w-8 h-8" /> : <Wallet className="w-8 h-8" />}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {user.paymentStatus === PaymentStatus.PAID ? 'Membership Active' : 'Payment Under Review'}
                        </h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm">
                            {user.paymentStatus === PaymentStatus.PAID 
                                ? 'Your dues are cleared for this year.' 
                                : 'Admin is reviewing your payment submission. Status will be updated shortly.'}
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
             {/* Benefits Summary */}
             <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-pink-50 text-pink-500 rounded-lg">
                        <HeartHandshake className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Total Benefits</h3>
                 </div>
                 <p className="text-3xl font-bold text-slate-800">
                     AED {benefits.filter(b => b.userId === user.id).reduce((acc, curr) => acc + curr.amount, 0)}
                 </p>
                 <p className="text-xs text-slate-400 mt-2">Cumulative financial assistance received.</p>
             </div>

             {/* Profile Card */}
             <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">
                        <UserIcon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">My Details</h3>
                 </div>
                 <div className="space-y-3">
                     <div className="p-3 bg-slate-50 rounded-lg">
                         <p className="text-xs text-slate-400 uppercase font-bold">Email</p>
                         <p className="text-sm font-medium text-slate-900 truncate">{user.email || '-'}</p>
                     </div>
                     <div className="p-3 bg-slate-50 rounded-lg">
                         <p className="text-xs text-slate-400 uppercase font-bold">Mobile</p>
                         <p className="text-sm font-medium text-slate-900">{user.mobile}</p>
                     </div>
                     <div className="p-3 bg-slate-50 rounded-lg">
                         <p className="text-xs text-slate-400 uppercase font-bold">Emirates ID</p>
                         <p className="text-sm font-medium text-slate-900">{user.emiratesId}</p>
                     </div>

                     {/* Dynamic Custom Data Display */}
                     {user.customData && Object.entries(user.customData).map(([key, val]) => {
                         if(!val) return null;
                         const label = getLabel(key);
                         // Don't repeat standard fields if handled above
                         if(['email','mobile','emirates id'].includes(label.toLowerCase())) return null;

                         return (
                             <div key={key} className="p-3 bg-slate-50 rounded-lg">
                                 <p className="text-xs text-slate-400 uppercase font-bold">{label}</p>
                                 <p className="text-sm font-medium text-slate-900">{val}</p>
                             </div>
                         )
                     })}
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
