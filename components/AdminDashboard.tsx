
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig } from '../types';
import { Search, Upload, Trash2, Eye, Plus, Shield, Calendar, UserPlus, Edit, Save, X, Filter, Check } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS, EMIRATES } from '../constants';

interface AdminDashboardProps {
  users: User[];
  benefits: BenefitRecord[];
  stats: DashboardStats;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onAddBenefit: (benefit: BenefitRecord) => void;
  onDeleteBenefit: (id: string) => void;
}

const TABS = [
  'User Approvals', 'Users Overview', 'Users Data', 'Payment Mgmt', 'Payment Subs', 
  'Benefits', 'Notifications', 'Import Users', 'Admin Assign', 'Reg Questions', 'New Year'
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, benefits, stats, onUpdateUser, onAddBenefit, onDeleteBenefit }) => {
  const [activeTab, setActiveTab] = useState('Users Overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [years, setYears] = useState<YearConfig[]>([]);
  const [benefitForm, setBenefitForm] = useState({
      userId: '',
      type: BenefitType.HOSPITAL,
      amount: '',
      remarks: ''
  });

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  // Overview Filters
  const [filterMandalam, setFilterMandalam] = useState('All Mandalams');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterRole, setFilterRole] = useState('All Roles');
  const [filterPayment, setFilterPayment] = useState('All Payment');

  useEffect(() => {
      setYears(StorageService.getYears());
  }, []);

  const visibleUsers = users.filter(u => u.role !== Role.MASTER_ADMIN);

  const filterUsers = (list: User[], term: string) => {
      let filtered = list;
      
      // Text Search
      if (term) {
          const lowerTerm = term.toLowerCase();
          filtered = filtered.filter(u => 
            u.fullName.toLowerCase().includes(lowerTerm) ||
            u.membershipNo.toLowerCase().includes(lowerTerm) ||
            u.mobile.includes(lowerTerm) ||
            (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
            u.emiratesId.includes(lowerTerm)
          );
      }

      // Dropdown Filters (Only apply if active tab uses them)
      if (activeTab === 'Users Overview') {
          if (filterMandalam !== 'All Mandalams') filtered = filtered.filter(u => u.mandalam === filterMandalam);
          if (filterStatus !== 'All Status') filtered = filtered.filter(u => u.status === filterStatus);
          if (filterRole !== 'All Roles') filtered = filtered.filter(u => u.role === filterRole);
          if (filterPayment !== 'All Payment') filtered = filtered.filter(u => u.paymentStatus === filterPayment);
      }

      return filtered;
  };

  const handleAddBenefitSubmit = () => {
      if(!benefitForm.userId || !benefitForm.amount) return;
      const user = users.find(u => u.id === benefitForm.userId);
      
      const newBenefit: BenefitRecord = {
          id: `benefit-${Date.now()}`,
          userId: benefitForm.userId,
          userName: user?.fullName,
          regNo: user?.membershipNo,
          type: benefitForm.type,
          amount: Number(benefitForm.amount),
          remarks: benefitForm.remarks,
          date: new Date().toLocaleDateString()
      };

      onAddBenefit(newBenefit);
      setIsBenefitModalOpen(false);
      setBenefitForm({ userId: '', type: BenefitType.HOSPITAL, amount: '', remarks: '' });
  };

  const handleSendNotification = () => {
      if (!notifTitle || !notifMessage) {
          alert("Please enter title and message");
          return;
      }
      const recipients = notifTarget === 'ALL' ? undefined : visibleUsers.filter(u => u.mandalam === notifTarget).map(u => u.id);

      StorageService.addNotification({
          id: `notif-${Date.now()}`,
          title: notifTitle,
          message: notifMessage,
          date: new Date().toLocaleDateString(),
          read: false,
          type: 'BROADCAST',
          targetAudience: notifTarget === 'ALL' ? 'All Members' : `${notifTarget} Members`,
          recipients
      });

      alert("Notification sent successfully");
      setNotifTitle('');
      setNotifMessage('');
  };

  const handleImportCSV = () => {
      if (!importFile) return;
      setIsImporting(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
          setTimeout(() => {
            try {
                const text = e.target?.result as string;
                const rows = text.split(/\r?\n/).slice(1); 
                const currentYear = new Date().getFullYear();
                let currentSeq = StorageService.getNextSequence(currentYear);
                const newUsers: User[] = [];

                rows.forEach((row) => {
                    if (!row.trim()) return;
                    const cols = row.split(',');
                    if (cols.length >= 3) {
                         const fullName = cols[0]?.trim().replace(/^"|"$/g, '');
                         const mobile = cols[1]?.trim().replace(/^"|"$/g, '');
                         const emiratesId = cols[2]?.trim().replace(/^"|"$/g, '');
                         
                         if (fullName && mobile && emiratesId) {
                             const membershipNo = `${currentYear}${currentSeq.toString().padStart(4, '0')}`;
                             currentSeq++; 
                             
                             newUsers.push({
                                 id: `imported-${Date.now()}-${Math.random()}`,
                                 fullName,
                                 mobile,
                                 whatsapp: mobile,
                                 emiratesId,
                                 mandalam: Mandalam.BALUSHERI, 
                                 emirate: Emirate.DUBAI,
                                 status: UserStatus.APPROVED,
                                 paymentStatus: PaymentStatus.UNPAID,
                                 role: Role.USER,
                                 registrationYear: currentYear,
                                 photoUrl: '',
                                 membershipNo: membershipNo,
                                 registrationDate: new Date().toLocaleDateString(),
                                 password: emiratesId, 
                                 isImported: true 
                             });
                         }
                    }
                });

                const added = StorageService.addUsers(newUsers);
                alert(`Successfully imported ${added.length} users.`);
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Error parsing CSV.");
            } finally {
                setIsImporting(false);
                setImportFile(null);
            }
          }, 100);
      };
      reader.readAsText(importFile);
  };

  const handleCreateNewYear = () => {
      const maxYear = years.reduce((max, y) => Math.max(max, y.year), 0);
      const newYearVal = maxYear + 1;
      if (window.confirm(`Initialize Year ${newYearVal}?`)) {
          try {
              const updatedYears = StorageService.createNewYear(newYearVal);
              setYears(updatedYears);
          } catch(e: any) { alert(e.message); }
      }
  };

  const openEditModal = (user: User) => {
      setEditingUser(user);
      setEditForm({ ...user });
  };

  const saveEditedUser = () => {
      if (editingUser && editForm) {
          onUpdateUser(editingUser.id, editForm);
          setEditingUser(null);
          setEditForm({});
      }
  };

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
            { label: 'Total Users', value: stats.total, color: 'text-primary' },
            { label: 'New', value: stats.new, color: 'text-emerald-600' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-500' },
            { label: 'Paid', value: stats.paid, color: 'text-blue-600' },
            { label: 'Revenue', value: `AED ${stats.collected}`, color: 'text-slate-800' }
        ].map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.value}</h3>
            </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 whitespace-nowrap text-sm font-medium rounded-full transition-all ${
              activeTab === tab 
                ? 'bg-primary text-white shadow-md shadow-blue-900/20' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Panels */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[600px] p-6">
        
        {/* --- USERS OVERVIEW TAB --- */}
        {activeTab === 'Users Overview' && (
             <div className="space-y-6">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div>
                         <h3 className="text-lg font-bold text-slate-800">Users Overview</h3>
                         <p className="text-slate-500 text-sm">Brief summary of all registered members.</p>
                     </div>
                 </div>
                 
                 {/* Filters */}
                 <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name, reg no, email..." 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm" value={filterMandalam} onChange={e => setFilterMandalam(e.target.value)}>
                        <option>All Mandalams</option>
                        {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option>All Status</option>
                        {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                        <option>All Roles</option>
                        {Object.values(Role).filter(r => r !== Role.MASTER_ADMIN).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select className="p-2 border border-slate-200 rounded-lg text-sm" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                        <option>All Payment</option>
                        {Object.values(PaymentStatus).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                 </div>

                 <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase">
                            <tr>
                                <th className="px-4 py-3">Reg No</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Phone</th>
                                <th className="px-4 py-3">Emirates ID</th>
                                <th className="px-4 py-3">Mandalam</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filterUsers(visibleUsers, searchTerm).map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors whitespace-nowrap">
                                    <td className="px-4 py-3 font-mono text-slate-500">{user.membershipNo}</td>
                                    <td className="px-4 py-3 font-bold text-slate-900">{user.fullName}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.email || '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.mobile}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.emiratesId}</td>
                                    <td className="px-4 py-3 text-slate-600">{user.mandalam}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                            user.status === UserStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 
                                            user.status === UserStatus.REJECTED ? 'bg-red-50 text-red-600' : 
                                            'bg-amber-50 text-amber-600'
                                        }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-[10px] uppercase">{user.role.replace('_', ' ')}</td>
                                    <td className="px-4 py-3">
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            user.paymentStatus === PaymentStatus.PAID ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {user.paymentStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}

        {/* --- USERS DATA TAB (Detailed Edit) --- */}
        {activeTab === 'Users Data' && (
             <div className="space-y-4">
                 <div className="flex justify-between items-center">
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Users Data</h3>
                        <p className="text-slate-500 text-sm">Full profile management. View and edit all user details.</p>
                     </div>
                     <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search user to edit..." 
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                 </div>
                 <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Reg No</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Mandalam</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filterUsers(visibleUsers, searchTerm).map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{user.membershipNo}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900">{user.fullName}</td>
                                    <td className="px-6 py-4 text-slate-500">
                                        <div className="text-xs">{user.mobile}</div>
                                        <div className="text-xs opacity-70">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{user.mandalam}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                            user.status === UserStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 
                                            user.status === UserStatus.REJECTED ? 'bg-red-50 text-red-600' : 
                                            'bg-amber-50 text-amber-600'
                                        }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => openEditModal(user)}
                                            className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-colors"
                                        >
                                            <Edit className="w-3 h-3" /> View / Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}

        {/* --- OTHER EXISTING TABS --- */}
        {activeTab === 'User Approvals' && (
             <div className="space-y-4">
                 <h3 className="text-lg font-bold text-slate-800">Pending Approvals</h3>
                 {visibleUsers.filter(u => u.status === UserStatus.PENDING).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleUsers.filter(u => u.status === UserStatus.PENDING).map(user => (
                            <div key={user.id} className="border border-slate-100 rounded-xl p-5 flex justify-between items-center hover:shadow-md transition-shadow">
                                <div>
                                    <h4 className="font-bold text-slate-900">{user.fullName}</h4>
                                    <p className="text-sm text-slate-500">{user.mandalam} • {user.mobile}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onUpdateUser(user.id, { status: UserStatus.REJECTED })} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100">Reject</button>
                                    <button onClick={() => onUpdateUser(user.id, { status: UserStatus.APPROVED })} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-200">Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                     <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">No pending approvals.</div>
                 )}
             </div>
        )}

        {activeTab === 'Payment Mgmt' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Payment Management</h3>
                    <input 
                        type="text" 
                        placeholder="Search by name, reg no, phone, or Emirates ID..." 
                        className="w-96 pl-4 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                 <div className="space-y-3">
                     {filterUsers(visibleUsers, searchTerm).map(user => (
                         <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                             <div>
                                 <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    {user.fullName} 
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        user.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {user.paymentStatus}
                                    </span>
                                 </h4>
                                 <p className="text-xs text-slate-500 mt-1">{user.email || user.mobile} • {user.membershipNo}</p>
                                 <p className="text-xs text-slate-500">{user.paymentStatus === PaymentStatus.PAID ? 'AED 60.00 Paid' : 'AED 0.00'}</p>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => onUpdateUser(user.id, { paymentStatus: user.paymentStatus === PaymentStatus.PAID ? PaymentStatus.UNPAID : PaymentStatus.PAID })} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50">
                                     {user.paymentStatus === PaymentStatus.PAID ? 'Mark Unpaid' : 'Update Payment'}
                                 </button>
                             </div>
                         </div>
                     ))}
                     {filterUsers(visibleUsers, searchTerm).length === 0 && (
                         <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">No users found.</div>
                     )}
                 </div>
            </div>
        )}

        {activeTab === 'Payment Subs' && (
             <div className="space-y-4">
                 <h3 className="text-lg font-bold text-slate-800">Payment Submissions</h3>
                 <div className="space-y-3">
                     {visibleUsers.filter(u => u.paymentStatus === PaymentStatus.PENDING).map(user => (
                         <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border border-orange-100 bg-orange-50/50">
                             <div>
                                 <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                     {user.fullName}
                                     <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[10px]">approved</span>
                                 </h4>
                                 <p className="text-xs text-slate-500 font-mono mt-1">{user.email || user.mobile}</p>
                                 <p className="text-xs text-slate-500 mt-1">Submitted: Invalid Date</p>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => onUpdateUser(user.id, { paymentStatus: PaymentStatus.UNPAID })} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold">Reset Submission</button>
                             </div>
                         </div>
                     ))}
                     {visibleUsers.filter(u => u.paymentStatus === PaymentStatus.PENDING).length === 0 && (
                         <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">No pending approvals.</div>
                     )}
                 </div>
             </div>
        )}

        {activeTab === 'Import Users' && (
            <div className="max-w-xl mx-auto text-center py-12">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                    <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Bulk User Import</h3>
                <p className="text-slate-500 mb-8">Upload a CSV file (Name, Mobile, EmiratesID) to create accounts instantly.</p>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 mb-6 hover:border-primary transition-colors relative">
                    <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span className="text-sm font-medium text-slate-600">{importFile ? importFile.name : "Drop CSV file here"}</span>
                </div>
                <button onClick={handleImportCSV} disabled={!importFile || isImporting} className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-blue-900/10 disabled:opacity-50 transition-all">
                    {isImporting ? 'Processing...' : 'Start Import'}
                </button>
            </div>
        )}

        {activeTab === 'Benefits' && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-slate-800">Benefits History</h3>
                     <button onClick={() => setIsBenefitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-dark">
                         <Plus className="w-4 h-4" /> Add Record
                     </button>
                 </div>
                 <div className="overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-3">Member</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {benefits.map(b => (
                                <tr key={b.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900">{b.userName}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 bg-pink-50 text-pink-600 rounded text-xs font-bold uppercase">{b.type}</span></td>
                                    <td className="px-6 py-4 font-mono text-slate-700">AED {b.amount}</td>
                                    <td className="px-6 py-4 text-slate-500">{b.date}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onDeleteBenefit(b.id)} className="text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
        )}

        {activeTab === 'Admin Assign' && (
             <div className="space-y-6">
                 <div className="max-w-md">
                     <input 
                        className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-primary"
                        placeholder="Search users to assign role..."
                        value={adminSearchTerm}
                        onChange={(e) => setAdminSearchTerm(e.target.value)}
                     />
                 </div>
                 <div className="grid gap-3">
                     {filterUsers(visibleUsers, adminSearchTerm).slice(0, 8).map(u => (
                         <div key={u.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                             <div>
                                 <h4 className="font-bold text-slate-900">{u.fullName}</h4>
                                 <p className="text-xs text-slate-500">{u.role.replace('_', ' ')}</p>
                             </div>
                             <div className="flex gap-2">
                                 {u.role === Role.USER && (
                                     <button onClick={() => onUpdateUser(u.id, { role: Role.MANDALAM_ADMIN })} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200">Make Admin</button>
                                 )}
                                 {u.role !== Role.USER && (
                                     <button onClick={() => onUpdateUser(u.id, { role: Role.USER })} className="px-3 py-1.5 text-red-600 text-xs font-bold rounded hover:bg-red-50">Remove Access</button>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {activeTab === 'Notifications' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                     <h4 className="font-bold text-slate-800">Send Notification</h4>
                     <input type="text" className="w-full p-3 rounded-lg border border-slate-300 outline-none" placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} />
                     <textarea className="w-full p-3 rounded-lg border border-slate-300 outline-none h-24 resize-none" placeholder="Message" value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} />
                     <select className="w-full p-3 rounded-lg border border-slate-300 outline-none" value={notifTarget} onChange={(e) => setNotifTarget(e.target.value)}>
                         <option value="ALL">All Members</option>
                         {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                     <button onClick={handleSendNotification} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark">Send</button>
                 </div>
                 <div className="lg:col-span-2">
                     <h4 className="font-bold text-slate-800 mb-4">History</h4>
                     <div className="space-y-3">
                         {StorageService.getNotifications().filter(n => n.type === 'BROADCAST').map(n => (
                             <div key={n.id} className="p-4 border border-slate-100 rounded-xl">
                                 <div className="flex justify-between mb-1">
                                     <span className="font-bold text-slate-900">{n.title}</span>
                                     <span className="text-xs text-slate-500">{n.date}</span>
                                 </div>
                                 <p className="text-sm text-slate-600">{n.message}</p>
                                 <p className="text-xs text-primary mt-2 font-medium">Target: {n.targetAudience}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
        )}
        
        {activeTab === 'New Year' && (
            <div className="text-center py-12">
                 <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
                    <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Year Management</h3>
                <p className="text-slate-500 mb-8">Initialize the system for a new financial year.</p>
                
                <div className="mb-8">
                    <h4 className="text-sm font-bold uppercase text-slate-400 mb-4">Year History</h4>
                    <div className="flex flex-wrap justify-center gap-4">
                        {years.map(y => (
                            <div key={y.year} className={`px-6 py-3 rounded-xl border ${y.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                <div className="text-lg font-bold">{y.year}</div>
                                <div className="text-[10px] font-bold uppercase">{y.status}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={handleCreateNewYear} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg">
                    Initialize Year {years.reduce((max, y) => Math.max(max, y.year), 0) + 1}
                </button>
            </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* Benefit Modal */}
      {isBenefitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 space-y-6">
                  <h3 className="font-bold text-xl text-slate-900">Add Benefit</h3>
                  <div className="space-y-4">
                      <select className="w-full p-3 border border-slate-200 rounded-xl outline-none" value={benefitForm.userId} onChange={(e) => setBenefitForm({...benefitForm, userId: e.target.value})}>
                          <option value="">Select Member</option>
                          {visibleUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                      </select>
                      <div className="flex gap-4">
                          <select className="w-1/2 p-3 border border-slate-200 rounded-xl outline-none" value={benefitForm.type} onChange={(e) => setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}>
                              {Object.values(BenefitType).map(t => <option key={t}>{t}</option>)}
                          </select>
                          <input className="w-1/2 p-3 border border-slate-200 rounded-xl outline-none" type="number" placeholder="Amount" value={benefitForm.amount} onChange={(e) => setBenefitForm({...benefitForm, amount: e.target.value})} />
                      </div>
                      <textarea className="w-full p-3 border border-slate-200 rounded-xl outline-none h-24 resize-none" placeholder="Remarks" value={benefitForm.remarks} onChange={(e) => setBenefitForm({...benefitForm, remarks: e.target.value})}></textarea>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setIsBenefitModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                      <button onClick={handleAddBenefitSubmit} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-xl text-slate-900">Edit Member Profile</h3>
                        <p className="text-xs text-slate-500">{editingUser.membershipNo}</p>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="p-2 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="p-8 overflow-y-auto space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <label className="block text-xs font-bold text-slate-400 uppercase">Identity</label>
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Full Name" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Emirates ID" value={editForm.emiratesId || ''} onChange={e => setEditForm({...editForm, emiratesId: e.target.value})} />
                              <div className="grid grid-cols-2 gap-4">
                                 <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as UserStatus})}>
                                     {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                                 <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as Role})}>
                                     {Object.values(Role).filter(r => r !== Role.MASTER_ADMIN).map(r => <option key={r} value={r}>{r}</option>)}
                                 </select>
                              </div>
                          </div>
                          <div className="space-y-4">
                              <label className="block text-xs font-bold text-slate-400 uppercase">Contact</label>
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Mobile" value={editForm.mobile || ''} onChange={e => setEditForm({...editForm, mobile: e.target.value})} />
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                              <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="WhatsApp" value={editForm.whatsapp || ''} onChange={e => setEditForm({...editForm, whatsapp: e.target.value})} />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                              <label className="block text-xs font-bold text-slate-400 uppercase">Location</label>
                              <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.mandalam} onChange={e => setEditForm({...editForm, mandalam: e.target.value as Mandalam})}>
                                  {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.emirate} onChange={e => setEditForm({...editForm, emirate: e.target.value as Emirate})}>
                                  {EMIRATES.map(e => <option key={e} value={e}>{e}</option>)}
                              </select>
                           </div>
                           <div className="space-y-4">
                               <label className="block text-xs font-bold text-slate-400 uppercase">Family & Payment</label>
                               <input className="w-full p-3 border border-slate-200 rounded-lg text-sm" placeholder="Nominee" value={editForm.nominee || ''} onChange={e => setEditForm({...editForm, nominee: e.target.value})} />
                               <select className="w-full p-3 border border-slate-200 rounded-lg text-sm" value={editForm.paymentStatus} onChange={e => setEditForm({...editForm, paymentStatus: e.target.value as PaymentStatus})}>
                                     {Object.values(PaymentStatus).map(p => <option key={p} value={p}>{p}</option>)}
                               </select>
                           </div>
                      </div>

                      <div className="space-y-4">
                           <label className="block text-xs font-bold text-slate-400 uppercase">Addresses</label>
                           <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm h-20 resize-none" placeholder="Address UAE" value={editForm.addressUAE || ''} onChange={e => setEditForm({...editForm, addressUAE: e.target.value})}></textarea>
                           <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm h-20 resize-none" placeholder="Address India" value={editForm.addressIndia || ''} onChange={e => setEditForm({...editForm, addressIndia: e.target.value})}></textarea>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <button onClick={() => setEditingUser(null)} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-white">Cancel</button>
                      <button onClick={saveEditedUser} className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center gap-2">
                          <Save className="w-4 h-4" /> Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminDashboard;
