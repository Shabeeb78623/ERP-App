
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification } from '../types';
import { Search, Upload, Trash2, Eye, Plus, Shield, Calendar, UserPlus, Edit, Save, X, Filter, Check, ArrowUp, ArrowDown, CheckCircle2, XCircle, Wallet, Bell, LogOut, Send, ChevronDown, FileUp, RotateCcw, Download, UserCog, MoreHorizontal } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS, EMIRATES } from '../constants';

interface AdminDashboardProps {
  currentUser: User;
  users: User[];
  benefits: BenefitRecord[];
  notifications: Notification[];
  stats: DashboardStats;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddBenefit: (benefit: BenefitRecord) => void;
  onDeleteBenefit: (id: string) => void;
  onDeleteNotification: (id: string) => void;
  isLoading: boolean;
}

const TABS = [
  'User Approvals', 'Users Data', 'Users Overview', 'Payment Mgmt', 'Payment Subs', 
  'Benefits', 'Notifications', 'Import Users', 'Admin Assign', 'Reg Questions', 'New Year'
];

const ADMIN_PERMISSIONS = [
  { id: 'view_users', label: 'Can View Users' },
  { id: 'edit_users', label: 'Can Edit Users' },
  { id: 'approve_users', label: 'Can Approve Users' },
  { id: 'manage_payments', label: 'Can Manage Payments' },
  { id: 'manage_benefits', label: 'Can Manage Benefits' },
  { id: 'send_notifications', label: 'Can Send Notifications' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, users, benefits, notifications, stats, onUpdateUser, onAddBenefit, onDeleteBenefit, onDeleteNotification, isLoading }) => {
  const [activeTab, setActiveTab] = useState('User Approvals');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showMandalamModal, setShowMandalamModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null); // For Full Detail View
  
  // Data States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [questions, setQuestions] = useState<RegistrationQuestion[]>([]);
  const [years, setYears] = useState<YearConfig[]>([]);

  // Forms
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [sendingNotif, setSendingNotif] = useState(false);

  const [questionForm, setQuestionForm] = useState<Partial<RegistrationQuestion>>({
      type: FieldType.TEXT,
      required: true,
      order: 0,
      dependentOptions: {}
  });

  const [benefitForm, setBenefitForm] = useState({
      userId: '',
      type: BenefitType.HOSPITAL,
      amount: '',
      remarks: ''
  });
  
  const [editUserForm, setEditUserForm] = useState<Partial<User>>({});

  // Admin Assignment
  const [selectedUserForAdmin, setSelectedUserForAdmin] = useState<User | null>(null);
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [customMandalams, setCustomMandalams] = useState<Mandalam[]>([]);
  const [assignMandalamSel, setAssignMandalamSel] = useState<Mandalam[]>([]);

  // Filtering
  const [filterMandalam, setFilterMandalam] = useState('All Mandalams');
  const [filterStatus, setFilterStatus] = useState('All Status');

  // Clear search on tab change for cleaner UX
  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  // --- ROLE BASED ACCESS CONTROL ---
  const getAuthorizedUsers = () => {
    // Exclude the system 'admin-master' from lists to prevent editing/revoking the superuser
    const realUsers = users.filter(u => u.id !== 'admin-master');

    if (currentUser.role === Role.MASTER_ADMIN) return realUsers;
    
    if (currentUser.role === Role.MANDALAM_ADMIN) {
        // Mandalam Admin sees only their assigned mandalams
        const allowed = currentUser.assignedMandalams && currentUser.assignedMandalams.length > 0 
            ? currentUser.assignedMandalams 
            : [currentUser.mandalam];
        return realUsers.filter(u => allowed.includes(u.mandalam));
    }
    
    if (currentUser.role === Role.CUSTOM_ADMIN) {
        if (currentUser.assignedMandalams && currentUser.assignedMandalams.length > 0) {
             return realUsers.filter(u => currentUser.assignedMandalams!.includes(u.mandalam));
        }
        return realUsers;
    }
    
    return [];
  };

  const authorizedUsers = getAuthorizedUsers();
  const authorizedBenefits = benefits.filter(b => authorizedUsers.some(u => u.id === b.userId));

  useEffect(() => {
      const loadData = async () => {
          setYears(await StorageService.getYears());
          setQuestions(await StorageService.getQuestions());
      }
      loadData();
  }, [activeTab]);

  // --- ACTIONS ---

  const handleApproveUser = (id: string) => {
      if(confirm("Approve this user?")) {
          onUpdateUser(id, { status: UserStatus.APPROVED });
      }
  };

  const handleRejectUser = (id: string) => {
      if(confirm("Reject this user?")) {
          onUpdateUser(id, { status: UserStatus.REJECTED });
      }
  };

  const handleApprovePayment = (id: string) => {
      if(confirm("Confirm payment received? This will also approve the user.")) {
          onUpdateUser(id, { 
              paymentStatus: PaymentStatus.PAID, 
              status: UserStatus.APPROVED 
          });
      }
  };

  const handleRejectPayment = (id: string) => {
      if(confirm("Reject this payment?")) {
          onUpdateUser(id, { paymentStatus: PaymentStatus.UNPAID });
      }
  };

  const handleAddBenefitSubmit = () => {
      if(!benefitForm.userId || !benefitForm.amount) return;
      const user = users.find(u => u.id === benefitForm.userId);
      onAddBenefit({
          id: `benefit-${Date.now()}`,
          userId: benefitForm.userId,
          userName: user?.fullName,
          regNo: user?.membershipNo,
          type: benefitForm.type,
          amount: Number(benefitForm.amount),
          remarks: benefitForm.remarks,
          date: new Date().toLocaleDateString()
      });
      setIsBenefitModalOpen(false);
      setBenefitForm({ userId: '', type: BenefitType.HOSPITAL, amount: '', remarks: '' });
  };

  const handleSendNotification = async () => {
      if (!notifTitle || !notifMessage) {
          alert("Please enter title and message");
          return;
      }
      setSendingNotif(true);
      try {
          let recipients: string[] | undefined = undefined;
          
          if (notifTarget !== 'ALL') {
              // If target is a Mandalam
              const targetUsers = users.filter(u => u.mandalam === notifTarget);
              recipients = targetUsers.map(u => u.id);
          } else {
             // If ALL, but I am a Mandalam Admin, restrict to my users
             if (currentUser.role === Role.MANDALAM_ADMIN) {
                 recipients = authorizedUsers.map(u => u.id);
             }
          }

          await StorageService.addNotification({
              id: `notif-${Date.now()}`,
              title: notifTitle,
              message: notifMessage,
              date: new Date().toLocaleDateString(),
              read: false,
              type: 'BROADCAST',
              targetAudience: notifTarget === 'ALL' ? 'All Members' : `${notifTarget} Members`,
              recipients: recipients
          });
          alert("Notification sent successfully");
          setNotifTitle('');
          setNotifMessage('');
      } catch (error) {
          console.error("Notification Error:", error);
          alert("Failed to send notification.");
      } finally {
          setSendingNotif(false);
      }
  };

  const handleAssignAdmin = (user: User, role: Role) => {
      setSelectedUserForAdmin(user);
      
      if (role === Role.MANDALAM_ADMIN) {
          setAssignMandalamSel(user.assignedMandalams || [user.mandalam]);
          setShowMandalamModal(true);
      } else if (role === Role.CUSTOM_ADMIN) {
          setCustomPerms(user.permissions || []);
          setCustomMandalams(user.assignedMandalams || []);
          setShowCustomModal(true);
      } else {
          // Master Admin or Reset to User (Revoke)
          const action = role === Role.USER ? "Revoke Admin Rights" : "Grant All Access Admin";
          if(confirm(`${action} for ${user.fullName}?`)) {
              onUpdateUser(user.id, { role: role, assignedMandalams: [], permissions: [] });
          }
          setSelectedUserForAdmin(null);
      }
  };

  const saveAdminAssignment = () => {
      if (!selectedUserForAdmin) return;
      
      if (showMandalamModal) {
          onUpdateUser(selectedUserForAdmin.id, {
              role: Role.MANDALAM_ADMIN,
              assignedMandalams: assignMandalamSel
          });
          setShowMandalamModal(false);
      } else if (showCustomModal) {
          onUpdateUser(selectedUserForAdmin.id, {
              role: Role.CUSTOM_ADMIN,
              permissions: customPerms,
              assignedMandalams: customMandalams 
          });
          setShowCustomModal(false);
      }
      setSelectedUserForAdmin(null);
  };
  
  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setEditUserForm(user);
  };
  
  const saveEditedUser = () => {
      if(editingUser && editUserForm) {
          onUpdateUser(editingUser.id, editUserForm);
          setEditingUser(null);
          setEditUserForm({});
      }
  };

  const handleImportUsers = async () => {
      if (!importFile) return;
      setIsImporting(true);
      try {
          const text = await importFile.text();
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const newUsers: User[] = [];
          const currentYear = new Date().getFullYear();

          // Skip header
          for (let i = 1; i < lines.length; i++) {
              const row = lines[i].split(',');
              if (row.length < 3) continue;

              const getValue = (field: string) => {
                  const idx = headers.findIndex(h => h.includes(field));
                  return idx !== -1 ? row[idx]?.trim().replace(/"/g, '') : '';
              };

              const name = getValue('name');
              const mobile = getValue('mobile');
              const eid = getValue('emirates id') || getValue('emirates_id') || `784${Math.random().toString().slice(2,14)}`;
              const mandalam = getValue('mandalam') as Mandalam || Mandalam.BALUSSERY;

              if (name && mobile) {
                  const id = `user-${Date.now()}-${i}`;
                  newUsers.push({
                      id,
                      fullName: name,
                      mobile,
                      whatsapp: mobile,
                      emiratesId: eid,
                      mandalam: mandalam,
                      emirate: Emirate.DUBAI,
                      status: UserStatus.APPROVED,
                      paymentStatus: PaymentStatus.UNPAID,
                      role: Role.USER,
                      registrationYear: currentYear,
                      photoUrl: '',
                      membershipNo: await StorageService.generateNextMembershipNo(currentYear),
                      registrationDate: new Date().toLocaleDateString(),
                      isImported: true,
                      password: eid // Set default password as Emirates ID
                  });
              }
          }
          
          await StorageService.addUsers(newUsers);
          alert(`Successfully imported ${newUsers.length} users.`);
          setImportFile(null);
      } catch (e) {
          console.error(e);
          alert("Import failed. Check file format.");
      } finally {
          setIsImporting(false);
      }
  };

  const handleStartNewYear = async () => {
      const nextYear = new Date().getFullYear() + 1;
      if (!confirm(`Are you sure you want to start the fiscal year ${nextYear}? This will reset payment statuses for all users.`)) return;
      
      try {
          // 1. Archive current year
          await StorageService.createNewYear(nextYear);
          
          // 2. Reset Users
          const batchPromises = users.map(u => {
              if (u.role === Role.USER || u.role === Role.MANDALAM_ADMIN) {
                 return onUpdateUser(u.id, { 
                     paymentStatus: PaymentStatus.UNPAID,
                     paymentRemarks: ''
                 });
              }
              return Promise.resolve();
          });
          
          await Promise.all(batchPromises);
          alert(`System updated for Year ${nextYear}.`);
      } catch (e) {
          console.error(e);
          alert("Failed to start new year.");
      }
  };
  
  const handleDownloadSample = () => {
    const headers = "Full Name,Emirates ID,Mobile,Emirate,Mandalam";
    const sample = "John Doe,784123456789012,0501234567,DUBAI,NADAPURAM";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sample;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_import.csv");
    document.body.appendChild(link);
    link.click();
  };

  // --- FILTER & SEARCH HELPERS ---

  // Enhanced search to include Mobile, Email, Emirates ID
  const matchesSearch = (u: User) => {
      const term = searchTerm.toLowerCase();
      return (
          u.fullName.toLowerCase().includes(term) ||
          u.membershipNo.toLowerCase().includes(term) ||
          u.mobile.includes(term) ||
          (u.email && u.email.toLowerCase().includes(term)) ||
          u.emiratesId.includes(term)
      );
  };

  const filteredList = authorizedUsers.filter(matchesSearch);

  // For Benefits Search
  const matchesBenefitSearch = (b: BenefitRecord) => {
      const term = searchTerm.toLowerCase();
      return (
          (b.userName && b.userName.toLowerCase().includes(term)) ||
          (b.regNo && b.regNo.toLowerCase().includes(term)) ||
          (b.remarks && b.remarks.toLowerCase().includes(term))
      );
  };

  const filteredBenefits = authorizedBenefits.filter(matchesBenefitSearch);


  // --- RENDERERS ---

  const renderTabs = () => (
    <div className="flex overflow-x-auto pb-2 gap-2 mb-6 no-scrollbar">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === tab 
              ? 'bg-slate-800 text-white' 
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderSearchBar = (placeholder: string = "Search...") => (
      <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input 
             type="text" 
             placeholder={placeholder}
             className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Stats Header */}
      <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase">Year:</span>
                      <select className="bg-transparent text-sm font-bold outline-none">
                          {years.map(y => <option key={y.year} value={y.year}>{y.year}</option>)}
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
               {/* Stats Cards ... (Keep existing stats markup) */}
               <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-blue-600">{stats.total}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-emerald-600">{stats.new}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">New</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-orange-600">{stats.reReg}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Re-reg</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-amber-600">{stats.pending}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Pending</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-2xl font-bold text-emerald-700">{stats.approved}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Approved</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-red-600">{stats.rejected}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Rejected</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-purple-600">{stats.paid}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Paid</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                  <h3 className="text-2xl font-bold text-indigo-600">{stats.admins}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Admins</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm col-span-2 md:col-span-1">
                  <h3 className="text-2xl font-bold text-green-600">AED {stats.collected}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold">Collected</p>
              </div>
          </div>
      </div>

      {renderTabs()}

      {/* --- USER APPROVALS TAB --- */}
      {activeTab === 'User Approvals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-bold text-slate-800 mb-2">Pending Approvals</h3>
                 {renderSearchBar("Search by name, mobile, ID...")}
             </div>
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                     <tr>
                         <th className="px-6 py-3">User Details</th>
                         <th className="px-6 py-3">Location</th>
                         <th className="px-6 py-3">Applied On</th>
                         <th className="px-6 py-3 text-right">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredList.filter(u => u.status === UserStatus.PENDING).length === 0 && (
                         <tr><td colSpan={4} className="p-8 text-center text-slate-400">No pending approvals</td></tr>
                     )}
                     {filteredList.filter(u => u.status === UserStatus.PENDING).map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4">
                                 <p className="font-bold text-slate-900">{user.fullName}</p>
                                 <p className="text-xs text-slate-500">{user.mobile}</p>
                                 <p className="text-[10px] text-slate-400">{user.emiratesId}</p>
                             </td>
                             <td className="px-6 py-4">
                                 <span className="bg-blue-50 text-primary px-2 py-1 rounded text-xs font-bold">{user.mandalam}</span>
                                 <p className="text-xs text-slate-500 mt-1">{user.emirate}</p>
                             </td>
                             <td className="px-6 py-4 text-slate-500">{user.registrationDate}</td>
                             <td className="px-6 py-4 text-right space-x-2">
                                 <button onClick={() => handleApproveUser(user.id)} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">Approve</button>
                                 <button onClick={() => handleRejectUser(user.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Reject</button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
        </div>
      )}

      {/* --- PAYMENT MANAGEMENT TAB --- */}
      {activeTab === 'Payment Mgmt' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-bold text-slate-800 mb-2">Pending Payments</h3>
                 {renderSearchBar("Search by name, mobile, reg no...")}
             </div>
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                     <tr>
                         <th className="px-6 py-3">User</th>
                         <th className="px-6 py-3">Submission Details</th>
                         <th className="px-6 py-3 text-right">Verify</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING).length === 0 && (
                         <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending payments</td></tr>
                     )}
                     {filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING).map(user => (
                         <tr key={user.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4">
                                 <p className="font-bold text-slate-900">{user.fullName}</p>
                                 <p className="text-xs text-slate-500 font-mono">{user.membershipNo}</p>
                                 <p className="text-xs text-slate-400">{user.mobile}</p>
                             </td>
                             <td className="px-6 py-4">
                                 <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg max-w-md">
                                     <p className="text-xs font-bold text-amber-800 uppercase mb-1">User Remarks</p>
                                     <p className="text-sm text-slate-700 italic">"{user.paymentRemarks || 'No remarks provided'}"</p>
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-right space-x-2">
                                 <button onClick={() => handleApprovePayment(user.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1 ml-auto">
                                     <Check className="w-3 h-3" /> Mark Paid
                                 </button>
                                 <button onClick={() => handleRejectPayment(user.id)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50">
                                     Reject
                                 </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      )}

      {/* --- PAYMENT SUBMISSIONS TAB (HISTORY) --- */}
      {activeTab === 'Payment Subs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-800 mb-2">Recent Payment Activity</h3>
                   {renderSearchBar("Search history...")}
               </div>
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                       <tr>
                           <th className="px-6 py-3">Reg No</th>
                           <th className="px-6 py-3">Name</th>
                           <th className="px-6 py-3">Status</th>
                           <th className="px-6 py-3">Remarks</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {filteredList.filter(u => u.paymentStatus !== PaymentStatus.UNPAID).map(user => (
                           <tr key={user.id}>
                               <td className="px-6 py-4 font-mono text-xs">{user.membershipNo}</td>
                               <td className="px-6 py-4 font-medium">
                                   {user.fullName}
                                   <div className="text-xs text-slate-400">{user.mobile}</div>
                               </td>
                               <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded text-xs font-bold ${user.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                       {user.paymentStatus}
                                   </span>
                               </td>
                               <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-xs">{user.paymentRemarks || '-'}</td>
                           </tr>
                       ))}
                   </tbody>
               </table>
          </div>
      )}

      {/* --- BENEFITS TAB --- */}
      {activeTab === 'Benefits' && (
          <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                       <h3 className="font-bold text-slate-800">Financial Assistance Records</h3>
                       <button 
                          onClick={() => setIsBenefitModalOpen(true)}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark flex items-center gap-2"
                       >
                           <Plus className="w-4 h-4" /> Add Record
                       </button>
                   </div>
                   {renderSearchBar("Search benefits by name, reg no, or remarks...")}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                          <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Beneficiary</th>
                              <th className="px-6 py-3">Type</th>
                              <th className="px-6 py-3">Amount</th>
                              <th className="px-6 py-3">Remarks</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredBenefits.map(b => (
                              <tr key={b.id} className="hover:bg-slate-50">
                                  <td className="px-6 py-4 text-slate-500">{b.date}</td>
                                  <td className="px-6 py-4">
                                      <p className="font-bold text-slate-900">{b.userName}</p>
                                      <p className="text-xs text-slate-500">{b.regNo}</p>
                                  </td>
                                  <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{b.type}</span></td>
                                  <td className="px-6 py-4 font-bold text-emerald-600">AED {b.amount}</td>
                                  <td className="px-6 py-4 text-slate-500">{b.remarks}</td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => onDeleteBenefit(b.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                  </td>
                              </tr>
                          ))}
                          {filteredBenefits.length === 0 && (
                              <tr><td colSpan={6} className="text-center py-8 text-slate-400">No records found</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Benefit Modal */}
              {isBenefitModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4">
                          <h3 className="text-xl font-bold text-slate-900">Add Benefit Record</h3>
                          
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Select Member</label>
                                  <select 
                                     className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                     value={benefitForm.userId}
                                     onChange={(e) => setBenefitForm({...benefitForm, userId: e.target.value})}
                                  >
                                      <option value="">-- Choose Member --</option>
                                      {authorizedUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.membershipNo})</option>)}
                                  </select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                                      <select 
                                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                          value={benefitForm.type}
                                          onChange={(e) => setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}
                                      >
                                          {Object.values(BenefitType).map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Amount (AED)</label>
                                      <input 
                                          type="number" 
                                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                          value={benefitForm.amount}
                                          onChange={(e) => setBenefitForm({...benefitForm, amount: e.target.value})}
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">Remarks</label>
                                  <textarea 
                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                                      value={benefitForm.remarks}
                                      onChange={(e) => setBenefitForm({...benefitForm, remarks: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div className="flex gap-3 pt-4 border-t border-slate-100">
                              <button onClick={() => setIsBenefitModalOpen(false)} className="flex-1 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                              <button onClick={handleAddBenefitSubmit} className="flex-1 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark">Save Record</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- NOTIFICATIONS TAB --- */}
      {activeTab === 'Notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h3 className="font-bold text-slate-800">Compose Message</h3>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Target Audience</label>
                          <select 
                             className="w-full p-2 border border-slate-200 rounded-lg text-sm mt-1"
                             value={notifTarget}
                             onChange={(e) => setNotifTarget(e.target.value)}
                          >
                              <option value="ALL">All Members</option>
                              {MANDALAMS.map(m => <option key={m} value={m}>{m} Only</option>)}
                          </select>
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                          <input 
                              type="text" 
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm mt-1"
                              value={notifTitle}
                              onChange={(e) => setNotifTitle(e.target.value)}
                          />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Message</label>
                          <textarea 
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm mt-1 h-24 resize-none"
                              value={notifMessage}
                              onChange={(e) => setNotifMessage(e.target.value)}
                          />
                      </div>

                      <button 
                          onClick={handleSendNotification}
                          disabled={sendingNotif}
                          className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                          {sendingNotif ? 'Sending...' : 'Send Broadcast'}
                      </button>
                  </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800">Notification History</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
                      {notifications.length === 0 && <p className="text-slate-400 text-center py-10">No history</p>}
                      {notifications.map(n => (
                          <div key={n.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 relative group">
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-bold text-slate-900">{n.title}</h4>
                                  <span className="text-xs text-slate-400">{n.date}</span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{n.message}</p>
                              <div className="flex items-center gap-2 text-xs">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-bold uppercase">{n.type}</span>
                                  <span className="text-slate-400">To: {n.targetAudience}</span>
                              </div>
                              <button onClick={() => onDeleteNotification(n.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- ADMIN ASSIGN TAB --- */}
      {activeTab === 'Admin Assign' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Admin Management</h3>
                  {renderSearchBar("Search users by name, mobile, id to assign permissions...")}

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {filteredList.slice(0, 50).map(user => (
                          <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 gap-4">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <p className="font-bold text-slate-900">{user.fullName}</p>
                                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${user.role === Role.USER ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-purple-700'}`}>
                                          {user.role}
                                      </span>
                                  </div>
                                  <p className="text-xs text-slate-500">{user.mobile} | {user.email || 'No Email'}</p>
                                  <p className="text-xs text-slate-500">Mandalam: {user.mandalam}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap justify-end">
                                  {/* Cannot assign self */}
                                  {user.id !== currentUser.id && (
                                    <>
                                        {/* If user is ALREADY Master Admin, don't show Assign buttons */}
                                        {user.role !== Role.MASTER_ADMIN && (
                                            <>
                                                <button onClick={() => handleAssignAdmin(user, Role.MASTER_ADMIN)} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">Make All Access Admin</button>
                                                <button onClick={() => handleAssignAdmin(user, Role.MANDALAM_ADMIN)} className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50">Assign Mandalam Admin</button>
                                                <button onClick={() => handleAssignAdmin(user, Role.CUSTOM_ADMIN)} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200">Custom Admin</button>
                                            </>
                                        )}
                                        {/* If user HAS a role (not plain USER), show Revoke */}
                                        {user.role !== Role.USER && (
                                            <button onClick={() => handleAssignAdmin(user, Role.USER)} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100">Revoke Admin</button>
                                        )}
                                    </>
                                  )}
                              </div>
                          </div>
                      ))}
                      {filteredList.length === 0 && (
                          <div className="text-center py-8 text-slate-400">No users found matching search.</div>
                      )}
                  </div>
              </div>

              {/* Modals for Assignment */}
              {showMandalamModal && selectedUserForAdmin && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <div className="bg-white w-full max-w-md rounded-xl p-6">
                          <h3 className="text-lg font-bold mb-4">Assign Mandalam Admin</h3>
                          <p className="text-sm text-slate-500 mb-4">Select Mandalams for {selectedUserForAdmin.fullName}</p>
                          
                          <div className="grid grid-cols-2 gap-2 h-40 overflow-y-auto border border-slate-100 p-2 rounded-lg mb-4">
                                {MANDALAMS.map(m => (
                                    <label key={m} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={assignMandalamSel.includes(m as Mandalam)} 
                                            onChange={(e) => {
                                                if(e.target.checked) setAssignMandalamSel([...assignMandalamSel, m as Mandalam]);
                                                else setAssignMandalamSel(assignMandalamSel.filter(cm => cm !== m));
                                            }} 
                                            className="rounded text-primary focus:ring-0"
                                        /> 
                                        <span className="text-sm text-slate-700">{m}</span>
                                    </label>
                                ))}
                          </div>

                          <div className="flex gap-2 mt-4">
                              <button onClick={() => setShowMandalamModal(false)} className="flex-1 py-2 text-slate-600 font-bold bg-slate-100 rounded-lg">Cancel</button>
                              <button onClick={saveAdminAssignment} className="flex-1 py-2 bg-primary text-white font-bold rounded-lg">Assign</button>
                          </div>
                      </div>
                  </div>
              )}

              {showCustomModal && selectedUserForAdmin && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                          <h3 className="text-lg font-bold mb-4">Assign Custom Admin Permissions</h3>
                          <p className="text-sm text-slate-500 mb-4">Configure permissions for {selectedUserForAdmin.fullName}</p>
                          
                          <div className="grid grid-cols-2 gap-4">
                              {ADMIN_PERMISSIONS.map(perm => (
                                  <label key={perm.id} className="flex items-center gap-2 p-3 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50">
                                      <input 
                                          type="checkbox" 
                                          className="rounded text-primary"
                                          checked={customPerms.includes(perm.id)}
                                          onChange={(e) => {
                                              if (e.target.checked) setCustomPerms([...customPerms, perm.id]);
                                              else setCustomPerms(customPerms.filter(p => p !== perm.id));
                                          }}
                                      />
                                      <span className="text-sm font-medium">{perm.label}</span>
                                  </label>
                              ))}
                          </div>
                           <div className="mt-4">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Mandalam Access:</p>
                              <div className="grid grid-cols-2 gap-2 h-32 overflow-y-auto border border-slate-100 p-2 rounded-lg">
                                  {MANDALAMS.map(m => (
                                      <label key={m} className="flex items-center gap-2">
                                          <input 
                                              type="checkbox" 
                                              checked={customMandalams.includes(m as Mandalam)} 
                                              onChange={(e) => {
                                                  if(e.target.checked) setCustomMandalams([...customMandalams, m as Mandalam]);
                                                  else setCustomMandalams(customMandalams.filter(cm => cm !== m));
                                              }} 
                                          /> 
                                          <span className="text-xs">{m}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>

                          <div className="flex gap-2 mt-6">
                              <button onClick={() => setShowCustomModal(false)} className="flex-1 py-2 text-slate-600 font-bold bg-slate-100 rounded-lg">Cancel</button>
                              <button onClick={saveAdminAssignment} className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-lg">Assign Custom Admin</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- REG QUESTIONS TAB --- */}
      {activeTab === 'Reg Questions' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-900">Registration Questions</h3>
                      <button 
                          onClick={() => {
                              setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length + 1 });
                              setIsQuestionModalOpen(true);
                          }}
                          className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary-dark"
                      >
                          Add Question
                      </button>
                  </div>

                  <div className="space-y-3">
                      {questions.map((q) => (
                          <div key={q.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-50">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">{q.label}</span>
                                      {q.required && <span className="text-red-500 text-xs font-bold">*</span>}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                      <span className="bg-slate-200 px-1.5 py-0.5 rounded">{q.type}</span>
                                      <span>Order: {q.order}</span>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => {
                                          setQuestionForm(q);
                                          setIsQuestionModalOpen(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  >
                                      <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                      onClick={async () => {
                                          if(confirm("Delete this question?")) {
                                              await StorageService.deleteQuestion(q.id);
                                              setQuestions(await StorageService.getQuestions());
                                          }
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Question Modal */}
              {isQuestionModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                      <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                          <h3 className="text-lg font-bold mb-4">{questionForm.id ? 'Edit Question' : 'Add Question'}</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase">Label</label>
                                  <input 
                                      className="w-full p-2 border border-slate-200 rounded-lg"
                                      value={questionForm.label || ''}
                                      onChange={e => setQuestionForm({...questionForm, label: e.target.value})}
                                  />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase">Type</label>
                                      <select 
                                          className="w-full p-2 border border-slate-200 rounded-lg"
                                          value={questionForm.type}
                                          onChange={e => setQuestionForm({...questionForm, type: e.target.value as FieldType})}
                                      >
                                          {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase">Order</label>
                                      <input 
                                          type="number"
                                          className="w-full p-2 border border-slate-200 rounded-lg"
                                          value={questionForm.order || 0}
                                          onChange={e => setQuestionForm({...questionForm, order: parseInt(e.target.value)})}
                                      />
                                  </div>
                              </div>
                              
                              {(questionForm.type === FieldType.DROPDOWN) && (
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase">Options (comma separated)</label>
                                      <input 
                                          className="w-full p-2 border border-slate-200 rounded-lg"
                                          value={questionForm.options?.join(',') || ''}
                                          onChange={e => setQuestionForm({...questionForm, options: e.target.value.split(',').map(s => s.trim())})}
                                      />
                                  </div>
                              )}

                              <label className="flex items-center gap-2">
                                  <input 
                                      type="checkbox"
                                      checked={questionForm.required || false}
                                      onChange={e => setQuestionForm({...questionForm, required: e.target.checked})}
                                  />
                                  <span className="text-sm">Required Field</span>
                              </label>
                          </div>
                          
                          <div className="flex gap-2 mt-6">
                              <button onClick={() => setIsQuestionModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-bold text-slate-600">Cancel</button>
                              <button 
                                  onClick={async () => {
                                      if (!questionForm.label) return alert("Label is required");
                                      const q: RegistrationQuestion = {
                                          id: questionForm.id || `q-${Date.now()}`,
                                          label: questionForm.label,
                                          type: questionForm.type || FieldType.TEXT,
                                          required: questionForm.required || false,
                                          order: questionForm.order || 0,
                                          options: questionForm.options,
                                          dependentOptions: questionForm.dependentOptions || {},
                                          placeholder: questionForm.placeholder || '',
                                          parentQuestionId: questionForm.parentQuestionId || ''
                                      };
                                      
                                      await StorageService.saveQuestion(q);
                                      setQuestions(await StorageService.getQuestions());
                                      setIsQuestionModalOpen(false);
                                  }}
                                  className="flex-1 py-2 bg-primary text-white rounded-lg font-bold"
                              >
                                  Save
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- IMPORT USERS TAB --- */}
      {activeTab === 'Import Users' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-6">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto">
                  <FileUp className="w-8 h-8" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-slate-900">Bulk Import Members</h3>
                  <p className="text-slate-500 mt-2">Upload a CSV file to add multiple members at once.</p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors relative">
                  <input 
                      type="file" 
                      accept=".csv" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                  />
                  {importFile ? (
                      <div className="text-emerald-600 font-bold flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8" />
                          {importFile.name}
                      </div>
                  ) : (
                      <div className="text-slate-400">
                          <p>Drag and drop or click to select</p>
                          <p className="text-xs mt-2">Supports .csv files only</p>
                      </div>
                  )}
              </div>

              <div className="flex gap-4 justify-center">
                  <button onClick={handleDownloadSample} className="px-6 py-2 text-slate-600 font-bold text-sm bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-2">
                      <Download className="w-4 h-4" /> Sample CSV
                  </button>
                  <button 
                      onClick={handleImportUsers}
                      disabled={!importFile || isImporting}
                      className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                      {isImporting ? 'Importing...' : 'Start Import'}
                  </button>
              </div>
          </div>
      )}

      {/* --- NEW YEAR TAB --- */}
      {activeTab === 'New Year' && (
          <div className="max-w-3xl mx-auto space-y-8">
              <div className="bg-white p-8 rounded-xl border border-red-100 shadow-sm">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                          <RotateCcw className="w-6 h-6" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-900">Start New Fiscal Year</h3>
                          <p className="text-slate-500 mt-2 leading-relaxed">
                              This action will archive the current year's data and reset the payment status of all members to "UNPAID". 
                              User accounts will remain active, but they will need to pay the membership fee for the new year.
                          </p>
                          <div className="mt-6 p-4 bg-red-50 text-red-800 rounded-lg text-sm font-medium border border-red-100">
                              Warning: This action cannot be undone. Please ensure you have exported all necessary data before proceeding.
                          </div>
                          
                          <div className="mt-8 flex items-center gap-4">
                              <div className="flex-1 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                  <p className="text-xs font-bold text-slate-400 uppercase">Current Year</p>
                                  <p className="text-3xl font-bold text-slate-900">{new Date().getFullYear()}</p>
                              </div>
                              <div className="text-slate-300">
                                  <ArrowUp className="w-6 h-6 rotate-90" />
                              </div>
                              <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                                  <p className="text-xs font-bold text-blue-400 uppercase">Next Year</p>
                                  <p className="text-3xl font-bold text-blue-600">{new Date().getFullYear() + 1}</p>
                              </div>
                          </div>

                          <button 
                              onClick={handleStartNewYear}
                              className="w-full mt-8 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                          >
                              Confirm & Start New Year
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- USERS OVERVIEW/DATA --- */}
      {(activeTab === 'Users Overview' || activeTab === 'Users Data') && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               {/* Filters */}
               <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-4">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                       <h3 className="font-bold text-slate-800">{activeTab}</h3>
                       <div className="flex gap-2">
                            <select className="text-xs p-2 rounded border border-slate-200" value={filterMandalam} onChange={e => setFilterMandalam(e.target.value)}>
                                <option>All Mandalams</option>
                                {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select className="text-xs p-2 rounded border border-slate-200" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option>All Status</option>
                                {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                       </div>
                   </div>
                   {renderSearchBar("Search by name, mobile, emirates ID, reg no...")}
               </div>
               
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                           <tr>
                               <th className="px-6 py-3">User</th>
                               <th className="px-6 py-3">Contact</th>
                               <th className="px-6 py-3">Location</th>
                               <th className="px-6 py-3">Status</th>
                               {activeTab === 'Users Data' && (
                                   <>
                                     <th className="px-6 py-3">Role</th>
                                     <th className="px-6 py-3">Emirates ID</th>
                                     <th className="px-6 py-3">Actions</th>
                                   </>
                               )}
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                           {filteredList
                              .filter(u => filterMandalam === 'All Mandalams' || u.mandalam === filterMandalam)
                              .filter(u => filterStatus === 'All Status' || u.status === filterStatus)
                              .map(user => (
                               <tr key={user.id} className="hover:bg-slate-50">
                                   <td className="px-6 py-4">
                                       <p className="font-bold text-slate-900">{user.fullName}</p>
                                       <p className="text-xs text-slate-500 font-mono">{user.membershipNo}</p>
                                   </td>
                                   <td className="px-6 py-4 text-slate-600">
                                       <p>{user.mobile}</p>
                                       <p className="text-xs opacity-70">{user.email}</p>
                                   </td>
                                   <td className="px-6 py-4">
                                       <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{user.mandalam}</span>
                                   </td>
                                   <td className="px-6 py-4">
                                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === UserStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                           {user.status}
                                       </span>
                                   </td>
                                   {activeTab === 'Users Data' && (
                                       <>
                                           <td className="px-6 py-4 text-xs font-bold uppercase text-slate-500">{user.role}</td>
                                           <td className="px-6 py-4 text-xs font-mono">{user.emiratesId}</td>
                                           <td className="px-6 py-4 flex gap-2">
                                                <button 
                                                   onClick={() => setViewingUser(user)}
                                                   className="text-slate-500 hover:text-primary p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                   title="View Full Details"
                                               >
                                                   <Eye className="w-4 h-4" />
                                               </button>
                                               <button 
                                                   onClick={() => handleEditUser(user)}
                                                   className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                   title="Edit User"
                                               >
                                                   <Edit className="w-4 h-4" />
                                               </button>
                                           </td>
                                       </>
                                   )}
                               </tr>
                           ))}
                           {filteredList.length === 0 && (
                               <tr><td colSpan={6} className="text-center py-8 text-slate-400">No users found.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
      )}

      {/* --- FULL DETAIL VIEW MODAL --- */}
      {viewingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{viewingUser.fullName}</h2>
                        <p className="text-slate-500 text-sm">Reg No: {viewingUser.membershipNo}</p>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Basic Info</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Mobile</p>
                                    <p className="text-sm font-medium">{viewingUser.mobile}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">WhatsApp</p>
                                    <p className="text-sm font-medium">{viewingUser.whatsapp || '-'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Email</p>
                                    <p className="text-sm font-medium break-all">{viewingUser.email || '-'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Emirates ID</p>
                                    <p className="text-sm font-medium">{viewingUser.emiratesId}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Membership & Location</h4>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Mandalam</p>
                                    <p className="text-sm font-medium">{viewingUser.mandalam}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Emirate</p>
                                    <p className="text-sm font-medium">{viewingUser.emirate}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Registration Year</p>
                                    <p className="text-sm font-medium">{viewingUser.registrationYear}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Status</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${viewingUser.status === UserStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {viewingUser.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                         <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Extended Details</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-3 bg-slate-50 rounded-lg">
                                 <p className="text-xs text-slate-400 font-bold uppercase">UAE Address</p>
                                 <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingUser.addressUAE || 'N/A'}</p>
                             </div>
                             <div className="p-3 bg-slate-50 rounded-lg">
                                 <p className="text-xs text-slate-400 font-bold uppercase">India Address</p>
                                 <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingUser.addressIndia || 'N/A'}</p>
                             </div>
                             <div className="p-3 bg-slate-50 rounded-lg">
                                 <p className="text-xs text-slate-400 font-bold uppercase">Nominee</p>
                                 <p className="text-sm font-medium">{viewingUser.nominee || 'N/A'} {viewingUser.relation ? `(${viewingUser.relation})` : ''}</p>
                             </div>
                         </div>
                    </div>

                    {viewingUser.customData && Object.keys(viewingUser.customData).length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Additional Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(viewingUser.customData).map(([key, val]) => {
                                    if(!val) return null;
                                    // Try to find label from questions if possible, otherwise use ID
                                    const qLabel = questions.find(q => q.id === key)?.label || key;
                                    return (
                                        <div key={key} className="p-3 bg-slate-50 rounded-lg">
                                            <p className="text-xs text-slate-400 font-bold uppercase">{qLabel}</p>
                                            <p className="text-sm font-medium">{val}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={() => setViewingUser(null)}
                        className="px-6 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-slate-900">Edit User Profile</h3>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                          <input 
                              className="w-full p-2 border border-slate-200 rounded-lg"
                              value={editUserForm.fullName || ''}
                              onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Mobile</label>
                              <input 
                                  className="w-full p-2 border border-slate-200 rounded-lg"
                                  value={editUserForm.mobile || ''}
                                  onChange={e => setEditUserForm({...editUserForm, mobile: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Emirates ID</label>
                              <input 
                                  className="w-full p-2 border border-slate-200 rounded-lg"
                                  value={editUserForm.emiratesId || ''}
                                  onChange={e => setEditUserForm({...editUserForm, emiratesId: e.target.value})}
                              />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                          <input 
                              className="w-full p-2 border border-slate-200 rounded-lg"
                              value={editUserForm.email || ''}
                              onChange={e => setEditUserForm({...editUserForm, email: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Mandalam</label>
                              <select 
                                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                  value={editUserForm.mandalam || ''}
                                  onChange={e => setEditUserForm({...editUserForm, mandalam: e.target.value as Mandalam})}
                              >
                                  {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Emirate</label>
                              <select 
                                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                  value={editUserForm.emirate || ''}
                                  onChange={e => setEditUserForm({...editUserForm, emirate: e.target.value as Emirate})}
                              >
                                  {EMIRATES.map(e => <option key={e} value={e}>{e}</option>)}
                              </select>
                          </div>
                      </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                              <select 
                                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                  value={editUserForm.status || ''}
                                  onChange={e => setEditUserForm({...editUserForm, status: e.target.value as UserStatus})}
                              >
                                  {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Payment Status</label>
                              <select 
                                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                  value={editUserForm.paymentStatus || ''}
                                  onChange={e => setEditUserForm({...editUserForm, paymentStatus: e.target.value as PaymentStatus})}
                              >
                                  {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button onClick={() => setEditingUser(null)} className="flex-1 py-2 text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Cancel</button>
                      <button onClick={saveEditedUser} className="flex-1 py-2 bg-primary text-white font-bold text-sm rounded-lg hover:bg-primary-dark">Save Changes</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
