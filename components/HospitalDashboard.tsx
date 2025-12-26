import React, { useState, useEffect } from 'react';
import { User, HospitalVisit, UserStatus, PaymentStatus } from '../types';
import { StorageService } from '../services/storageService';
import { QrCode, Search, CheckCircle2, User as UserIcon, Calendar, Clock, History, AlertTriangle, Phone, MapPin, CreditCard, X } from 'lucide-react';

interface HospitalDashboardProps {
    currentUser: User;
    users: User[]; // Add users prop to allow searching full list
    onLogout: () => void;
}

const HospitalDashboard: React.FC<HospitalDashboardProps> = ({ currentUser, users, onLogout }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [visitDetails, setVisitDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentVisits, setRecentVisits] = useState<HospitalVisit[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Subscribe to visits to show history for this hospital
    useEffect(() => {
        const unsubscribe = StorageService.subscribeToHospitalVisits((allVisits) => {
            // Filter only visits logged by THIS hospital account
            const myVisits = allVisits.filter(v => v.hospitalId === currentUser.id);
            setRecentVisits(myVisits);
        });
        return () => unsubscribe();
    }, [currentUser.id]);

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setHasSearched(true);
        setSelectedUser(null);
        
        const term = searchTerm.toLowerCase().trim();

        // Check for URL scanning logic (if a full URL is pasted/scanned)
        if (term.includes('verify=')) {
            const match = term.match(/verify=([^&]*)/);
            if (match && match[1]) {
                const found = users.find(u => u.id === match[1]);
                if (found) {
                    setSelectedUser(found);
                    setSearchResults([]);
                    return;
                }
            }
        }

        // Standard Search: Name, Mobile, Emirates ID, Membership No (The number below QR), Mandalam (Place)
        const results = users.filter(u => 
            u.fullName.toLowerCase().includes(term) ||
            u.mobile.includes(term) ||
            u.emiratesId.includes(term) ||
            u.membershipNo.toLowerCase() === term || // Exact match preferred for IDs, but filter logic handles partial
            u.mandalam.toLowerCase().includes(term)
        );

        if (results.length === 1) {
            setSelectedUser(results[0]);
            setSearchResults([]);
        } else {
            setSearchResults(results);
        }
    };

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setSearchResults([]);
        setVisitDetails('');
    };

    const handleSubmitVisit = async () => {
        if (!selectedUser || !visitDetails) return alert("Please enter treatment details.");
        
        setIsSubmitting(true);
        try {
            const newVisit: HospitalVisit = {
                id: `visit-${Date.now()}`,
                userId: selectedUser.id,
                hospitalId: currentUser.id,
                hospitalName: currentUser.fullName, 
                details: visitDetails,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now()
            };

            await StorageService.addHospitalVisit(newVisit);
            alert("Visit recorded successfully.");
            setVisitDetails('');
            // Keep selected user so they can add another record if needed, or user can click 'Close'
        } catch (e) {
            console.error(e);
            alert("Failed to save record.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                        <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{currentUser.fullName}</h1>
                        <p className="text-xs text-slate-500">Hospital Portal</p>
                    </div>
                </div>
                <button onClick={onLogout} className="text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg">
                    Sign Out
                </button>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Scanner & Entry */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-primary" /> Member Search
                        </h2>
                        <div className="flex gap-2 mb-2">
                            <input 
                                className="flex-1 p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Scan QR, or search Name, Mobile, EID, Place..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button 
                                onClick={handleSearch}
                                className="px-6 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark"
                            >
                                Search
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">Can search by Name, Phone, Emirates ID, or Registration Number.</p>
                    </div>

                    {/* Search Results List */}
                    {searchResults.length > 0 && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 max-h-[300px] overflow-y-auto">
                            <p className="text-sm font-bold text-slate-500 mb-3">{searchResults.length} members found:</p>
                            <div className="space-y-2">
                                {searchResults.map(u => (
                                    <button 
                                        key={u.id}
                                        onClick={() => handleSelectUser(u)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-blue-50 border border-slate-100 rounded-lg transition-colors text-left"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">{u.fullName}</p>
                                            <p className="text-xs text-slate-500">{u.membershipNo} • {u.mobile}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">{u.mandalam}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {hasSearched && searchResults.length === 0 && !selectedUser && (
                         <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400">
                             No members found matching "{searchTerm}".
                         </div>
                    )}

                    {/* Selected User View */}
                    {selectedUser && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-primary/20 animate-in fade-in slide-in-from-bottom-4 relative">
                            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-start gap-4 mb-6 border-b border-slate-100 pb-6">
                                {selectedUser.photoUrl ? (
                                    <img src={selectedUser.photoUrl} className="w-20 h-20 rounded-lg object-cover bg-slate-100" />
                                ) : (
                                    <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                        <UserIcon className="w-8 h-8" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900">{selectedUser.fullName}</h3>
                                    <p className="text-slate-500 font-mono text-sm font-bold bg-slate-100 inline-block px-2 rounded mb-2">{selectedUser.membershipNo}</p>
                                    
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedUser.status === UserStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {selectedUser.status}
                                        </span>
                                        {selectedUser.paymentStatus !== PaymentStatus.PAID && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Unpaid
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {selectedUser.mobile}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {selectedUser.mandalam}, {selectedUser.emirate}
                                        </div>
                                        <div className="flex items-center gap-1 col-span-2">
                                            <CreditCard className="w-3 h-3" /> EID: {selectedUser.emiratesId}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Record Benefits / Treatment</label>
                                    <textarea 
                                        className="w-full p-4 border border-slate-200 rounded-lg outline-none focus:border-primary min-h-[120px]"
                                        placeholder="Enter details of services provided..."
                                        value={visitDetails}
                                        onChange={(e) => setVisitDetails(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleSubmitVisit}
                                    disabled={isSubmitting || !visitDetails}
                                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Saving...' : <><CheckCircle2 className="w-5 h-5" /> Submit Record</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: History */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[calc(100vh-140px)]">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" /> Recent Activity
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {recentVisits.length > 0 ? recentVisits.map(visit => (
                            <div key={visit.id} className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{visit.date}</span>
                                        <Clock className="w-3 h-3 text-slate-400 ml-2" />
                                        <span className="text-xs font-bold text-slate-600">{visit.time}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-800 font-medium mb-1">{visit.details}</p>
                                <p className="text-xs text-slate-400">Patient ID: {visit.userId}</p>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-400 italic">
                                No visits recorded yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HospitalDashboard;