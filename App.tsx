
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import Communications from './components/Communications';
import MembershipCard from './components/MembershipCard';
import Auth from './components/Auth';
import { UserBenefits, AccountSettings, UserNotifications } from './components/UserViews';
import { StorageService } from './services/storageService';
import { ViewState, Role, User, DashboardStats, UserStatus, PaymentStatus, BenefitRecord, Notification } from './types';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('AUTH');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [benefits, setBenefits] = useState<BenefitRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [viewMode, setViewMode] = useState<'ADMIN' | 'USER'>('USER');

  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const [completionForm, setCompletionForm] = useState({
      email: '',
      password: '',
      addressUAE: '',
      addressIndia: '',
      nominee: '',
      relation: 'Father'
  });

  // --- SESSION PERSISTENCE & REAL-TIME SYNC ---
  useEffect(() => {
      // 1. Subscribe to Real-time Data
      const unsubscribeUsers = StorageService.subscribeToUsers((liveUsers) => {
          setUsers(liveUsers);
      });
      
      const unsubscribeBenefits = StorageService.subscribeToBenefits((liveBenefits) => {
          setBenefits(liveBenefits);
      });

      const unsubscribeNotifs = StorageService.subscribeToNotifications((liveNotifs) => {
          setNotifications(liveNotifs);
      });

      // 2. Restore Session from LocalStorage
      const restoreSession = async () => {
          const storedUserId = localStorage.getItem('vadakara_session_user_id');
          if (storedUserId) {
              const allUsers = await StorageService.getUsers();
              const user = allUsers.find(u => u.id === storedUserId);
              if (user) {
                  setCurrentUser(user);
                  if (user.role === Role.MASTER_ADMIN || user.role !== Role.USER) {
                      setViewMode('ADMIN');
                  } else {
                      setViewMode('USER');
                  }
                  setCurrentView('DASHBOARD');
              }
          }
          setIsLoading(false);
      };

      restoreSession();

      // Cleanup subscriptions on unmount
      return () => {
          unsubscribeUsers();
          unsubscribeBenefits();
          unsubscribeNotifs();
      };
  }, []);

  // Also update currentUser when the users list changes (e.g. admin edits my profile)
  useEffect(() => {
      if (currentUser && users.length > 0) {
          const freshUser = users.find(u => u.id === currentUser.id);
          if (freshUser) {
              setCurrentUser(freshUser);
          }
      }
  }, [users]);

  const stats: DashboardStats = {
      total: users.length - 1, 
      new: users.filter(u => u.registrationYear === 2025 && u.role !== Role.MASTER_ADMIN).length,
      reReg: users.filter(u => u.registrationYear < 2025 && u.role !== Role.MASTER_ADMIN).length,
      pending: users.filter(u => u.status === UserStatus.PENDING && u.role !== Role.MASTER_ADMIN).length,
      approved: users.filter(u => u.status === UserStatus.APPROVED && u.role !== Role.MASTER_ADMIN).length,
      rejected: users.filter(u => u.status === UserStatus.REJECTED && u.role !== Role.MASTER_ADMIN).length,
      paid: users.filter(u => u.paymentStatus === PaymentStatus.PAID && u.role !== Role.MASTER_ADMIN).length,
      admins: users.filter(u => u.role !== Role.USER && u.role !== Role.MASTER_ADMIN).length,
      collected: users.filter(u => u.paymentStatus === PaymentStatus.PAID && u.role !== Role.MASTER_ADMIN).length * 25
  };

  const handleLogin = async (identifier: string, passwordInput: string) => {
      setIsLoading(true);
      
      // Hardcoded fallback for System Admin (Shabeeb)
      if (identifier === 'Shabeeb' && passwordInput === 'ShabeeB@2025') {
        // Explicitly look for the 'admin-master' ID to avoid logging in as a promoted user
        const admin = users.find(u => u.id === 'admin-master');
        if (admin) {
          setCurrentUser(admin);
          setViewMode('ADMIN');
          setCurrentView('DASHBOARD');
          localStorage.setItem('vadakara_session_user_id', admin.id); // Save session
          setIsLoading(false);
          return;
        }
      }

      try {
        const freshUsers = await StorageService.getUsers();
        setUsers(freshUsers);
        
        const cleanId = identifier.trim().toLowerCase();
        // Check for admin by username first
        let user: User | undefined;
        if (identifier === 'Shabeeb') {
            user = freshUsers.find(u => u.id === 'admin-master');
        } else {
            user = freshUsers.find(u => 
                (u.email && u.email.toLowerCase() === cleanId) || 
                (u.mobile && u.mobile.trim() === cleanId)
            );
        }
        
        if (user && user.password === passwordInput) {
            setCurrentUser(user);
            localStorage.setItem('vadakara_session_user_id', user.id); // Save session
            
            if (user.role === Role.MASTER_ADMIN || user.role !== Role.USER) {
                setViewMode('ADMIN');
            } else {
                setViewMode('USER');
            }

            if (user.isImported) {
                setIsProfileCompletionOpen(true);
            }
            setCurrentView('DASHBOARD');
        } else {
            alert("Invalid credentials.");
        }
      } catch (e) {
          console.error(e);
          alert("Login error.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegister = async (newUser: User) => {
    setIsLoading(true);
    try {
      await StorageService.addUser(newUser);
      
      setCurrentUser(newUser);
      localStorage.setItem('vadakara_session_user_id', newUser.id); // Save session
      setViewMode('USER');
      setCurrentView('DASHBOARD');
      alert("Registration successful!");
    } catch (e: any) {
      alert(e.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('vadakara_session_user_id'); // Clear session
      setCurrentUser(null);
      setCurrentView('AUTH');
      setViewMode('USER');
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
      setIsLoading(true);
      try {
        await StorageService.updateUser(userId, updates);
      } catch (error) {
          console.error("Update failed", error);
          alert("Failed to update user.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddBenefit = async (benefit: BenefitRecord) => {
    setIsLoading(true);
    try {
        await StorageService.addBenefit(benefit);
    } catch (error) {
        console.error(error);
        alert("Failed to add benefit");
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteBenefit = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this record?")) return;
    setIsLoading(true);
    try {
        await StorageService.deleteBenefit(id);
    } catch (error) {
        console.error(error);
        alert("Failed to delete benefit");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDeleteNotification = async (id: string) => {
    if(!window.confirm("Delete notification?")) return;
    try {
        await StorageService.deleteNotification(id);
    } catch (e) { console.error(e); }
  };

  const submitProfileCompletion = async () => {
      if (!currentUser) return;
      if (!completionForm.email || !completionForm.password) {
          alert("Email and Password are required.");
          return;
      }

      await handleUpdateUser(currentUser.id, {
          email: completionForm.email,
          password: completionForm.password,
          addressUAE: completionForm.addressUAE,
          addressIndia: completionForm.addressIndia,
          nominee: completionForm.nominee,
          relation: completionForm.relation,
          isImported: false 
      });
      
      setIsProfileCompletionOpen(false);
      alert("Profile completed successfully. You can now use these credentials to login.");
  };

  const toggleViewMode = () => {
      // Allow assigned admins to switch, but restrict the System Admin (Shabeeb/admin-master)
      if (currentUser?.role === Role.USER || currentUser?.id === 'admin-master') return; 
      
      setViewMode(prev => prev === 'ADMIN' ? 'USER' : 'ADMIN');
      setCurrentView('DASHBOARD');
  };

  const renderContent = () => {
    if (isLoading && !currentUser) { 
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <div className="animate-spin text-primary text-4xl mb-4">
                   <i className="fa-solid fa-circle-notch"></i>
                </div>
                <p className="text-slate-500 font-medium">Connecting to Secure Server...</p>
            </div>
        )
    }

    if (!currentUser || currentView === 'AUTH') {
      return <Auth onLogin={handleLogin} onRegister={handleRegister} isLoading={isLoading} />;
    }

    if (viewMode === 'USER') {
        switch (currentView) {
            case 'DASHBOARD': return <UserDashboard user={currentUser} benefits={benefits} onUpdateUser={handleUpdateUser} isLoading={isLoading} />;
            case 'CARD': return <MembershipCard user={currentUser} />;
            case 'BENEFITS': return <UserBenefits user={currentUser} benefits={benefits} />;
            case 'ACCOUNT': return <AccountSettings user={currentUser} onUpdateUser={handleUpdateUser} />;
            case 'NOTIFICATIONS': return <UserNotifications user={currentUser} notifications={notifications} />;
            default: return <UserDashboard user={currentUser} benefits={benefits} onUpdateUser={handleUpdateUser} isLoading={isLoading} />;
        }
    } else {
        // Admin View
        switch (currentView) {
            case 'DASHBOARD': return (
              <AdminDashboard 
                currentUser={currentUser}
                users={users} 
                benefits={benefits}
                notifications={notifications}
                stats={stats} 
                onUpdateUser={handleUpdateUser}
                onAddBenefit={handleAddBenefit}
                onDeleteBenefit={handleDeleteBenefit}
                onDeleteNotification={handleDeleteNotification}
                isLoading={isLoading}
              />
            );
            case 'COMMUNICATIONS': return <Communications />;
            default: return (
              <AdminDashboard 
                currentUser={currentUser}
                users={users} 
                benefits={benefits}
                notifications={notifications}
                stats={stats} 
                onUpdateUser={handleUpdateUser}
                onAddBenefit={handleAddBenefit}
                onDeleteBenefit={handleDeleteBenefit}
                onDeleteNotification={handleDeleteNotification}
                isLoading={isLoading}
              />
            );
        }
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      setCurrentView={setCurrentView}
      currentUser={currentUser}
      onLogout={handleLogout}
      viewMode={viewMode}
      toggleViewMode={toggleViewMode}
    >
      {renderContent()}

      {isLoading && currentUser && (
          <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-sm flex items-center justify-center">
               <div className="animate-spin text-primary text-3xl">
                   <i className="fa-solid fa-spinner"></i>
                </div>
          </div>
      )}

      {isProfileCompletionOpen && currentUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto border border-slate-100">
                  <div className="text-center border-b border-slate-100 pb-4">
                      <h2 className="text-2xl font-bold text-slate-900">Complete Your Profile</h2>
                      <p className="text-slate-500 text-sm">We need a few more details to secure your account.</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Email Address</label>
                          <input 
                            type="email" 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            placeholder="your@email.com"
                            value={completionForm.email}
                            onChange={(e) => setCompletionForm({...completionForm, email: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">New Password</label>
                          <input 
                            type="password" 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            value={completionForm.password}
                            onChange={(e) => setCompletionForm({...completionForm, password: e.target.value})}
                          />
                      </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">UAE Address</label>
                          <textarea 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none resize-none h-20 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            value={completionForm.addressUAE}
                            onChange={(e) => setCompletionForm({...completionForm, addressUAE: e.target.value})}
                          ></textarea>
                      </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">India Address</label>
                          <textarea 
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none resize-none h-20 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                            value={completionForm.addressIndia}
                            onChange={(e) => setCompletionForm({...completionForm, addressIndia: e.target.value})}
                          ></textarea>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Nominee Name</label>
                             <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                value={completionForm.nominee}
                                onChange={(e) => setCompletionForm({...completionForm, nominee: e.target.value})}
                             />
                          </div>
                          <div>
                             <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Relation</label>
                             <select 
                                className="w-full p-3 border border-slate-200 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                value={completionForm.relation}
                                onChange={(e) => setCompletionForm({...completionForm, relation: e.target.value})}
                             >
                                 <option value="Father">Father</option>
                                 <option value="Mother">Mother</option>
                                 <option value="Wife">Wife</option>
                                 <option value="Husband">Husband</option>
                                 <option value="Son">Son</option>
                             </select>
                          </div>
                      </div>
                  </div>

                  <button 
                    onClick={submitProfileCompletion}
                    className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all"
                  >
                      Save Profile
                  </button>
              </div>
          </div>
      )}
    </Layout>
  );
};

export default App;
