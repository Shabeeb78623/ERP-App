
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, BenefitRecord, RegistrationQuestion } from '../types';
import { HeartHandshake, CheckCircle2, AlertCircle, Wallet, User as UserIcon, ShieldCheck, CalendarClock, MessageSquare, Send } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface UserDashboardProps {
  user: User;
  benefits: BenefitRecord[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  isLoading?: boolean;
  activeYear: number;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, benefits, onUpdateUser, isLoading, activeYear }) => {
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  useEffect(() => {
      const loadData = async () => {
          const qs = await StorageService.getQuestions();
          setQuestions(qs);
      };
      loadData();
  }, []);

  const handlePaymentSubmit = () => {
      if (!paymentRemarks.trim()) {
          alert("Please enter transaction details or remarks.");
          return;
      }
      // Set status to PENDING upon submission, not PAID
      onUpdateUser(user.id, { 
          paymentStatus: PaymentStatus.PENDING,
          paymentRemarks: paymentRemarks
      });
      alert("Payment details submitted successfully. Admin will verify shortly.");
      setPaymentRemarks('');
  };

  const handleSendMessage = async () => {
      if(!messageSubject || !messageBody) {
          alert("Please fill in subject and message.");
          return;
      }
      setIsSendingMsg(true);
      try {
          await StorageService.sendMessage({
              id: `msg-${Date.now()}`,
              userId: user.id,
              userName: user.fullName,
              userRegNo: user.membershipNo || 'PENDING',
              subject: messageSubject,
              content: messageBody,
              date: new Date().toLocaleDateString(),
              status: 'NEW'
          });
          alert("Message sent to Admin successfully!");
          setMessageSubject('');
          setMessageBody('');
      } catch (e) {
          alert("Failed to send message.");
          console.error(e);
      } finally {
          setIsSendingMsg(false);
      }
  };

  // Function to map custom data ID to Label
  const getLabel = (id: string) => {
      const q = questions.find(quest => quest.id === id);
      return q ? q.label : id;
  }

  // Determine if it's a renewal (Registered year is less than current active year)
  // If user is currently unpaid, and their registration was in the past, it's a renewal.
  const isRenewal = user.registrationYear < activeYear;

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
               <div className={`px-4 py-3 rounded-xl flex items-center gap-3 border bg-white shadow-sm`}>
                   <CalendarClock className="w-5 h-5 text-indigo-600" />
                   <div>
                       <p className="text-xs font-bold uppercase opacity-70 text-slate-500">Fiscal Year</p>
                       <p className="font-bold text-slate-900">{activeYear}</p>
                   </div>
               </div>

               <div className={`px-4 py-3 rounded-xl flex items-center gap-3 border ${user.status === UserStatus.APPROVED && user.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                   {user.status === UserStatus.APPROVED && user.paymentStatus === PaymentStatus.PAID ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                   <div>
                       <p className="text-xs font-bold uppercase opacity-70">Account Status</p>
                       <p className="font-bold">{user.paymentStatus === PaymentStatus.PAID ? 'Active' : 'Action Required'}</p>
                   </div>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Payment Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
                {/* Visual Renewal Banner if applicable */}
                {isRenewal && user.paymentStatus !== PaymentStatus.PAID && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-900">Membership Renewal Due for {activeYear}</h4>
                                <p className="text-sm text-amber-700 mt-1">
                                    Your ID card is currently locked. Please pay the renewal fee to reactivate your membership card and benefits.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 text-primary rounded-lg">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                        {isRenewal ? `Renewal for ${activeYear}` : 'Membership Fees'}
                    </h2>
                </div>

                {user.paymentStatus === PaymentStatus.UNPAID ? (
                    <div className="space-y-6">
                         <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                             <div>
                                 <p className="text-sm text-slate-500">
                                     {isRenewal ? `Renewal Fee (${activeYear})` : `Annual Fee (${user.registrationYear})`}
                                 </p>
                                 <p className="text-2xl font-bold text-slate-900">AED 25.00</p>
                             </div>
                             <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">DUE</span>
                         </div>

                         <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-700">Payment Proof / Remarks</label>
                             <p className="text-xs text-slate-400">Please pay via bank transfer or to your Mandalam admin, then enter the details here.</p>
                             <textarea 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all resize-none h-24 text-sm"
                                placeholder="E.g. Paid AED 25 via Bank Transfer Ref: 12345678"
                                value={paymentRemarks}
                                onChange={(e) => setPaymentRemarks(e.target.value)}
                             />
                         </div>
                         <button 
                            onClick={handlePaymentSubmit}
                            disabled={isLoading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
                         >
                             {isLoading ? 'Processing...' : (isRenewal ? 'Submit Renewal' : 'Submit Payment Proof')}
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
                            {user.paymentStatus === PaymentStatus.PAID ? `Membership Active (${activeYear})` : 'Payment Under Review'}
                        </h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm">
                            {user.paymentStatus === PaymentStatus.PAID 
                                ? 'Your dues are cleared for the current fiscal year.' 
                                : 'Admin is reviewing your payment submission. Status will be updated shortly.'}
                        </p>
                        {user.paymentStatus === PaymentStatus.PENDING && user.paymentRemarks && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                                <strong>Your Submission:</strong> {user.paymentRemarks}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Contact Admin Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Contact Admin</h2>
                        <p className="text-xs text-slate-500">Send a message to the support team.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <input 
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500"
                        placeholder="Subject (e.g., Update Profile Request)"
                        value={messageSubject}
                        onChange={e => setMessageSubject(e.target.value)}
                    />
                    <textarea 
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm h-24 resize-none outline-none focus:border-indigo-500"
                        placeholder="Type your message..."
                        value={messageBody}
                        onChange={e => setMessageBody(e.target.value)}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isSendingMsg}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-70"
                    >
                        {isSendingMsg ? 'Sending...' : <><Send className="w-4 h-4"/> Send Message</>}
                    </button>
                </div>
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
                                 <p className="text-sm font-medium text-slate-900 break-words">{val}</p>
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
