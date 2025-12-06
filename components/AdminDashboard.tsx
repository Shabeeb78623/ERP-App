
import React, { useState, useEffect, useRef } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification, CardConfig, CardField } from '../types';
import { Search, Trash2, Eye, Plus, Calendar, Edit, X, Check, ArrowUp, ArrowDown, Wallet, LayoutTemplate, ImagePlus, RefreshCw, AlertCircle, FileUp, Move, Save, BarChart3, PieChart, ShieldAlert } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { MANDALAMS } from '../constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

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
  'Benefits', 'Notifications', 'Import Users', 'Admin Assign', 'Reg Questions', 'New Year', 'Card Mgmt'
];

const ADMIN_PERMISSIONS = [
  { id: 'view_users', label: 'Can View Users' },
  { id: 'edit_users', label: 'Can Edit Users' },
  { id: 'approve_users', label: 'Can Approve Users' },
  { id: 'manage_payments', label: 'Can Manage Payments' },
  { id: 'manage_benefits', label: 'Can Manage Benefits' },
  { id: 'send_notifications', label: 'Can Send Notifications' },
];

const SYSTEM_FIELD_MAPPING = [
    { value: 'NONE', label: 'None (Custom Data)' },
    { value: 'fullName', label: 'Full Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'password', label: 'Password' },
    { value: 'mobile', label: 'Mobile Number' },
    { value: 'emiratesId', label: 'Emirates ID' },
    { value: 'mandalam', label: 'Mandalam' },
    { value: 'emirate', label: 'Emirate' },
    { value: 'addressUAE', label: 'Address (UAE)' },
    { value: 'addressIndia', label: 'Address (India)' },
    { value: 'nominee', label: 'Nominee' },
    { value: 'relation', label: 'Relation to Nominee' },
    { value: 'recommendedBy', label: 'Recommended By' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, users, benefits, notifications, stats, onUpdateUser, onAddBenefit, onDeleteBenefit, onDeleteNotification, isLoading }) => {
  const [activeTab, setActiveTab] = useState('User Approvals');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showMandalamModal, setShowMandalamModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  
  // Data States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
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
      dependentOptions: {},
      options: [],
      systemMapping: 'NONE'
  });
  const [newOption, setNewOption] = useState('');
  
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

  // Card Management
  const [cardConfig, setCardConfig] = useState<CardConfig | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string>(''); 
  const cardImageRef = useRef<HTMLImageElement>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);

  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  useEffect(() => {
      const loadData = async () => {
          setYears(await StorageService.getYears());
          setQuestions(await StorageService.getQuestions());
          setCardConfig(await StorageService.getCardConfig());
      }
      loadData();
  }, [activeTab, isQuestionModalOpen]); // Reload questions when modal closes/opens to refresh state

  // --- FILTERED DATA LOGIC ---
  const getAuthorizedUsers = () => {
    // Hide master admin from lists
    const realUsers = users.filter(u => u.id !== 'admin-master');
    if (currentUser.role === Role.MASTER_ADMIN) return realUsers;
    if (currentUser.role === Role.MANDALAM_ADMIN) {
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
  const filteredList = authorizedUsers.filter(u => {
      const term = searchTerm.toLowerCase();
      return (
          u.fullName.toLowerCase().includes(term) ||
          u.membershipNo.toLowerCase().includes(term) ||
          u.mobile.includes(term) ||
          (u.email && u.email.toLowerCase().includes(term)) ||
          u.emiratesId.includes(term)
      );
  });
  
  // Benefits Filter
  const filteredBenefits = benefits.filter(b => authorizedUsers.some(u => u.id === b.userId) && (
      (b.userName && b.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.regNo && b.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  ));

  // --- HANDLERS ---

  const handleApproveUser = async (id: string) => {
      if(confirm("Are you sure you want to APPROVE this user?")) {
          await StorageService.updateUser(id, { 
              status: UserStatus.APPROVED, 
              approvedBy: currentUser.fullName, 
              approvedAt: new Date().toLocaleDateString() 
          });
      }
  };

  const handleRejectUser = async (id: string) => {
      if(confirm("Are you sure you want to REJECT this user?")) {
          await StorageService.updateUser(id, { status: UserStatus.REJECTED });
      }
  };

  const handleApprovePayment = async (id: string) => {
      if(confirm("Confirm payment received and approve user?")) {
          await StorageService.updateUser(id, { 
              paymentStatus: PaymentStatus.PAID, 
              status: UserStatus.APPROVED, 
              approvedBy: currentUser.fullName, 
              approvedAt: new Date().toLocaleDateString() 
          });
      }
  };

  const handleRejectPayment = async (id: string) => {
      if(confirm("Reject this payment? Status will remain Unpaid.")) {
          await StorageService.updateUser(id, { paymentStatus: PaymentStatus.UNPAID });
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
      if (!notifTitle || !notifMessage) return alert("Enter title and message");
      setSendingNotif(true);
      try {
          let recipients: string[] | undefined = undefined;
          if (notifTarget !== 'ALL') recipients = users.filter(u => u.mandalam === notifTarget).map(u => u.id);
          else if (currentUser.role === Role.MANDALAM_ADMIN) recipients = authorizedUsers.map(u => u.id);
          
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
          alert("Notification Sent!");
          setNotifTitle(''); setNotifMessage('');
      } catch (e) {
          alert("Error sending notification");
      } finally { 
          setSendingNotif(false); 
      }
  };

  const handleAssignAdmin = async (user: User, role: Role) => {
      if (role === Role.MANDALAM_ADMIN) { 
          setSelectedUserForAdmin(user); 
          setAssignMandalamSel(user.assignedMandalams || [user.mandalam]); 
          setShowMandalamModal(true); 
      } else if (role === Role.CUSTOM_ADMIN) { 
          setSelectedUserForAdmin(user); 
          setCustomPerms(user.permissions || []); 
          setCustomMandalams(user.assignedMandalams || []); 
          setShowCustomModal(true); 
      } else {
          // Master or Revoke
          const isRevoke = role === Role.USER;
          const actionName = isRevoke ? "Revoke Admin Rights" : "Grant All Access Admin";
          if(confirm(`${actionName} for ${user.fullName}?`)) {
              await StorageService.updateUser(user.id, { 
                  role: role, 
                  assignedMandalams: [], 
                  permissions: [] // Master admin implies full permissions implicitly
              });
              alert("User role updated successfully.");
          }
      }
  };

  const saveAdminAssignment = async () => {
      if (!selectedUserForAdmin) return;
      try {
        if (showMandalamModal) {
             await StorageService.updateUser(selectedUserForAdmin.id, { 
                 role: Role.MANDALAM_ADMIN, 
                 assignedMandalams: assignMandalamSel 
             });
        } else if (showCustomModal) {
             await StorageService.updateUser(selectedUserForAdmin.id, { 
                 role: Role.CUSTOM_ADMIN, 
                 permissions: customPerms, 
                 assignedMandalams: customMandalams 
             });
        }
        alert("Admin permissions updated successfully.");
      } catch (e) {
        alert("Failed to update permissions.");
      }
      setShowMandalamModal(false); 
      setShowCustomModal(false); 
      setSelectedUserForAdmin(null);
  };

  const handleImportUsers = async () => {
      if (!importFile) return;
      setIsImporting(true); setImportProgress(0);
      try {
          const text = await importFile.text();
          const lines = text.split('\n').filter(l => l.trim());
          const newUsers: User[] = [];
          for (let i = 1; i < lines.length; i++) {
               const cols = lines[i].split(',');
               if (cols.length > 2) {
                   newUsers.push({
                       id: `user-${Date.now()}-${i}`,
                       fullName: cols[0] || 'Unknown',
                       mobile: cols[2] || '',
                       whatsapp: cols[2] || '',
                       emiratesId: cols[1] || `784${Date.now()}${i}`,
                       mandalam: (cols[4] as Mandalam) || Mandalam.VATAKARA,
                       emirate: (cols[3] as Emirate) || Emirate.DUBAI,
                       status: UserStatus.APPROVED,
                       paymentStatus: PaymentStatus.UNPAID,
                       role: Role.USER,
                       registrationYear: new Date().getFullYear(),
                       membershipNo: await StorageService.generateNextMembershipNo(new Date().getFullYear()),
                       registrationDate: new Date().toLocaleDateString(),
                       password: cols[1] || 'password', // Fallback
                       photoUrl: '',
                       isImported: true
                   });
               }
          }
          await StorageService.addUsers(newUsers, setImportProgress);
          alert(`Successfully imported ${newUsers.length} users.`);
      } catch(e) { 
          alert("Error importing users. Please check CSV format."); 
          console.error(e);
      } finally { 
          setIsImporting(false); 
          setImportFile(null); 
      }
  };

  const handleStartNewYear = async () => {
      const year = new Date().getFullYear() + 1;
      if(!confirm(`Are you sure you want to start the fiscal year ${year}? This will reset payment status for all users.`)) return;
      try {
          await StorageService.createNewYear(year);
          // Reset all users to UNPAID
          const batchPromises = users
            .filter(u => u.role !== Role.MASTER_ADMIN)
            .map(u => StorageService.updateUser(u.id, { paymentStatus: PaymentStatus.UNPAID }));
          
          await Promise.all(batchPromises);
          alert("New Year initialized successfully.");
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  const saveEditUser = async () => {
      if (!editUserForm.id) return;
      await onUpdateUser(editUserForm.id, editUserForm);
      setShowEditUserModal(false);
      setEditUserForm({});
  };

  // --- CARD MANAGEMENT HANDLERS ---
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setIsUploadingTemplate(true);
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = reader.result as string;
              const img = new Image();
              img.onload = async () => {
                  const newConfig: CardConfig = {
                      templateImage: base64,
                      fields: cardConfig?.fields || [],
                      width: img.width,
                      height: img.height
                  };
                  await StorageService.saveCardConfig(newConfig);
                  setCardConfig(newConfig);
                  setIsUploadingTemplate(false);
              };
              img.src = base64;
          };
          reader.readAsDataURL(file);
      }
  };

  const addCardVariable = async () => {
      if (!cardConfig || !selectedVariable) return;
      
      let label = "Unknown";
      let key = selectedVariable;
      let sample = "Sample Text";

      if (key === 'membershipNo') {
          label = 'Registration No';
          sample = '20250001';
      } else if (key === 'registrationDate') {
          label = 'Joined Date';
          sample = '01/01/2025';
      } else {
          const q = questions.find(q => q.id === key);
          if (q) {
              label = q.label;
              key = (q.systemMapping && q.systemMapping !== 'NONE') ? q.systemMapping : q.id;
              sample = q.label;
          }
      }

      const newField: CardField = {
          id: `field-${Date.now()}`,
          label,
          key,
          x: 50,
          y: 50,
          fontSize: 14,
          color: '#000000',
          fontWeight: 'bold',
          sampleValue: sample
      };

      const updatedConfig = { ...cardConfig, fields: [...cardConfig.fields, newField] };
      setCardConfig(updatedConfig);
      await StorageService.saveCardConfig(updatedConfig);
      setSelectedVariable('');
  };

  const updateCardField = async (id: string, updates: Partial<CardField>) => {
      if (!cardConfig) return;
      const updatedConfig = { 
          ...cardConfig, 
          fields: cardConfig.fields.map(f => f.id === id ? { ...f, ...updates } : f) 
      };
      setCardConfig(updatedConfig);
      await StorageService.saveCardConfig(updatedConfig);
  };

  const deleteCardField = async (id: string) => {
      if (!cardConfig) return;
      const updatedConfig = { ...cardConfig, fields: cardConfig.fields.filter(f => f.id !== id) };
      setCardConfig(updatedConfig);
      await StorageService.saveCardConfig(updatedConfig);
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); e.preventDefault();
      setDraggedFieldId(id);
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
      if (!draggedFieldId || !cardImageRef.current || !cardConfig) return;
      const rect = cardImageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      let yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));
      
      setCardConfig({
          ...cardConfig,
          fields: cardConfig.fields.map(f => f.id === draggedFieldId ? { ...f, x: xPct, y: yPct } : f)
      });
  };

  const handleDragEnd = async () => {
      if (draggedFieldId && cardConfig) {
          setDraggedFieldId(null);
          await StorageService.saveCardConfig(cardConfig);
      }
  };


  // --- STATS CARD COMPONENT ---
  const StatCard = ({ label, value, colorClass }: { label: string, value: string | number, colorClass: string }) => (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-xs text-slate-500 uppercase font-medium mt-1">{label}</p>
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
          <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-slate-500">Year:</span>
               <select className="bg-white border border-slate-200 text-sm font-bold rounded px-2 py-1 outline-none">
                   <option>2025</option>
               </select>
          </div>
      </div>

      {/* --- STATS GRID (MATCHING SCREENSHOT) --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
           {/* Row 1 */}
           <StatCard label="Total" value={stats.total} colorClass="text-blue-600" />
           <StatCard label="New" value={stats.new} colorClass="text-green-600" />
           <StatCard label="Re-reg" value={stats.reReg} colorClass="text-orange-600" />
           <StatCard label="Pending" value={stats.pending} colorClass="text-orange-500" />
           <StatCard label="Approved" value={stats.approved} colorClass="text-emerald-600" />
           
           {/* Row 2 (Wrapping) */}
           <StatCard label="Rejected" value={stats.rejected} colorClass="text-red-600" />
           <StatCard label="Paid" value={stats.paid} colorClass="text-purple-600" />
           <StatCard label="Admins" value={stats.admins} colorClass="text-indigo-600" />
           <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 md:col-span-2">
                <p className="text-2xl font-bold text-emerald-600">AED {stats.collected}</p>
                <p className="text-xs text-slate-500 uppercase font-medium mt-1">Collected</p>
           </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex overflow-x-auto pb-2 gap-2 mt-2 no-scrollbar">
        {TABS.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 text-sm font-medium rounded transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 1. USER APPROVALS */}
      {activeTab === 'User Approvals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Pending Approvals</h3>
                 <div className="relative">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                     <input className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                 </div>
             </div>
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Details</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                 <tbody>
                     {filteredList.filter(u => u.status === UserStatus.PENDING).map(u => (
                         <tr key={u.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4"><div><p className="font-bold">{u.fullName}</p><p className="text-xs text-slate-500">{u.mobile}</p></div></td>
                             <td className="px-6 py-4 text-xs">
                                 <p>{u.mandalam}, {u.emirate}</p>
                                 <p className="text-slate-400">Reg: {u.registrationDate}</p>
                             </td>
                             <td className="px-6 py-4 text-right space-x-2">
                                 <button onClick={() => setViewingUser(u)} className="p-2 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Eye className="w-4 h-4" /></button>
                                 <button onClick={() => handleApproveUser(u.id)} className="px-3 py-1 bg-green-600 text-white rounded font-bold text-xs hover:bg-green-700">Approve</button>
                                 <button onClick={() => handleRejectUser(u.id)} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded font-bold text-xs hover:bg-red-50">Reject</button>
                             </td>
                         </tr>
                     ))}
                     {filteredList.filter(u => u.status === UserStatus.PENDING).length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No pending approvals</td></tr>}
                 </tbody>
             </table>
        </div>
      )}

      {/* 2. USERS DATA */}
      {activeTab === 'Users Data' && (
        <div className="space-y-4">
             <div className="flex gap-4 mb-4">
                 <div className="relative flex-1">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                     <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Search by Name, RegNo, Mobile..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                 </div>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                             <tr>
                                 <th className="px-6 py-3">Reg No</th>
                                 <th className="px-6 py-3">Name</th>
                                 <th className="px-6 py-3">Mobile</th>
                                 <th className="px-6 py-3">Mandalam</th>
                                 <th className="px-6 py-3">Status</th>
                                 <th className="px-6 py-3 text-right">Action</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                             {filteredList.map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50">
                                     <td className="px-6 py-4 font-mono text-xs">{u.membershipNo}</td>
                                     <td className="px-6 py-4 font-bold">{u.fullName}</td>
                                     <td className="px-6 py-4 text-xs">{u.mobile}</td>
                                     <td className="px-6 py-4 text-xs">{u.mandalam}</td>
                                     <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status===UserStatus.APPROVED?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{u.status}</span></td>
                                     <td className="px-6 py-4 text-right space-x-2">
                                         <button onClick={() => setViewingUser(u)} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Eye className="w-4 h-4"/></button>
                                         <button onClick={() => { setEditUserForm(u); setShowEditUserModal(true); }} className="p-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"><Edit className="w-4 h-4"/></button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
        </div>
      )}

      {/* 3. USERS OVERVIEW */}
      {activeTab === 'Users Overview' && (
          <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Membership by Mandalam</h4>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={MANDALAMS.map(m => ({ name: m, value: users.filter(u => u.mandalam === m).length }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                                    <YAxis fontSize={12} allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#004e92" radius={[4, 4, 0, 0]} />
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4"/> Status Distribution</h4>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                      data={[
                                          { name: 'Approved', value: stats.approved, color: '#059669' },
                                          { name: 'Pending', value: stats.pending, color: '#f59e0b' },
                                          { name: 'Rejected', value: stats.rejected, color: '#dc2626' }
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                    >
                                        <Cell fill="#059669" />
                                        <Cell fill="#f59e0b" />
                                        <Cell fill="#dc2626" />
                                    </Pie>
                                    <Tooltip />
                                </RePieChart>
                             </ResponsiveContainer>
                        </div>
                   </div>
              </div>
          </div>
      )}

      {/* 4. PAYMENT MGMT */}
      {activeTab === 'Payment Mgmt' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b flex justify-between">
                   <h3 className="font-bold">Payment Management</h3>
                   <input className="px-3 py-1 rounded border text-sm" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
               </div>
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                       <tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Action</th></tr>
                   </thead>
                   <tbody>
                       {filteredList.filter(u => u.paymentStatus !== PaymentStatus.PAID).map(u => (
                           <tr key={u.id} className="border-b">
                               <td className="px-6 py-4">
                                   <p className="font-bold">{u.fullName}</p>
                                   <p className="text-xs text-slate-500">{u.membershipNo}</p>
                               </td>
                               <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded text-xs font-bold ${u.paymentStatus==='PENDING'?'bg-orange-100 text-orange-700':'bg-red-50 text-red-500'}`}>{u.paymentStatus}</span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                   <button onClick={() => setViewingUser(u)} className="mr-2 p-1 bg-slate-100 rounded"><Eye className="w-4 h-4"/></button>
                                   <button onClick={() => handleApprovePayment(u.id)} className="px-3 py-1 bg-primary text-white text-xs rounded font-bold">Mark Paid</button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
          </div>
      )}

      {/* 5. PAYMENT SUBS (SUBMISSIONS) */}
      {activeTab === 'Payment Subs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b"><h3 className="font-bold">Payment Proof Submissions</h3></div>
               <div className="divide-y">
                   {filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING || u.paymentStatus === PaymentStatus.PAID).map(u => (
                       <div key={u.id} className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-slate-50">
                           <div className="mb-2 md:mb-0">
                               <div className="flex items-center gap-2">
                                   <p className="font-bold">{u.fullName}</p>
                                   <span className="text-xs font-mono bg-slate-100 px-1 rounded">{u.membershipNo}</span>
                                   {u.paymentStatus === PaymentStatus.PAID && <Check className="w-4 h-4 text-green-500"/>}
                               </div>
                               <p className="text-sm mt-1 text-slate-600 bg-blue-50 p-2 rounded border border-blue-100">"{u.paymentRemarks}"</p>
                           </div>
                           <div className="flex items-center gap-2">
                               <button onClick={() => setViewingUser(u)} className="p-2 bg-slate-100 rounded hover:bg-slate-200"><Eye className="w-4 h-4"/></button>
                               {u.paymentStatus !== PaymentStatus.PAID && (
                                   <>
                                       <button onClick={() => handleApprovePayment(u.id)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700">Approve</button>
                                       <button onClick={() => handleRejectPayment(u.id)} className="px-4 py-2 bg-red-100 text-red-600 text-sm font-bold rounded hover:bg-red-200">Reject</button>
                                   </>
                               )}
                           </div>
                       </div>
                   ))}
                   {filteredList.filter(u => u.paymentStatus === PaymentStatus.PENDING || u.paymentStatus === PaymentStatus.PAID).length === 0 && (
                       <div className="p-8 text-center text-slate-400">No payment submissions found.</div>
                   )}
               </div>
          </div>
      )}

      {/* 6. BENEFITS */}
      {activeTab === 'Benefits' && (
          <div className="space-y-4">
              <div className="flex justify-between">
                   <div className="relative">
                       <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400"/>
                       <input className="pl-9 pr-4 py-2 border rounded-lg text-sm" placeholder="Search Benefit..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                   </div>
                   <button onClick={() => setIsBenefitModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm">
                       <Plus className="w-4 h-4"/> Add Benefit
                   </button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">User</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3 text-right">Action</th></tr></thead>
                      <tbody>
                          {filteredBenefits.map(b => (
                              <tr key={b.id} className="border-b hover:bg-slate-50">
                                  <td className="px-6 py-4"><div><p className="font-bold">{b.userName}</p><p className="text-xs text-slate-500">{b.regNo}</p></div></td>
                                  <td className="px-6 py-4">{b.type}</td>
                                  <td className="px-6 py-4 font-mono font-bold">AED {b.amount}</td>
                                  <td className="px-6 py-4 text-xs">{b.date}</td>
                                  <td className="px-6 py-4 text-right"><button onClick={()=>onDeleteBenefit(b.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* 7. NOTIFICATIONS */}
      {activeTab === 'Notifications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800">Send Notification</h3>
                  <input className="w-full p-2 border rounded" placeholder="Title" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} />
                  <textarea className="w-full p-2 border rounded h-24" placeholder="Message..." value={notifMessage} onChange={e=>setNotifMessage(e.target.value)} />
                  <select className="w-full p-2 border rounded" value={notifTarget} onChange={e=>setNotifTarget(e.target.value)}>
                      <option value="ALL">All Members</option>
                      {MANDALAMS.map(m => <option key={m} value={m}>{m} Members</option>)}
                  </select>
                  <button onClick={handleSendNotification} disabled={sendingNotif} className="w-full py-2 bg-primary text-white rounded font-bold hover:bg-primary-dark">{sendingNotif?'Sending...':'Send'}</button>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-y-auto max-h-[500px]">
                   <h3 className="font-bold text-slate-800 mb-4">History</h3>
                   <div className="space-y-4">
                       {notifications.map(n => (
                           <div key={n.id} className="p-3 border rounded hover:bg-slate-50 flex justify-between">
                               <div><p className="font-bold text-sm">{n.title}</p><p className="text-xs text-slate-500">{n.date} • {n.targetAudience}</p></div>
                               <button onClick={()=>onDeleteNotification(n.id)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                           </div>
                       ))}
                   </div>
              </div>
          </div>
      )}

      {/* 8. IMPORT USERS */}
      {activeTab === 'Import Users' && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileUp className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Bulk Import Users</h3>
              <p className="text-slate-500 mb-6 text-sm">Upload a CSV file with columns: Name, EmiratesID, Mobile, Emirate, Mandalam.</p>
              
              <div className="mb-6 flex justify-center">
                  <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />
              </div>

              <button 
                onClick={handleImportUsers} 
                disabled={!importFile || isImporting}
                className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark disabled:opacity-50"
              >
                  {isImporting ? `Importing... ${importProgress}` : 'Start Import'}
              </button>
          </div>
      )}

      {/* 9. ADMIN ASSIGN */}
      {activeTab === 'Admin Assign' && (
          <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <input className="w-full p-2 border rounded" placeholder="Search user to assign role..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                  <div className="mt-4 max-h-[400px] overflow-y-auto space-y-2">
                      {filteredList.slice(0, 50).map(u => (
                          <div key={u.id} className="flex flex-col sm:flex-row justify-between items-center p-3 border rounded hover:bg-slate-50 gap-2">
                              <div><p className="font-bold text-sm">{u.fullName}</p><p className="text-xs text-slate-500">{u.role} • {u.membershipNo}</p></div>
                              <div className="flex gap-2 flex-wrap justify-end">
                                  {u.role === Role.USER && (
                                      <>
                                          <button onClick={()=>handleAssignAdmin(u, Role.MASTER_ADMIN)} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded font-bold shadow-sm hover:bg-purple-700">Make All Access Admin</button>
                                          <button onClick={()=>handleAssignAdmin(u, Role.MANDALAM_ADMIN)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded font-bold border border-blue-100 hover:bg-blue-100">Mandalam Admin</button>
                                          <button onClick={()=>handleAssignAdmin(u, Role.CUSTOM_ADMIN)} className="text-xs bg-slate-50 text-slate-700 px-3 py-1.5 rounded font-bold border border-slate-200 hover:bg-slate-100">Custom Admin</button>
                                      </>
                                  )}
                                  {u.role !== Role.USER && (
                                      <button onClick={()=>handleAssignAdmin(u, Role.USER)} className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded font-bold border border-red-100 hover:bg-red-100">Revoke Admin</button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 10. REG QUESTIONS */}
      {activeTab === 'Reg Questions' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200">
               <div className="flex justify-between items-center mb-6">
                   <div>
                       <h3 className="font-bold text-lg text-slate-900">Registration Questions</h3>
                       <p className="text-slate-500 text-sm">Manage the questions shown during member sign-up.</p>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={async () => { if(confirm("Reset to default recommended questions? This will erase custom questions.")) { await StorageService.seedDefaultQuestions(); setQuestions(await StorageService.getQuestions()); } }} className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors">
                           <RefreshCw className="w-3 h-3"/> Reset Defaults
                       </button>
                       <button onClick={() => { setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length + 1, options: [], systemMapping: 'NONE' }); setIsQuestionModalOpen(true); }} className="flex items-center gap-2 text-xs bg-primary text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-primary-dark transition-colors">
                           <Plus className="w-3 h-3"/> Add Question
                       </button>
                   </div>
               </div>
               
               <div className="space-y-3">
                   {questions.map((q, idx) => (
                       <div key={q.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:bg-slate-50 transition-colors bg-white shadow-sm">
                           <div className="flex items-center gap-4">
                               <span className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{idx + 1}</span>
                               <div>
                                   <p className="font-bold text-slate-800 text-sm">{q.label} {q.required && <span className="text-red-500">*</span>}</p>
                                   <div className="flex gap-2 mt-1">
                                       <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{q.type}</span>
                                       {q.systemMapping !== 'NONE' && <span className="text-[10px] uppercase font-bold tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded">Mapped: {q.systemMapping}</span>}
                                   </div>
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => { setQuestionForm(q); setIsQuestionModalOpen(true); }} className="p-2 text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                               <button onClick={async () => { if(confirm("Delete this question permanently?")) { await StorageService.deleteQuestion(q.id); setQuestions(await StorageService.getQuestions()); } }} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {/* 11. NEW YEAR */}
      {activeTab === 'New Year' && (
          <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                     <Calendar className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Fiscal Year Management</h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">Start a new financial year to archive current records and reset all member payment statuses to <span className="font-bold text-red-500">Unpaid</span>.</p>
                  <button onClick={handleStartNewYear} className="w-full px-6 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                      Start New Fiscal Year
                  </button>
              </div>
          </div>
      )}

      {/* 12. CARD MGMT (Kept from previous update) */}
      {activeTab === 'Card Mgmt' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                              <LayoutTemplate className="w-5 h-5 text-primary" />
                              ID Card Designer
                          </h3>
                          <p className="text-slate-500 text-sm mt-1">Upload a background and drag variables to position them.</p>
                      </div>
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg cursor-pointer hover:bg-slate-800 transition-colors text-sm">
                          <ImagePlus className="w-4 h-4" />
                          {isUploadingTemplate ? 'Uploading...' : 'Upload Template'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} disabled={isUploadingTemplate} />
                      </label>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-slate-100 rounded-xl p-4 border border-slate-200 flex items-center justify-center min-h-[400px] select-none">
                          {cardConfig?.templateImage ? (
                              <div 
                                className="relative shadow-2xl inline-block"
                                onMouseMove={handleContainerMouseMove}
                                onMouseUp={handleDragEnd}
                                onMouseLeave={handleDragEnd}
                              >
                                  <img 
                                      ref={cardImageRef}
                                      src={cardConfig.templateImage} 
                                      alt="Card Template" 
                                      className="max-w-full h-auto rounded-lg pointer-events-none" 
                                  />
                                  {cardConfig.fields.map(field => (
                                      <div 
                                        key={field.id}
                                        onMouseDown={(e) => handleDragStart(e, field.id)}
                                        style={{ 
                                            position: 'absolute', 
                                            left: `${field.x}%`, 
                                            top: `${field.y}%`, 
                                            transform: 'translate(-50%, -50%)',
                                            color: field.color,
                                            fontSize: `${field.fontSize}px`,
                                            fontWeight: field.fontWeight,
                                            whiteSpace: 'nowrap',
                                            cursor: 'move',
                                            border: draggedFieldId === field.id ? '1px dashed blue' : '1px dashed transparent',
                                            padding: '2px',
                                            zIndex: 10
                                        }}
                                        className="hover:border-slate-400 hover:bg-white/20 transition-colors"
                                      >
                                          {field.sampleValue}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-center text-slate-400">
                                  <LayoutTemplate className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                  <p>No template uploaded.</p>
                              </div>
                          )}
                      </div>

                      <div className="space-y-6">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <h4 className="font-bold text-slate-800 text-sm mb-3">Add Variable</h4>
                              <div className="flex gap-2">
                                  <select 
                                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none"
                                      value={selectedVariable}
                                      onChange={(e) => setSelectedVariable(e.target.value)}
                                  >
                                      <option value="">-- Select Variable --</option>
                                      <option value="membershipNo">Registration No (ID)</option>
                                      <option value="registrationDate">Joined Date</option>
                                      <optgroup label="Registration Questions">
                                          {questions.map(q => (
                                              <option key={q.id} value={q.id}>{q.label}</option>
                                          ))}
                                      </optgroup>
                                  </select>
                                  <button 
                                      onClick={addCardVariable}
                                      disabled={!selectedVariable || !cardConfig}
                                      className="px-3 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-50"
                                  >
                                      Add
                                  </button>
                              </div>
                          </div>
                          {/* List existing variables */}
                           <div className="space-y-3 max-h-[400px] overflow-y-auto">
                              {cardConfig?.fields.map(field => (
                                  <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200">
                                      <div className="flex justify-between items-center mb-1">
                                           <span className="font-bold text-xs">{field.label}</span>
                                           <button onClick={() => deleteCardField(field.id)} className="text-red-400"><X className="w-3 h-3"/></button>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                           <input type="number" className="w-full text-xs border rounded" value={field.fontSize} onChange={(e) => updateCardField(field.id, { fontSize: Number(e.target.value) })} />
                                           <input type="color" className="w-full h-5 border rounded p-0" value={field.color} onChange={(e) => updateCardField(field.id, { color: e.target.value })} />
                                      </div>
                                  </div>
                              ))}
                           </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Benefit Modal */}
      {isBenefitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Add Benefit Record</h3>
                  <div className="space-y-3">
                      <select className="w-full p-2 border rounded" value={benefitForm.userId} onChange={e=>setBenefitForm({...benefitForm, userId: e.target.value})}>
                          <option value="">Select User...</option>
                          {authorizedUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.membershipNo})</option>)}
                      </select>
                      <select className="w-full p-2 border rounded" value={benefitForm.type} onChange={e=>setBenefitForm({...benefitForm, type: e.target.value as BenefitType})}>
                          {Object.values(BenefitType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input className="w-full p-2 border rounded" type="number" placeholder="Amount (AED)" value={benefitForm.amount} onChange={e=>setBenefitForm({...benefitForm, amount: e.target.value})} />
                      <input className="w-full p-2 border rounded" placeholder="Remarks" value={benefitForm.remarks} onChange={e=>setBenefitForm({...benefitForm, remarks: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={()=>setIsBenefitModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={handleAddBenefitSubmit} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Mandalam/Custom Admin Modal */}
      {(showMandalamModal || showCustomModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-md rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Assign Admin Permissions</h3>
                  {showMandalamModal && (
                      <div className="space-y-2">
                          <p className="text-sm font-bold">Select Mandalams:</p>
                          {MANDALAMS.map(m => (
                              <label key={m} className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                                  <input type="checkbox" checked={assignMandalamSel.includes(m as Mandalam)} onChange={e => {
                                      if (e.target.checked) setAssignMandalamSel([...assignMandalamSel, m as Mandalam]);
                                      else setAssignMandalamSel(assignMandalamSel.filter(x => x !== m));
                                  }} />
                                  <span className="text-sm">{m}</span>
                              </label>
                          ))}
                      </div>
                  )}
                  {showCustomModal && (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto">
                          <div>
                              <p className="text-sm font-bold mb-2">Permissions:</p>
                              {ADMIN_PERMISSIONS.map(p => (
                                  <label key={p.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer mb-2">
                                      <input type="checkbox" checked={customPerms.includes(p.id)} onChange={e => {
                                          if (e.target.checked) setCustomPerms([...customPerms, p.id]);
                                          else setCustomPerms(customPerms.filter(x => x !== p.id));
                                      }} />
                                      <span className="text-sm">{p.label}</span>
                                  </label>
                              ))}
                          </div>
                          <div>
                              <p className="text-sm font-bold mb-2">Access Scope (Mandalams):</p>
                              {MANDALAMS.map(m => (
                                  <label key={m} className="flex items-center gap-2 p-2 border rounded cursor-pointer mb-1">
                                      <input type="checkbox" checked={customMandalams.includes(m as Mandalam)} onChange={e => {
                                          if (e.target.checked) setCustomMandalams([...customMandalams, m as Mandalam]);
                                          else setCustomMandalams(customMandalams.filter(x => x !== m));
                                      }} />
                                      <span className="text-sm">{m}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  )}
                  <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => { setShowMandalamModal(false); setShowCustomModal(false); }} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={saveAdminAssignment} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
               <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                   <h3 className="font-bold text-lg mb-4">Edit User</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input className="border p-2 rounded" placeholder="Full Name" value={editUserForm.fullName || ''} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} />
                       <input className="border p-2 rounded" placeholder="Mobile" value={editUserForm.mobile || ''} onChange={e => setEditUserForm({...editUserForm, mobile: e.target.value})} />
                       <input className="border p-2 rounded" placeholder="Email" value={editUserForm.email || ''} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} />
                       <input className="border p-2 rounded" placeholder="Password" value={editUserForm.password || ''} onChange={e => setEditUserForm({...editUserForm, password: e.target.value})} />
                       <select className="border p-2 rounded" value={editUserForm.mandalam} onChange={e => setEditUserForm({...editUserForm, mandalam: e.target.value as Mandalam})}>
                           {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                       <select className="border p-2 rounded" value={editUserForm.status} onChange={e => setEditUserForm({...editUserForm, status: e.target.value as UserStatus})}>
                           {Object.values(UserStatus).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                       <select className="border p-2 rounded" value={editUserForm.paymentStatus} onChange={e => setEditUserForm({...editUserForm, paymentStatus: e.target.value as PaymentStatus})}>
                           {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                   </div>
                   <div className="flex justify-end gap-2 mt-6">
                       <button onClick={() => setShowEditUserModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
                       <button onClick={saveEditUser} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                   </div>
               </div>
          </div>
      )}

      {/* Question Modal */}
      {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
                  <h3 className="font-bold text-lg text-slate-900 border-b pb-2">
                      {questionForm.id ? 'Edit Question' : 'Add New Question'}
                  </h3>
                  
                  <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Question Label</label>
                      <input className="w-full border p-2 rounded text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="e.g. What is your profession?" value={questionForm.label || ''} onChange={e => setQuestionForm({...questionForm, label: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">System Field Map</label>
                          <select className="w-full border p-2 rounded text-sm bg-slate-50" value={questionForm.systemMapping || 'NONE'} onChange={e => setQuestionForm({...questionForm, systemMapping: e.target.value as any})}>
                              {SYSTEM_FIELD_MAPPING.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                          <p className="text-[10px] text-slate-400 mt-1">Link to core user profile data</p>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Input Type</label>
                          <select className="w-full border p-2 rounded text-sm bg-slate-50" value={questionForm.type} onChange={e => setQuestionForm({...questionForm, type: e.target.value as FieldType})}>
                              {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                  </div>

                  <div>
                       <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={questionForm.required} onChange={e => setQuestionForm({...questionForm, required: e.target.checked})} />
                           <span className="text-sm font-bold text-slate-700">Required Field</span>
                       </label>
                  </div>

                  {(questionForm.type === FieldType.DROPDOWN || questionForm.type === FieldType.DEPENDENT_DROPDOWN) && (
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                           <p className="text-xs font-bold mb-2 uppercase text-slate-500">Dropdown Options</p>
                           <div className="flex gap-2 mb-3">
                               <input className="flex-1 border p-2 text-sm rounded outline-none" value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Type new option..." onKeyDown={e => {
                                   if (e.key === 'Enter' && newOption) {
                                       setQuestionForm({...questionForm, options: [...(questionForm.options||[]), newOption]}); setNewOption('');
                                   }
                               }} />
                               <button onClick={() => { if(newOption) { setQuestionForm({...questionForm, options: [...(questionForm.options||[]), newOption]}); setNewOption(''); } }} className="px-4 bg-primary text-white rounded font-bold text-xs hover:bg-primary-dark">Add</button>
                           </div>
                           <div className="flex flex-wrap gap-2">
                               {questionForm.options?.map(o => (
                                   <span key={o} className="bg-white px-3 py-1 rounded-full border shadow-sm text-xs flex items-center gap-2 text-slate-700">
                                       {o} <button onClick={() => setQuestionForm({...questionForm, options: questionForm.options?.filter(x => x !== o)})}><X className="w-3 h-3 text-red-500 hover:text-red-700"/></button>
                                   </span>
                               ))}
                               {(!questionForm.options || questionForm.options.length === 0) && <p className="text-xs text-slate-400 italic">No options added yet.</p>}
                           </div>
                       </div>
                  )}

                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                      <button onClick={() => setIsQuestionModalOpen(false)} className="px-5 py-2.5 bg-slate-100 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                      <button onClick={async () => { 
                          if(questionForm.label) { 
                              await StorageService.saveQuestion({ ...questionForm, id: questionForm.id || `q_${Date.now()}` } as RegistrationQuestion); 
                              setQuestions(await StorageService.getQuestions()); 
                              setIsQuestionModalOpen(false); 
                          } else {
                              alert("Label is required");
                          }
                      }} className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">Save Question</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* View User Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl">
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                    <div>
                        <h3 className="font-bold text-xl text-slate-900">{viewingUser.fullName}</h3>
                        <p className="text-slate-500 text-sm">{viewingUser.membershipNo}</p>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500"/></button>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm max-h-[60vh] overflow-y-auto pr-2">
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Mobile</p><p className="font-medium">{viewingUser.mobile}</p></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Emirates ID</p><p className="font-medium">{viewingUser.emiratesId}</p></div>
                    <div><p className="text-xs font-bold text-slate-400 uppercase">Mandalam</p><p className="font-medium">{viewingUser.mandalam}</p></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                        <span className={`px-2 py-0.5 text-xs rounded font-bold ${viewingUser.status===UserStatus.APPROVED?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{viewingUser.status}</span>
                    </div>
                    <div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase">Address (UAE)</p><p className="font-medium text-slate-700">{viewingUser.addressUAE || '-'}</p></div>
                    
                    {/* Dynamic Fields */}
                    {viewingUser.customData && Object.entries(viewingUser.customData).map(([k,v]) => {
                         const q = questions.find(q=>q.id===k);
                         if(!q) return null;
                         return (
                             <div key={k} className="col-span-2 border-t border-dashed border-slate-100 pt-3">
                                 <p className="text-xs font-bold text-slate-400 uppercase">{q.label}</p>
                                 <p className="font-medium text-slate-700 break-words">{String(v)}</p>
                             </div>
                         )
                    })}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
