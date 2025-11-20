
import React from 'react';
import { 
  Users, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  HeartHandshake,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { User, UserStatus, PaymentStatus, BenefitRecord } from '../types';

interface DashboardProps {
  users: User[];
  benefits?: BenefitRecord[]; // Added benefits prop
}

const Dashboard: React.FC<DashboardProps> = ({ users, benefits = [] }) => {
  const totalUsers = users.length;
  const paidUsers = users.filter(u => u.paymentStatus === PaymentStatus.PAID).length;
  const pendingApproval = users.filter(u => u.status === UserStatus.PENDING).length;
  const totalRevenue = paidUsers * 60; // Mock revenue: 60 AED per user
  const potentialRevenue = totalUsers * 60;
  const outstandingRevenue = potentialRevenue - totalRevenue;

  // 1. Membership Status Data
  const statusData = [
    { name: 'Active', value: users.filter(u => u.status === UserStatus.APPROVED).length, color: '#004e92' }, // Blue
    { name: 'Pending', value: pendingApproval, color: '#f59e0b' }, // Orange
    { name: 'Rejected', value: users.filter(u => u.status === UserStatus.REJECTED).length, color: '#ef4444' },
  ];

  // 2. Mandalam Distribution Data
  const mandalamData = users.reduce((acc, user) => {
    const existing = acc.find(i => i.name === user.mandalam);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: user.mandalam, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]).sort((a,b) => b.value - a.value);

  // 3. Benefits Distribution Data
  const benefitsData = benefits.reduce((acc, curr) => {
      const existing = acc.find(i => i.name === curr.type);
      if(existing) {
          existing.value += curr.amount;
      } else {
          acc.push({ name: curr.type, value: curr.amount });
      }
      return acc;
  }, [] as { name: string, value: number }[]);
  
  const COLORS_BENEFITS = ['#10b981', '#3b82f6', '#f43f5e', '#8b5cf6'];

  // 4. Growth/Trends Data (Mocked based on reg year)
  const yearData = users.reduce((acc, user) => {
      const year = user.registrationYear || 2025;
      const existing = acc.find(i => i.name === year.toString());
      if(existing) existing.value++;
      else acc.push({ name: year.toString(), value: 1 });
      return acc;
  }, [] as {name: string, value: number}[]).sort((a,b) => Number(a.name) - Number(b.name));


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-primary">Analytics Dashboard</h2>
            <p className="text-slate-500">Real-time community insights and financial overview.</p>
        </div>
        <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-700">Financial Year</p>
            <p className="text-2xl font-bold text-primary">2025</p>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-16 h-16 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Members</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{totalUsers}</h3>
            <span className="text-xs text-emerald-600 font-medium mt-2 inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded">
              <TrendingUp className="w-3 h-3" /> Active Community
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <CreditCard className="w-16 h-16 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Collections</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">AED {totalRevenue}</h3>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
               <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(totalRevenue/potentialRevenue)*100}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Target: AED {potentialRevenue}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertCircle className="w-16 h-16 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Pending Actions</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{pendingApproval}</h3>
            <p className="text-xs text-slate-500 mt-2">User approvals waiting</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <HeartHandshake className="w-16 h-16 text-pink-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500 tracking-wider">Benefits Given</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">AED {benefits.reduce((a,b)=>a+b.amount,0)}</h3>
            <p className="text-xs text-slate-500 mt-2">Total assistance distributed</p>
          </div>
        </div>
      </div>

      {/* Row 2: Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mandalam Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Regional Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mandalamData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#004e92" radius={[4, 4, 0, 0]} barSize={30} name="Members" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Membership Status Pie */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Member Status</h3>
          <div className="h-60 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="block text-3xl font-bold text-slate-800">{totalUsers}</span>
                    <span className="text-xs text-slate-400 uppercase">Total</span>
                </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* Row 3: Financials & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Benefits Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Assistance Distribution</h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                            data={benefitsData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {benefitsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_BENEFITS[index % COLORS_BENEFITS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `AED ${value}`} />
                          <Legend />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Registration Growth */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Registration Growth</h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={yearData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#004e92" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#004e92" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                          <YAxis axisLine={false} tickLine={false} fontSize={12} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <Tooltip />
                          <Area type="monotone" dataKey="value" stroke="#004e92" fillOpacity={1} fill="url(#colorReg)" strokeWidth={2} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
