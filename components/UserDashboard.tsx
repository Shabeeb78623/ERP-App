
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, BenefitRecord, RegistrationQuestion, Sponsor, NewsEvent, Message } from '../types';
import { HeartHandshake, CheckCircle2, AlertCircle, Wallet, User as UserIcon, ShieldCheck, CalendarClock, MessageSquare, Send, Calendar, MapPin, Upload, Link as LinkIcon, Image as ImageIcon, Clock, CheckCircle } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface UserDashboardProps {
  user: User;
  benefits: BenefitRecord[];
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  isLoading?: boolean;
  activeYear: number;
  sponsors?: Sponsor[];
  newsEvents?: NewsEvent[];
  messages?: Message[];
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, benefits, onUpdateUser, isLoading, activeYear, sponsors = [], newsEvents = [], messages = [] }) => {
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentProof, setPaymentProof] = useState<string>('');
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

  const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) return alert("File size must be less than 2MB");
          const reader = new FileReader();
          reader.onloadend = () => {
              setPaymentProof(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handlePaymentSubmit = () => {
      // Allow submission if proof OR remarks exist
      if (!paymentRemarks.trim() && !paymentProof) {
          alert("Please enter transaction details or upload a proof.");
          return;
      }
      // Set status to PENDING upon submission, not PAID
      onUpdateUser(user.id, { 
          paymentStatus: PaymentStatus.PENDING,
          paymentRemarks: paymentRemarks || 'Proof Uploaded',
          paymentProofUrl: paymentProof
      });
      alert("Payment details submitted successfully. Admin will verify shortly.");
      setPaymentRemarks('');
      setPaymentProof('');
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
              date: new Date().toISOString(), // Use ISO for better sorting/parsing
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

  const isRenewal = user.registrationYear < activeYear;
  
  // Filter messages for current user and sort by date descending
  const myMessages = messages.filter(m => m.userId === user.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
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
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* News & Events Section */}
            {newsEvents.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" /> Latest News & Events
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {newsEvents.map(item => (
                            <div key={item.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                {item.imageUrl && (
                                    <div className="h-40 overflow-hidden bg-slate-100">
                                        <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title} />
                                    </div>
                                )}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${item.type === 'EVENT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.type}
                                        </span>
                                        <span className="text-xs text-slate-400">{item.date}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                                    <p className="text-sm text-slate-600 line-clamp-3 mb-3 flex-1">{item.description}</p>
                                    
                                    <div className="flex flex-col gap-2 mt-auto">
                                        {item.type === 'EVENT' && item.location && (
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {item.location}
                                            </p>
                                        )}
                                        {item.link && (
                                            <a 
                                                href={item.link} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 text-primary text-xs font-bold rounded hover:bg-slate-100 transition-colors border border-slate-100"
                                            >
                                                <LinkIcon className="w-3 h-3" /> More Info / Register
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative">
                {isRenewal && user.paymentStatus !== PaymentStatus.PAID && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-900">Membership Renewal Due for {activeYear}</h4>
                                <p className="text-sm text-amber-700 mt-1">
                                    Your ID card is currently locked. Please pay the renewal fee.
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

                         <div className="space-y-3">
                             <label className="text-sm font-bold text-slate-700">Payment Proof</label>
                             <p className="text-xs text-slate-400">Upload screenshot of bank transfer or receipt.</p>
                             
                             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {paymentProof ? (
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <ImageIcon className="w-8 h-8" />
                                            <span className="text-sm font-bold">Image Selected</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                            <p className="text-xs text-slate-500 font-bold">Click to upload image</p>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handlePaymentProofUpload} />
                            </label>

                             <label className="text-sm font-bold text-slate-700 block mt-4">Remarks (Optional)</label>
                             <textarea 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all resize-none h-20 text-sm"
                                placeholder="E.g. Transaction Ref: 12345678"
                                value={paymentRemarks}
                                onChange={(e) => setPaymentRemarks(e.target.value)}
                             />
                         </div>
                         <button 
                            onClick={handlePaymentSubmit}
                            disabled={isLoading}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
                         >
                             {isLoading ? 'Processing...' : 'Submit Payment'}
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
                                : 'Admin is reviewing your payment submission.'}
                        </p>
                        {user.paymentStatus === PaymentStatus.PENDING && (
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100 text-left">
                                {user.paymentRemarks && <p className="mb-1"><strong>Remarks:</strong> {user.paymentRemarks}</p>}
                                {user.paymentProofUrl && <p className="text-emerald-600 font-bold flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Proof Uploaded</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Contact Admin / Message History Section (Improved UX) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 bg-white border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Support Tickets</h2>
                        <p className="text-xs text-slate-500">Contact admin for help or updates.</p>
                    </div>
                </div>

                {/* New Ticket Input Area */}
                <div className="p-6 bg-slate-50 border-b border-slate-100">
                    <div className="space-y-3">
                        <input 
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                            placeholder="Subject (e.g., Update Profile)"
                            value={messageSubject}
                            onChange={e => setMessageSubject(e.target.value)}
                        />
                        <div className="relative">
                            <textarea 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm h-24 resize-none outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white pr-14"
                                placeholder="Type your message..."
                                value={messageBody}
                                onChange={e => setMessageBody(e.target.value)}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={isSendingMsg}
                                className="absolute bottom-3 right-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {isSendingMsg ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tickets Stream */}
                <div className="p-6 bg-slate-50 space-y-6 max-h-[600px] overflow-y-auto">
                    {myMessages.length > 0 ? (
                        myMessages.map(msg => (
                            <div key={msg.id} className="flex flex-col gap-2">
                                {/* Ticket Subject Header */}
                                <div className="flex justify-center mb-2">
                                    <span className="text-[10px] text-slate-400 font-bold bg-white border px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                        {msg.subject} • {new Date(msg.date).toLocaleDateString()}
                                    </span>
                                </div>

                                {/* User Message (Right) */}
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] bg-primary text-white p-3 rounded-2xl rounded-tr-sm shadow-sm relative">
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        <span className="text-[10px] text-blue-200 absolute bottom-1 right-2 opacity-0 hover:opacity-100 transition-opacity">
                                            {new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>

                                {/* Admin Reply (Left) */}
                                {msg.adminReply ? (
                                    <div className="flex justify-start">
                                        <div className="flex gap-2 max-w-[85%]">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 mt-auto">
                                                A
                                            </div>
                                            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm text-slate-800">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.adminReply}</p>
                                                <div className="mt-1 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-[10px] text-slate-400">Support Agent</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-end">
                                        <span className="text-[10px] text-slate-400 italic pr-1">Waiting for reply...</span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No ticket history found.</p>
                        </div>
                    )}
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
                     
                     {/* Extended Fields Explicit Display */}
                     {user.addressUAE && (
                         <div className="p-3 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-400 uppercase font-bold">UAE Address</p>
                             <p className="text-sm font-medium text-slate-900 break-words">{user.addressUAE}</p>
                         </div>
                     )}
                     {user.addressIndia && (
                         <div className="p-3 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-400 uppercase font-bold">India Address</p>
                             <p className="text-sm font-medium text-slate-900 break-words">{user.addressIndia}</p>
                         </div>
                     )}
                     {user.nominee && (
                         <div className="p-3 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-400 uppercase font-bold">Nominee</p>
                             <p className="text-sm font-medium text-slate-900">{user.nominee} <span className="text-slate-500 font-normal">({user.relation})</span></p>
                         </div>
                     )}
                     {user.isKMCCMember && (
                         <div className="p-3 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-400 uppercase font-bold">KMCC Member</p>
                             <p className="text-sm font-medium text-slate-900">Yes {user.kmccNo ? `(No: ${user.kmccNo})` : ''}</p>
                         </div>
                     )}
                     {user.recommendedBy && (
                         <div className="p-3 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-400 uppercase font-bold">Recommended By</p>
                             <p className="text-sm font-medium text-slate-900">{user.recommendedBy}</p>
                         </div>
                     )}

                     {/* Dynamic Custom Data Display */}
                     {user.customData && Object.entries(user.customData).map(([key, val]) => {
                         if(!val) return null;
                         const label = getLabel(key);
                         // Don't repeat standard fields if handled above
                         if(['email','mobile','emirates id', 'uae address', 'india address', 'nominee', 'relation', 'kmcc', 'recommended'].some(k => label.toLowerCase().includes(k))) return null;

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

      {/* Sponsors Footer */}
      {sponsors.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-8">
              <h4 className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Our Sponsors</h4>
              <div className="flex flex-wrap justify-center gap-8 items-center opacity-80 hover:opacity-100 transition-opacity">
                  {sponsors.map(sponsor => (
                      sponsor.logoUrl ? (
                          <a 
                              key={sponsor.id} 
                              href={sponsor.website || '#'} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group flex flex-col items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300"
                              title={sponsor.name}
                          >
                              <img src={sponsor.logoUrl} alt={sponsor.name} className="h-12 w-auto object-contain max-w-[120px]" />
                          </a>
                      ) : null
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

export default UserDashboard;
