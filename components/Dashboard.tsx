
import React from 'react';
import { Client } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PlusIcon, Logo } from './Icons';

interface DashboardProps {
  clients: Client[];
  onAddClient?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ clients, onAddClient }) => {
  const totalDebts = clients.reduce((acc, client) => {
    const bal = client.transactions.reduce((tAcc, t) => t.type === 'DEBT' ? tAcc + t.amount : tAcc - t.amount, 0);
    return bal > 0 ? acc + bal : acc;
  }, 0);

  const chartData = clients
    .map(c => ({
      name: c.name.split(' ')[0],
      balance: c.transactions.reduce((acc, t) => t.type === 'DEBT' ? acc + t.amount : acc - t.amount, 0)
    }))
    .filter(d => d.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center justify-start max-w-4xl mx-auto w-full">
      {/* الترويسة المبسطة */}
      <div className="w-full flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <h1 className="text-2xl font-black text-blue-700">ديوني</h1>
        </div>
        <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
          لوحة التحكم
        </div>
      </div>

      {/* كروت الإحصائيات السريعة */}
      <div className="grid grid-cols-2 gap-3 w-full mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">إجمالي المستحقات</p>
          <p className="text-xl md:text-2xl font-black text-blue-600">{totalDebts.toLocaleString()} <span className="text-[10px]">ج.م</span></p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">قائمة العملاء</p>
          <p className="text-xl md:text-2xl font-black text-gray-800">{clients.length}</p>
        </div>
      </div>

      {/* الرسم البياني */}
      {chartData.length > 0 && (
        <div className="w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-800 text-sm">أعلى ٥ مديونيات</h3>
            <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">تحليل بياني</span>
          </div>
          <div className="h-56 -mr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={70} style={{ fontSize: '11px', fontWeight: 'bold' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: any) => [`${value.toLocaleString()} ج.م`, 'المبلغ']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'right', fontSize: '12px' }}
                />
                <Bar dataKey="balance" radius={[0, 6, 6, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#4f46e5', '#7c3aed', '#9333ea', '#c026d3'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* حالة عدم وجود بيانات أو تذييل الصفحة */}
      {clients.length === 0 ? (
        <div className="bg-blue-50/50 p-10 rounded-2xl border-2 border-dashed border-blue-100 text-center w-full mt-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6">
            <PlusIcon size={32} />
          </div>
          <h3 className="font-black text-blue-800 text-lg mb-2">ابدأ الآن</h3>
          <p className="text-blue-600 text-xs mb-8 leading-relaxed max-w-xs mx-auto">قم بإضافة أول عميل لك لتبدأ في تسجيل مديونياته وسدادته بشكل منظم واحترافي</p>
          <button 
            onClick={onAddClient}
            className="bg-blue-600 text-white px-10 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-sm"
          >
            إضافة أول عميل
          </button>
        </div>
      ) : (
        <div className="w-full text-center mt-auto py-6">
          <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">إدارة الديون الذكية v1.0</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
