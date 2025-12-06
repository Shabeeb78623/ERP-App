
import React, { useState, useEffect } from 'react';
import { User, UserStatus, PaymentStatus, DashboardStats, Mandalam, BenefitRecord, BenefitType, Role, Emirate, YearConfig, RegistrationQuestion, FieldType, Notification } from '../types';
import { Search, Upload, Trash2, Eye, Plus, Shield, Calendar, UserPlus, Edit, Save, X, Filter, Check, ArrowUp, ArrowDown, CheckCircle2, XCircle, Wallet, Bell, LogOut, Send, ChevronDown, FileUp, RotateCcw, Download, UserCog, MoreHorizontal, RefreshCw, AlertCircle } from 'lucide-react';
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
    { value: 'isKMCCMember', label: 'KMCC Member?' },
    { value: 'kmccNo', label: 'KMCC No' },
    { value: 'isPratheekshaMember', label: 'Pratheeksha Member?' },
    { value: 'pratheekshaNo', label: 'Pratheeksha No' },
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null); // For Full Detail View
  
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

  const handleApproveUser = async (id: string) => {
      if(confirm("Approve this user?")) {
          try {
              await StorageService.updateUser(id, { 
                  status: UserStatus.APPROVED,
                  approvedBy: currentUser.fullName,
                  approvedAt: new Date().toLocaleDateString()
              });
          } catch(e) {
              alert("Failed to approve user.");
              console.error(e);
          }
      }
  };

  const handleRejectUser = async (id: string) => {
      if(confirm("Reject this user?")) {
           try {
              await StorageService.updateUser(id, { status: UserStatus.REJECTED });
          } catch(e) {
              alert("Failed to reject user.");
              console.error(e);
          }
      }
  };

  const handleApprovePayment = async (id: string) => {
      if(confirm("Confirm payment received? This will also approve the user.")) {
          try {
              await StorageService.updateUser(id, { 
                  paymentStatus: PaymentStatus.PAID, 
                  status: UserStatus.APPROVED,
                  approvedBy: currentUser.fullName,
                  approvedAt: new Date().toLocaleDateString()
              });
              alert("Payment approved and user status updated.");
          } catch (error) {
              console.error(error);
              alert("Failed to approve payment. Please try again.");
          }
      }
  };

  const handleRejectPayment = async (id: string) => {
      if(confirm("Reject this payment?")) {
          try {
              await StorageService.updateUser(id, { paymentStatus: PaymentStatus.UNPAID });
              alert("Payment rejected.");
          } catch (error) {
              console.error(error);
              alert("Failed to reject payment.");
          }
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
          // Master Admin or Reset to User (Revoke)
          const action = role === Role.USER ? "Revoke Admin Rights" : "Grant All Access Admin";
          if(confirm(`${action} for ${user.fullName}?`)) {
              try {
                  await StorageService.updateUser(user.id, { role: role, assignedMandalams: [], permissions: [] });
                  alert(`Successfully executed: ${action}`);
              } catch (error) {
                  console.error(error);
                  alert("Failed to update admin role. Check console for details.");
              }
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
            setShowMandalamModal(false);
            alert("Mandalam Admin assigned successfully.");
        } else if (showCustomModal) {
            await StorageService.updateUser(selectedUserForAdmin.id, {
                role: Role.CUSTOM_ADMIN,
                permissions: customPerms,
                assignedMandalams: customMandalams 
            });
            setShowCustomModal(false);
            alert("Custom Admin assigned successfully.");
        }
      } catch (e) {
          console.error(e);
          alert("Failed to save assignment.");
      }
      setSelectedUserForAdmin(null);
  };
  
  const handleEditUser = (user: User) => {
      setEditingUser(user);
      setEditUserForm(user);
  };
  
  const saveEditedUser = async () => {
      if(editingUser && editUserForm) {
          try {
             await StorageService.updateUser(editingUser.id, editUserForm);
             alert("User updated successfully.");
             setEditingUser(null);
             setEditUserForm({});
          } catch(e) {
              console.error(e);
              alert("Failed to update user.");
          }
      }
  };

  const handleImportUsers = async () => {
      if (!importFile) return;
      setIsImporting(true);
      setImportProgress(0);
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
              // Try to fuzzy match mandalam or default to Balussery
              const rawMandalam = getValue('mandalam').toUpperCase();
              let mandalam = Mandalam.BALUSSERY;
              // Check if exact match exists in Enum
              if (Object.values(Mandalam).includes(rawMandalam as Mandalam)) {
                  mandalam = rawMandalam as Mandalam;
              }

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
                      password: eid, // Set default password as Emirates ID
                      approvedBy: currentUser.fullName, // Log importing admin as approver
                      approvedAt: new Date().toLocaleDateString()
                  });
              }
          }
          
          await StorageService.addUsers(newUsers, (count) => {
              setImportProgress(count);
          });
          alert(`Successfully imported ${newUsers.length} users.`);
          setImportFile(null);
      } catch (e) {
          console.error(e);
          alert("Import failed. Check file format.");
      } finally {
          setIsImporting(false);
          setImportProgress(0);
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
                 return StorageService.updateUser(u.id, { 
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

  // --- FULL USER DETAIL VIEW RENDERER ---
  const renderUserDetailModal = () => {
    if (!viewingUser) return null;

    const getLabel = (id: string) => {
        const q = questions.find(quest => quest.id === id);
        return q ? q.label : id;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-primary px-6 py-4 flex justify-between items-center text-white">
                     <div>
                         <h3 className="text-lg font-bold">{viewingUser.fullName}</h3>
                         <p className="text-xs opacity-80">{viewingUser.membershipNo}</p>
                     </div>
                     <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Core Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 uppercase">Status</p>
                            <span className={`text-sm font-bold ${viewingUser.status === UserStatus.APPROVED ? 'text-emerald-600' : 'text-amber-600'}`}>{viewingUser.status}</span>
                            {viewingUser.approvedBy && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Approved by: {viewingUser.approvedBy} <br/> on {viewingUser.approvedAt}
                                </p>
                            )}
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                             <p className="text-xs font-bold text-slate-500 uppercase">Payment</p>
                             <span className={`text-sm font-bold ${viewingUser.paymentStatus === PaymentStatus.PAID ? 'text-emerald-600' : 'text-amber-600'}`}>{viewingUser.paymentStatus}</span>
                        </div>
                         <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 uppercase">Mobile</p>
                            <p className="text-sm font-medium">{viewingUser.mobile}</p>
                        </div>
                         <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 uppercase">WhatsApp</p>
                            <p className="text-sm font-medium">{viewingUser.whatsapp}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 uppercase">Email</p>
                            <p className="text-sm font-medium">{viewingUser.email || '-'}</p>
                        </div>
                         <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-bold text-slate-500 uppercase">Emirates ID</p>
                            <p className="text-sm font-medium">{viewingUser.emiratesId}</p>
                        </div>
                    </div>
                    
                    {/* Location */}
                    <div className="p-4 border border-slate-100 rounded-xl">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-50 pb-2">Location</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs font-bold text-slate-500 uppercase">Mandalam</p><p className="text-sm">{viewingUser.mandalam}</p></div>
                            <div><p className="text-xs font-bold text-slate-500 uppercase">Emirate</p><p className="text-sm">{viewingUser.emirate}</p></div>
                             <div className="col-span-2"><p className="text-xs font-bold text-slate-500 uppercase">Address (UAE)</p><p className="text-sm">{viewingUser.addressUAE || '-'}</p></div>
                             <div className="col-span-2"><p className="text-xs font-bold text-slate-500 uppercase">Address (India)</p><p className="text-sm">{viewingUser.addressIndia || '-'}</p></div>
                         </div>
                    </div>

                    {/* Extended Info */}
                     <div className="p-4 border border-slate-100 rounded-xl">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-50 pb-2">Family & References</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs font-bold text-slate-500 uppercase">Nominee</p><p className="text-sm">{viewingUser.nominee || '-'}</p></div>
                            <div><p className="text-xs font-bold text-slate-500 uppercase">Relation</p><p className="text-sm">{viewingUser.relation || '-'}</p></div>
                            <div><p className="text-xs font-bold text-slate-500 uppercase">Recommended By</p><p className="text-sm">{viewingUser.recommendedBy || '-'}</p></div>
                         </div>
                    </div>

                    {/* Memberships */}
                    <div className="p-4 border border-slate-100 rounded-xl bg-blue-50/50">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-blue-100 pb-2">Other Memberships</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">KMCC</p>
                                <p className="text-sm font-medium">{viewingUser.isKMCCMember ? `Yes (${viewingUser.kmccNo || 'No No.'})` : 'No'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Pratheeksha</p>
                                <p className="text-sm font-medium">{viewingUser.isPratheekshaMember ? `Yes (${viewingUser.pratheekshaNo || 'No No.'})` : 'No'}</p>
                            </div>
                         </div>
                    </div>

                    {/* Custom Data */}
                    {viewingUser.customData && Object.keys(viewingUser.customData).length > 0 && (
                        <div className="p-4 border border-slate-100 rounded-xl">
                             <h4 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-50 pb-2">Additional Info</h4>
                             <div className="grid grid-cols-2 gap-4">
                                {Object.entries(viewingUser.customData).map(([key, val]) => {
                                     if(!val) return null;
                                     const label = getLabel(key);
                                     if (['email', 'mobile', 'emirates id', 'password'].includes(label.toLowerCase())) return null; 
                                     return (
                                         <div key={key}>
                                            <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
                                            <p className="text-sm text-slate-800">{String(val)}</p>
                                         </div>
                                     );
                                })}
                             </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button onClick={() => setViewingUser(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Close</button>
                </div>
            </div>
        </div>
    )
  };

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
                                 <button onClick={() => setViewingUser(user)} className="px-2 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg mr-2" title="View Details">
                                     <Eye className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => handleApproveUser(user.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow hover:bg-emerald-700 hover:scale-105 transition-all">
                                    Approve User
                                 </button>
                                 <button onClick={() => handleRejectUser(user.id)} className="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50">
                                    Reject
                                 </button>
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
                                 <div className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg max-w-md shadow-sm">
                                     <p className="text-xs font-bold text-amber-800 uppercase mb-1">Payment Remarks</p>
                                     <p className="text-sm text-slate-800 font-medium">"{user.paymentRemarks || 'No remarks provided'}"</p>
                                 </div>
                             </td>
                             <td className="px-6 py-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                     <button onClick={() => setViewingUser(user)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1" title="View User Profile">
                                         <Eye className="w-3 h-3" /> View
                                     </button>
                                     <button onClick={() => handleApprovePayment(user.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1">
                                         <Check className="w-3 h-3" /> Mark Paid
                                     </button>
                                     <button onClick={() => handleRejectPayment(user.id)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50">
                                         Reject
                                     </button>
                                 </div>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
      )}

      {/* --- PAYMENT SUBMISSIONS TAB (HISTORY & APPROVALS) --- */}
      {activeTab === 'Payment Subs' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-800 mb-2">Approved Payment History</h3>
                   {renderSearchBar("Search payment history...")}
               </div>
               <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                       <tr>
                           <th className="px-6 py-3">Reg No</th>
                           <th className="px-6 py-3">Name</th>
                           <th className="px-6 py-3">Status</th>
                           <th className="px-6 py-3">Remarks</th>
                           <th className="px-6 py-3 text-right">Actions</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {filteredList.filter(u => u.paymentStatus === PaymentStatus.PAID).map(user => (
                           <tr key={user.id} className="hover:bg-slate-50">
                               <td className="px-6 py-4 font-mono text-xs">{user.membershipNo}</td>
                               <td className="px-6 py-4 font-medium">
                                   {user.fullName}
                                   <div className="text-xs text-slate-400">{user.mobile}</div>
                                   {user.approvedBy && <div className="text-[10px] text-emerald-600 mt-1">Appr: {user.approvedBy}</div>}
                               </td>
                               <td className="px-6 py-4">
                                   <span className={`px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700`}>
                                       {user.paymentStatus}
                                   </span>
                               </td>
                               <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-xs">{user.paymentRemarks || '-'}</td>
                               <td className="px-6 py-4 text-right">
                                    <button 
                                       onClick={() => handleRejectPayment(user.id)} 
                                       className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-1 ml-auto"
                                       title="Revert to Unpaid"
                                    >
                                       <X className="w-4 h-4" /> Revert
                                   </button>
                               </td>
                           </tr>
                       ))}
                       {filteredList.filter(u => u.paymentStatus === PaymentStatus.PAID).length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">No approved payment records found.</td></tr>
                       )}
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
                                        {/* Buttons to Assign */}
                                        {/* Only show 'Make All Access' if not already master admin */}
                                        {user.role !== Role.MASTER_ADMIN && (
                                            <button 
                                                onClick={() => handleAssignAdmin(user, Role.MASTER_ADMIN)} 
                                                className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                                            >
                                                Make All Access
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => handleAssignAdmin(user, Role.MANDALAM_ADMIN)} 
                                            className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                                        >
                                            Assign Mandalam
                                        </button>
                                        <button 
                                            onClick={() => handleAssignAdmin(user, Role.CUSTOM_ADMIN)} 
                                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
                                        >
                                            Custom
                                        </button>

                                        {/* Explicit Revoke Button if they have any admin role */}
                                        {user.role !== Role.USER && (
                                            <button 
                                                onClick={() => handleAssignAdmin(user, Role.USER)} 
                                                className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
                                            >
                                                Revoke
                                            </button>
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
                      <h3 className="font-bold text-slate-900">Registration Questions & Field Mapping</h3>
                      <div className="flex gap-2">
                          <button 
                              onClick={async () => {
                                  if(confirm("This will DELETE existing questions and reset to defaults. Continue?")) {
                                      try {
                                          await StorageService.seedDefaultQuestions();
                                          setQuestions(await StorageService.getQuestions());
                                          alert("Questions reset to default.");
                                      } catch (e) {
                                          console.error(e);
                                          alert("Failed to reset questions.");
                                      }
                                  }
                              }}
                              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 flex items-center gap-2"
                          >
                              <RefreshCw className="w-4 h-4" /> Reset Defaults
                          </button>
                          <button 
                              onClick={() => {
                                  setQuestionForm({ type: FieldType.TEXT, required: true, order: questions.length + 1, options: [], systemMapping: 'NONE' });
                                  setIsQuestionModalOpen(true);
                              }}
                              className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary-dark"
                          >
                              Add Question
                          </button>
                      </div>
                  </div>

                  <div className="space-y-3">
                      {questions.map((q) => (
                          <div key={q.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-50">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800">{q.label}</span>
                                      {q.required && <span className="text-red-500 text-xs font-bold">*</span>}
                                      {q.systemMapping && q.systemMapping !== 'NONE' && (
                                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">
                                              Maps to: {q.systemMapping}
                                          </span>
                                      )}
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
                                              try {
                                                  await StorageService.deleteQuestion(q.id);
                                                  const freshQuestions = await StorageService.getQuestions();
                                                  setQuestions(freshQuestions);
                                              } catch (e) {
                                                  console.error(e);
                                                  alert("Failed to delete question. See console.");
                                              }
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
                                  <label className="text-xs font-bold text-slate-500 uppercase">Label</label>
                                  <input 
                                      type="text" 
                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                      value={questionForm.label || ''}
                                      onChange={(e) => setQuestionForm({...questionForm, label: e.target.value})}
                                  />
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase">System Field Mapping</label>
                                  <p className="text-[10px] text-slate-400 mb-1">Links this question to a core user property (like Email or Password)</p>
                                  <select 
                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                      value={questionForm.systemMapping || 'NONE'}
                                      onChange={(e) => setQuestionForm({...questionForm, systemMapping: e.target.value as any})}
                                  >
                                      {SYSTEM_FIELD_MAPPING.map(m => (
                                          <option key={m.value} value={m.value}>{m.label}</option>
                                      ))}
                                  </select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                                      <select 
                                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                          value={questionForm.type}
                                          onChange={(e) => setQuestionForm({...questionForm, type: e.target.value as FieldType})}
                                      >
                                          {Object.values(FieldType).map(t => <option key={t} value={t}>{t}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-slate-500 uppercase">Order</label>
                                      <input 
                                          type="number" 
                                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                          value={questionForm.order}
                                          onChange={(e) => setQuestionForm({...questionForm, order: Number(e.target.value)})}
                                      />
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                  <input 
                                      type="checkbox" 
                                      checked={questionForm.required}
                                      onChange={(e) => setQuestionForm({...questionForm, required: e.target.checked})}
                                  />
                                  <label className="text-sm text-slate-700">Required Field?</label>
                              </div>

                              {/* Options Editor for Dropdown */}
                              {questionForm.type === FieldType.DROPDOWN && (
                                  <div className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Dropdown Options</label>
                                      <div className="flex gap-2 mb-2">
                                          <input 
                                              type="text" 
                                              placeholder="New Option"
                                              className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
                                              value={newOption}
                                              onChange={(e) => setNewOption(e.target.value)}
                                          />
                                          <button 
                                              onClick={() => {
                                                  if(newOption.trim()) {
                                                      const currentOpts = questionForm.options || [];
                                                      setQuestionForm({...questionForm, options: [...currentOpts, newOption.trim()]});
                                                      setNewOption('');
                                                  }
                                              }}
                                              className="px-3 bg-blue-600 text-white rounded-lg text-xs font-bold"
                                          >
                                              Add
                                          </button>
                                      </div>
                                      <div className="space-y-1">
                                          {(questionForm.options || []).map((opt, idx) => (
                                              <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded text-sm">
                                                  <span>{opt}</span>
                                                  <button 
                                                      onClick={() => {
                                                          const opts = [...(questionForm.options || [])];
                                                          opts.splice(idx, 1);
                                                          setQuestionForm({...questionForm, options: opts});
                                                      }}
                                                      className="text-red-500"
                                                  >
                                                      <X className="w-3 h-3" />
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div className="flex gap-2 mt-6">
                              <button onClick={() => setIsQuestionModalOpen(false)} className="flex-1 py-2 text-slate-600 font-bold bg-slate-100 rounded-lg">Cancel</button>
                              <button 
                                  onClick={async () => {
                                      if(questionForm.label && questionForm.type) {
                                          const q: RegistrationQuestion = {
                                              id: questionForm.id || `q_${Date.now()}`,
                                              label: questionForm.label,
                                              type: questionForm.type,
                                              required: questionForm.required || false,
                                              order: questionForm.order || 0,
                                              options: questionForm.options || [],
                                              dependentOptions: questionForm.dependentOptions || {},
                                              systemMapping: questionForm.systemMapping,
                                              ...(questionForm.parentQuestionId ? { parentQuestionId: questionForm.parentQuestionId } : {}),
                                              ...(questionForm.placeholder ? { placeholder: questionForm.placeholder } : {})
                                          };
                                          await StorageService.saveQuestion(q);
                                          setQuestions(await StorageService.getQuestions());
                                          setIsQuestionModalOpen(false);
                                      }
                                  }}
                                  className="flex-1 py-2 bg-primary text-white font-bold rounded-lg"
                              >
                                  Save Question
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* --- NEW YEAR TAB --- */}
      {activeTab === 'New Year' && (
          <div className="space-y-6">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
                  <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Fiscal Year Management</h3>
                  <p className="text-slate-500 mb-8">Start a new fiscal year to reset payment statuses for all members. This action archives the current year's data.</p>
                  
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-left mb-8">
                      <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> Warning
                      </h4>
                      <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                          <li>All members will be marked as <strong>UNPAID</strong> for the new year.</li>
                          <li>Current payment remarks will be cleared.</li>
                          <li>Membership numbers will continue in sequence or reset based on policy.</li>
                          <li>This action cannot be undone.</li>
                      </ul>
                  </div>

                  <button 
                      onClick={handleStartNewYear}
                      className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                  >
                      Start Fiscal Year {new Date().getFullYear() + 1}
                  </button>
              </div>
          </div>
      )}
      
      {/* --- USERS DATA & IMPORT TABS --- */}
      {activeTab === 'Import Users' && (
          <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileUp className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Bulk Member Import</h3>
                  <p className="text-slate-500 text-sm mb-6">Upload a CSV file to add multiple members at once.</p>
                  
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 mb-6 hover:bg-slate-50 transition-colors">
                      <input 
                          type="file" 
                          accept=".csv"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-slate-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-emerald-50 file:text-emerald-700
                            hover:file:bg-emerald-100
                          "
                      />
                  </div>

                  {isImporting && (
                      <div className="mb-6">
                          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                              <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${Math.min(100, (importProgress / 500) * 100)}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500 font-mono">Processing... {importProgress} records</p>
                      </div>
                  )}

                  <div className="flex gap-4 justify-center">
                      <button 
                          onClick={handleDownloadSample}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-50"
                      >
                          Download Sample CSV
                      </button>
                      <button 
                          onClick={handleImportUsers}
                          disabled={!importFile || isImporting}
                          className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                          {isImporting ? 'Importing...' : 'Start Import'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- USERS DATA / OVERVIEW --- */}
      {(activeTab === 'Users Data' || activeTab === 'Users Overview') && (
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800">{activeTab}</h3>
                   {/* Add User Button only in Data tab */}
                   {activeTab === 'Users Data' && <button className="text-xs bg-primary text-white px-3 py-1 rounded">Add User</button>}
               </div>
               {renderSearchBar()}
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs text-slate-500">
                         <tr>
                             <th className="px-6 py-3">Reg No</th>
                             <th className="px-6 py-3">Name</th>
                             <th className="px-6 py-3">Mobile</th>
                             <th className="px-6 py-3">Mandalam</th>
                             <th className="px-6 py-3">Status</th>
                             <th className="px-6 py-3 text-right">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {filteredList.map(u => (
                             <tr key={u.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">{u.membershipNo}</td>
                                 <td className="px-6 py-4 font-bold">
                                     {u.fullName}
                                     {/* Show approval info in Users Data view */}
                                     {activeTab === 'Users Data' && u.approvedBy && (
                                         <p className="text-[9px] text-emerald-600 font-normal mt-0.5">Approved by: {u.approvedBy}</p>
                                     )}
                                 </td>
                                 <td className="px-6 py-4">{u.mobile}</td>
                                 <td className="px-6 py-4">{u.mandalam}</td>
                                 <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs ${u.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{u.status}</span></td>
                                 <td className="px-6 py-4 text-right flex justify-end gap-2">
                                     <button onClick={() => setViewingUser(u)} className="text-slate-500 hover:text-primary" title="View Details"><Eye className="w-4 h-4" /></button>
                                     {activeTab === 'Users Data' && (
                                         <button onClick={() => handleEditUser(u)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit className="w-4 h-4" /></button>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
               </div>
           </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-bold mb-4">Edit User</h3>
                  <div className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded text-xs text-slate-500 mb-4 border border-slate-100">
                          Editing {editUserForm.fullName} ({editUserForm.membershipNo})
                      </div>
                      <div><label className="text-xs font-bold text-slate-500">Full Name</label><input className="w-full p-2 border rounded" value={editUserForm.fullName || ''} onChange={e => setEditUserForm({...editUserForm, fullName: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-slate-500">Mobile</label><input className="w-full p-2 border rounded" value={editUserForm.mobile || ''} onChange={e => setEditUserForm({...editUserForm, mobile: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-slate-500">Email</label><input className="w-full p-2 border rounded" value={editUserForm.email || ''} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} /></div>
                      
                      <div className="pt-2 border-t border-slate-100 mt-2">
                          <label className="text-xs font-bold text-red-500 uppercase">Reset Password</label>
                          <input type="text" className="w-full p-2 border rounded border-red-100 bg-red-50 text-red-900" placeholder="Enter new password" value={editUserForm.password || ''} onChange={e => setEditUserForm({...editUserForm, password: e.target.value})} />
                      </div>
                      
                      <div><label className="text-xs font-bold text-slate-500">Emirates ID</label><input className="w-full p-2 border rounded" value={editUserForm.emiratesId || ''} onChange={e => setEditUserForm({...editUserForm, emiratesId: e.target.value})} /></div>
                      <div>
                          <label className="text-xs font-bold text-slate-500">Mandalam</label>
                          <select className="w-full p-2 border rounded" value={editUserForm.mandalam} onChange={e => setEditUserForm({...editUserForm, mandalam: e.target.value as Mandalam})}>
                              {MANDALAMS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={() => setEditingUser(null)} className="flex-1 py-2 bg-slate-100 rounded">Cancel</button>
                      <button onClick={saveEditedUser} className="flex-1 py-2 bg-primary text-white rounded">Save Changes</button>
                  </div>
              </div>
          </div>
      )}

      {/* View User Modal */}
      {renderUserDetailModal()}

    </div>
  );
};

export default AdminDashboard;
