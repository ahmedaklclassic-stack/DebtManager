
import React, { useState, useMemo } from 'react';
import { Client, TransactionType } from '../types';
import { PlusIcon, SearchIcon, BackIcon } from './Icons';

interface SidebarProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (id: string) => void;
  onAddClick: () => void;
  onClose?: () => void;
}

type SortOption = 'name' | 'balance' | 'newest' | 'last_activity';
type FilterGroup = 'all' | 'debtors' | 'settled' | 'overdue';

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 
    'bg-emerald-500', 'bg-cyan-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const Sidebar: React.FC<SidebarProps> = ({ clients, selectedClientId, onSelectClient, onAddClick, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterGroup, setFilterGroup] = useState<FilterGroup>('all');
  const [debtThreshold, setDebtThreshold] = useState<number>(5000);

  const calculateBalance = (client: Client) => {
    return client.transactions.reduce((acc, t) => {
      return t.type === TransactionType.DEBT ? acc + t.amount : acc - t.amount;
    }, 0);
  };

  const getLastActivityDate = (client: Client) => {
    if (client.transactions.length === 0) return new Date(client.createdAt).getTime();
    const dates = client.transactions.map(t => new Date(t.date).getTime());
    return Math.max(...dates);
  };

  const processedClients = useMemo(() => {
    let result = [...clients];

    // Search Filter
    if (searchTerm) {
      result = result.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
      );
    }

    // Grouping Filter
    if (filterGroup === 'debtors') {
      result = result.filter(c => calculateBalance(c) > 0);
    } else if (filterGroup === 'settled') {
      result = result.filter(c => calculateBalance(c) <= 0);
    } else if (filterGroup === 'overdue') {
      result = result.filter(c => calculateBalance(c) >= debtThreshold);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      if (sortBy === 'balance') return calculateBalance(b) - calculateBalance(a);
      if (sortBy === 'last_activity') return getLastActivityDate(b) - getLastActivityDate(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [clients, searchTerm, sortBy, filterGroup, debtThreshold]);

  return (
    <aside className="h-full bg-white border-l border-gray-200 flex flex-col w-full shadow-xl md:shadow-none">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-blue-700 font-cairo">قائمة العملاء</h1>
          <button 
            onClick={onClose} 
            className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <BackIcon size={24} />
          </button>
        </div>
        
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="بحث عن عميل..." 
            className="w-full pl-4 pr-10 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-right shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-3 top-3.5 text-gray-400">
            <SearchIcon />
          </div>
        </div>

        {/* Grouping Filter Tabs */}
        <div className="flex bg-gray-50 p-1 rounded-lg gap-1 mb-2">
          <button 
            onClick={() => setFilterGroup('all')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${filterGroup === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
          >الكل</button>
          <button 
            onClick={() => setFilterGroup('debtors')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${filterGroup === 'debtors' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
          >مدين</button>
          <button 
            onClick={() => setFilterGroup('overdue')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${filterGroup === 'overdue' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
          >متجاوز</button>
          <button 
            onClick={() => setFilterGroup('settled')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${filterGroup === 'settled' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
          >خالص</button>
        </div>

        {/* Dynamic Threshold Config */}
        {filterGroup === 'overdue' && (
          <div className="mb-4 px-1 animate-in slide-in-from-top-1 duration-200">
            <label className="text-[10px] font-bold text-gray-400 flex justify-between mb-1">
              <span>الحد الأقصى للمديونية:</span>
              <span className="text-red-500">{debtThreshold.toLocaleString()} ج.م</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="20000" 
              step="500" 
              value={debtThreshold} 
              onChange={(e) => setDebtThreshold(Number(e.target.value))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
        )}

        {/* Sort Selection */}
        <div className="flex items-center justify-between px-1 mt-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ترتيب حسب:</span>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-[11px] font-bold text-blue-600 bg-transparent border-none focus:ring-0 cursor-pointer text-right outline-none"
          >
            <option value="newest">المضاف حديثاً</option>
            <option value="last_activity">آخر نشاط</option>
            <option value="name">الاسم</option>
            <option value="balance">أعلى مديونية</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {processedClients.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm">لا يوجد نتائج تطابق البحث أو الفلترة</p>
          </div>
        ) : (
          processedClients.map(client => {
            const balance = calculateBalance(client);
            const initial = client.name.trim().charAt(0).toUpperCase();
            const avatarBg = getAvatarColor(client.name);
            const isOverdue = balance >= debtThreshold;
            
            return (
              <button
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className={`w-full flex items-center p-4 hover:bg-gray-50 transition-all border-b border-gray-50 group relative
                  ${selectedClientId === client.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''}
                  ${isOverdue && selectedClientId !== client.id ? 'bg-red-50/20' : ''}
                `}
              >
                <div className={`w-12 h-12 ${avatarBg} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm group-hover:scale-105 transition-transform overflow-hidden`}>
                  {client.avatarUrl ? (
                    <img src={client.avatarUrl} className="w-full h-full object-cover" alt={client.name} />
                  ) : (
                    initial
                  )}
                </div>
                
                <div className="mr-3 text-right flex-1 overflow-hidden">
                  <p className={`font-bold text-gray-900 truncate text-base ${isOverdue ? 'text-red-900' : ''}`}>
                    {client.name}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    {client.transactions.length > 0 ? (
                      `آخر عملية: ${new Date(getLastActivityDate(client)).toLocaleDateString('ar-EG')}`
                    ) : (
                      'لا توجد عمليات'
                    )}
                  </p>
                </div>

                <div className="text-left shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    {isOverdue && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                      </span>
                    )}
                    <p className={`font-black text-sm ${balance > 0 ? (balance >= debtThreshold ? 'text-red-600' : 'text-orange-600') : 'text-green-600'}`}>
                      {balance.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">ج.م</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t">
        <button 
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 shadow-lg transition-all active:scale-95 font-bold"
        >
          <PlusIcon size={20} />
          <span>إضافة عميل جديد</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
