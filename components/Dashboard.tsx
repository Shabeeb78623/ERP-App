

import React from 'react';
import { 
  Users, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp
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
  Cell
} from 'recharts';
import { User, UserStatus, PaymentStatus } from '../types';

interface DashboardProps {
  users: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ users }) => {
  const totalUsers = users.length;
  const paidUsers = users.filter(u => u.paymentStatus === PaymentStatus.PAID).length;
  const pendingApproval = users.filter(u => u.status === UserStatus.PENDING).length;
  const totalRevenue = paidUsers * 25; // 25 AED per user

  const statusData = [
    { name: 'Active', value: users.filter(u => u.status === UserStatus.APPROVED).length, color: '#004e92' }, // Blue
    { name: 'Pending', value: pendingApproval, color: '#f59e0b' }, // Orange
    { name: 'Rejected', value: users.filter(u => u.status === UserStatus.REJECTED).length, color: '#ef4444' },
  ];

  const mandalamData = users.reduce((acc, user) => {
    const existing = acc.find(i => i.name === user.mandalam);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: user.mandalam, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Dashboard Overview</h2>
        <p className="text-slate-500">Welcome back, here is what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Members</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalUsers}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-primary rounded">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-4 inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% from last month
          </span>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">AED {totalRevenue}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-accent rounded">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <span className="text-xs text-slate-400 mt-4 block">For current financial year</span>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Approval</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{pendingApproval}</h3>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
          <span className="text-xs text-orange-600 font-medium mt-4 block">Requires attention</span>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Paid Members</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{paidUsers}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4">
            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${(paidUsers / totalUsers) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Member Distribution by Mandalam</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mandalamData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#004e92" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Membership Status</h3>
          <div className="h-80">
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
            <div className="flex flex-col gap-2 mt-4">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;