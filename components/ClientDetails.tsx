
import React, { useState, useMemo } from 'react';
import { Client, Transaction, TransactionType } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { TrashIcon, ShareIcon, CameraIcon, ImageIcon, BackIcon, PlusIcon, SearchIcon, UserIcon } from './Icons';

interface ClientDetailsProps {
  client: Client;
  onAddTransaction: (t: Omit<Transaction, 'id' | 'date'>) => void;
  onDeleteTransaction: (id: string) => void;
  onDelete: () => void;
  onBack: () => void;
}

const OVERDUE_THRESHOLD = 5000;

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

const ClientDetails: React.FC<ClientDetailsProps> = ({ client, onAddTransaction, onDeleteTransaction, onDelete, onBack }) => {
  const [showAddTx, setShowAddTx] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [contactCopyFeedback, setContactCopyFeedback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter States
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const actualBalance = useMemo(() => {
    return client.transactions.reduce((acc, t) => 
      t.type === TransactionType.DEBT ? acc + t.amount : acc - t.amount, 0);
  }, [client.transactions]);

  const isHighlyOverdue = actualBalance >= OVERDUE_THRESHOLD;

  const filteredTransactions = useMemo(() => {
    return client.transactions.filter(tx => {
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      const txDate = new Date(tx.date).toISOString().split('T')[0];
      const matchesFrom = !dateFrom || txDate >= dateFrom;
      const matchesTo = !dateTo || txDate <= dateTo;
      return matchesType && matchesFrom && matchesTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [client.transactions, filterType, dateFrom, dateTo]);

  const overdueTransactions = useMemo(() => {
    const now = new Date();
    return client.transactions.filter(tx => 
      tx.type === TransactionType.DEBT && 
      tx.dueDate && 
      new Date(tx.dueDate) < now
    );
  }, [client.transactions]);

  const filteredBalance = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => 
      t.type === TransactionType.DEBT ? acc + t.amount : acc - t.amount, 0);
  }, [filteredTransactions]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const dailyMap: Record<string, { date: string; debt: number; payment: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const dateKey = new Date(tx.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, debt: 0, payment: 0 };
      }
      if (tx.type === TransactionType.DEBT) {
        dailyMap[dateKey].debt += tx.amount;
      } else {
        dailyMap[dateKey].payment += tx.amount;
      }
    });

    return Object.values(dailyMap).slice(-7).reverse(); // Last 7 unique days of activity
  }, [filteredTransactions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImgPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    onAddTransaction({
      type: target.type.value as TransactionType,
      amount: parseFloat(target.amount.value),
      description: target.description.value,
      dueDate: target.dueDate.value || undefined,
      imageUrl: imgPreview || undefined
    });
    setShowAddTx(false);
    setImgPreview(null);
  };

  const handleDeleteTx = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه العملية؟ لا يمكن التراجع عن هذا الإجراء.')) {
      onDeleteTransaction(id);
    }
  };

  const shareContactInfo = async () => {
    // Explicit Confirmation Dialog
    if (!window.confirm(`هل أنت متأكد من رغبتك في مشاركة بيانات الاتصال الخاصة بـ (${client.name})؟`)) {
      return;
    }

    const contactText = `الاسم: ${client.name}\nالهاتف: ${client.phone}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `جهة اتصال - ${client.name}`, text: contactText });
      } catch (err) { console.error('Sharing contact failed', err); }
    } else {
      try {
        await navigator.clipboard.writeText(contactText);
        setContactCopyFeedback(true);
        setTimeout(() => setContactCopyFeedback(false), 2000);
      } catch (err) { alert('فشل نسخ بيانات الاتصال'); }
    }
  };

  const shareReport = async () => {
    // Explicit Confirmation Dialog
    if (!window.confirm('هل تود استخراج ومشاركة تقرير كشف الحساب لهذا العميل؟ سيتم إرسال سجل العمليات والرصيد الحالي.')) {
      return;
    }

    const historyText = filteredTransactions.slice(0, 15).map(tx => {
      const date = new Date(tx.date).toLocaleDateString('ar-EG');
      const type = tx.type === TransactionType.DEBT ? 'مديونية' : 'سداد';
      return `• ${date}: ${tx.amount} ج.م (${tx.description || type})`;
    }).join('\n');

    const fullText = `*كشف حساب عميل*\n👤 الاسم: ${client.name}\n📞 الهاتف: ${client.phone}\n--------------------------\n📜 سجل العمليات (مفلتر):\n${historyText}\n--------------------------\n💰 *الرصيد في الكشف: ${filteredBalance.toLocaleString()} ج.م*\n💵 *الإجمالي الكلي: ${actualBalance.toLocaleString()} ج.م*`;
    if (navigator.share) {
      try { await navigator.share({ title: `كشف حساب - ${client.name}`, text: fullText }); }
      catch (err) { console.error('Sharing failed', err); }
    } else {
      try {
        await navigator.clipboard.writeText(fullText);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (err) { alert('فشل نسخ التقرير'); }
    }
  };

  const exportToCSV = () => {
    if (!window.confirm('هل تود تصدير سجل العمليات المفلتر إلى ملف CSV؟')) return;

    const headers = ["التاريخ", "النوع", "المبلغ", "البيان", "تاريخ الاستحقاق"];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('ar-EG'),
      tx.type === TransactionType.DEBT ? 'مديونية' : 'سداد',
      tx.amount,
      tx.description || '-',
      tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('ar-EG') : '-'
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_عمليات_${client.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendWhatsAppReminder = (specificTx?: Transaction) => {
    if (actualBalance <= 0 && !specificTx) {
      alert('العميل ليس عليه أي مديونية حالياً.');
      return;
    }

    let message = "";
    if (specificTx) {
      const dateStr = new Date(specificTx.date).toLocaleDateString('ar-EG');
      const dueStr = specificTx.dueDate ? new Date(specificTx.dueDate).toLocaleDateString('ar-EG') : '';
      message = `السلام عليكم أ/ ${client.name}، نود تذكيركم بخصوص العملية ("${specificTx.description || 'مديونية'}") بتاريخ ${dateStr}${dueStr ? ` والمستحقة في ${dueStr}` : ''} بمبلغ ${specificTx.amount.toLocaleString()} ج.م. يرجى التكرم بالسداد. شكراً لكم.`;
    } else {
      const overdueInfo = overdueTransactions.length > 0 
        ? `\nيوجد عدد (${overdueTransactions.length}) عمليات متجاوزة لموعد السداد.` 
        : "";
      message = `السلام عليكم أ/ ${client.name}، نود تذكيركم بأن إجمالي المديونية المستحقة لديكم هي: ${actualBalance.toLocaleString()} ج.م.${overdueInfo}\nيرجى التكرم بالسداد في أقرب وقت. شكراً لكم.`;
    }

    // Explicit Confirmation Dialog
    const confirmMessage = specificTx 
      ? `هل أنت متأكد من إرسال رسالة تذكير عبر واتساب لهذه العملية المحددة؟`
      : `هل أنت متأكد من إرسال رسالة تذكير عبر واتساب بالمبلغ الإجمالي (${actualBalance.toLocaleString()} ج.م)؟`;
    
    if (!window.confirm(confirmMessage)) return;

    const cleanPhone = client.phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const resetFilters = () => {
    setFilterType('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const isFiltered = filterType !== 'ALL' || dateFrom || dateTo;
  const initial = client.name.trim().charAt(0).toUpperCase();
  const avatarBg = getAvatarColor(client.name);

  return (
    <div className={`flex-1 flex flex-col h-full bg-white relative transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* Header */}
      <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={isFullscreen ? toggleFullscreen : onBack} className="text-gray-500 hover:text-gray-800 transition">
            <BackIcon />
          </button>
          {!isFullscreen && (
            <>
              <div className={`w-10 h-10 ${avatarBg} rounded-full flex items-center justify-center text-white font-bold shadow-inner overflow-hidden shrink-0`}>
                {client.avatarUrl ? <img src={client.avatarUrl} className="w-full h-full object-cover" alt={client.name} /> : initial}
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{client.name}</h2>
                <p className="text-[11px] text-gray-500">{client.phone}</p>
              </div>
            </>
          )}
          {isFullscreen && <h2 className="text-lg font-bold text-gray-800">عرض كامل للملف</h2>}
        </div>
        <div className="flex gap-1 md:gap-2">
          {/* Export CSV Button */}
          <button 
            onClick={exportToCSV}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition"
            title="تصدير كملف إكسل"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          
          <button 
            onClick={toggleFullscreen} 
            className={`p-2 rounded-full transition ${isFullscreen ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'text-gray-500 hover:bg-gray-100'}`}
            title={isFullscreen ? "تصغير الشاشة" : "عرض ملء الشاشة"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen ? (
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              ) : (
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              )}
            </svg>
          </button>
          {!isFullscreen && (
            <>
              <button onClick={shareContactInfo} className={`p-2 rounded-full transition relative ${contactCopyFeedback ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:bg-gray-100'}`} title="مشاركة بيانات العميل">
                <UserIcon size={18} />
              </button>
              <button onClick={shareReport} className={`p-2 rounded-full transition relative ${copyFeedback ? 'text-green-600 bg-green-50' : 'text-blue-600 hover:bg-blue-50'}`} title="مشاركة كشف الحساب">
                <ShareIcon size={18} />
              </button>
              <button onClick={() => sendWhatsAppReminder()} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition shadow-sm flex items-center gap-1.5" title="تذكير بالمبلغ الكلي">
                <span className="hidden xs:inline">تذكير</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.852.448-1.271.607-1.444.158-.171.348-.215.464-.215.117 0 .231.001.332.005.106.005.249-.04.391.302.144.35.493 1.201.536 1.287.043.086.072.186.015.3-.058.115-.088.19-.175.291-.086.101-.181.225-.259.302-.086.086-.176.179-.076.35.1.172.444.733.953 1.186.655.584 1.206.765 1.378.852.172.086.273.072.373-.043.1-.115.431-.502.546-.673.115-.172.23-.144.388-.086.158.057 1.003.473 1.176.559.172.086.287.129.33.201.043.072.043.418-.101.823zM12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1zm0 18a7 7 0 1 1 7-7 7.008 7.008 0 0 1-7 7z"/></svg>
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"><TrashIcon size={18} /></button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Overdue Alert Banner */}
        {overdueTransactions.length > 0 && (
          <div className="mx-4 mt-4 p-3 bg-red-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-xs font-bold">يوجد {overdueTransactions.length} عمليات متأخرة عن موعد السداد!</p>
            </div>
            <button onClick={() => { setFilterType(TransactionType.DEBT); setDateFrom(''); setDateTo(''); }} className="text-[10px] bg-white/20 px-2 py-1 rounded font-bold">عرض المتأخرات</button>
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className={`p-6 rounded-2xl flex flex-col items-center justify-center border transition-all duration-500 
            ${actualBalance > 0 
              ? (isHighlyOverdue ? 'bg-red-600 border-red-700 text-white shadow-xl shadow-red-100 ring-4 ring-red-50 animate-in zoom-in duration-300' : 'bg-red-50 border-red-100 text-red-700') 
              : 'bg-green-50 border-green-100 text-green-700'}`}>
            <span className={`text-xs font-bold uppercase tracking-wider ${isHighlyOverdue ? 'opacity-90' : 'opacity-60'}`}>الرصيد الإجمالي المستحق</span>
            <span className="text-3xl font-black mt-1 flex items-center gap-2">
              {actualBalance.toLocaleString()} 
              <span className="text-sm">ج.م</span>
              {isHighlyOverdue && <span className="text-xl animate-bounce">⚠️</span>}
            </span>
            {isHighlyOverdue && (
              <p className="text-[10px] font-bold mt-2 bg-white/20 px-2 py-0.5 rounded-full uppercase">تجاوز الحد المسموح</p>
            )}
          </div>

          {isFiltered && (
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
              <div className="text-right">
                <p className="text-[10px] font-bold text-blue-400 uppercase">نتائج التصفية</p>
                <p className="text-lg font-black text-blue-700">{filteredBalance.toLocaleString()} <span className="text-xs">ج.م</span></p>
              </div>
              <button onClick={resetFilters} className="text-[10px] bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 font-bold">إلغاء الفلترة</button>
            </div>
          )}
        </div>

        {/* Analytics Chart */}
        {chartData.length > 0 && (
          <div className="px-4 mb-4">
            <div className={`bg-white border border-gray-100 rounded-3xl p-5 shadow-sm overflow-hidden transition-all ${isFullscreen ? 'h-80' : 'h-auto'}`}>
              <h3 className="font-black text-gray-800 mb-4 text-right text-sm">تحليل المعاملات الأخيرة</h3>
              <div className={`${isFullscreen ? 'h-64' : 'h-48'} -mr-6`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#94a3b8' }} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', textAlign: 'right', fontSize: '12px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Bar name="ديون" dataKey="debt" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar name="سداد" dataKey="payment" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="px-4 mb-2">
          <div className="bg-gray-50 p-3 rounded-2xl space-y-3">
            <div className="flex bg-white p-1 rounded-xl border border-gray-200">
              <button onClick={() => setFilterType('ALL')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500'}`}>الكل</button>
              <button onClick={() => setFilterType(TransactionType.DEBT)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === TransactionType.DEBT ? 'bg-red-600 text-white shadow-md' : 'text-gray-500'}`}>ديون</button>
              <button onClick={() => setFilterType(TransactionType.PAYMENT)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === TransactionType.PAYMENT ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>سداد</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none" placeholder="من" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-700 outline-none" placeholder="إلى" />
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className={`px-4 space-y-3 transition-all ${isFullscreen ? 'mb-24' : ''}`}>
          <div className="flex items-center justify-between mt-4 mb-2 px-1">
            <h3 className="font-bold text-gray-700">سجل العمليات</h3>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{filteredTransactions.length} عملية</span>
          </div>
          
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">لا توجد عمليات تطابق البحث</p>
            </div>
          ) : (
            filteredTransactions.map(tx => {
              const isOverdue = tx.type === TransactionType.DEBT && tx.dueDate && new Date(tx.dueDate) < new Date();
              return (
                <div key={tx.id} className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 ${isOverdue ? 'border-red-200 ring-1 ring-red-50' : 'border-gray-100'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold ${tx.type === TransactionType.DEBT ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {tx.type === TransactionType.DEBT ? '↓' : '↑'}
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-800 text-sm">{tx.description || (tx.type === TransactionType.DEBT ? 'مديونية' : 'سداد')}</p>
                          {isOverdue && <span className="bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded-md font-black">متأخر</span>}
                        </div>
                        <p className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</p>
                        {tx.dueDate && (
                          <p className={`text-[9px] mt-1 font-bold ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                            موعد السداد: {new Date(tx.dueDate).toLocaleDateString('ar-EG')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-black text-sm ${tx.type === TransactionType.DEBT ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.type === TransactionType.DEBT ? '-' : '+'}{tx.amount.toLocaleString()}
                        </span>
                        <div className="flex gap-1">
                          {tx.type === TransactionType.DEBT && (
                            <button onClick={() => sendWhatsAppReminder(tx)} className="p-1.5 text-green-500 hover:bg-green-50 rounded" title="تذكير خاص لهذه العملية">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.852.448-1.271.607-1.444.158-.171.348-.215.464-.215.117 0 .231.001.332.005.106.005.249-.04.391.302.144.35.493 1.201.536 1.287.043.086.072.186.015.3-.058.115-.088.19-.175.291-.086.101-.181.225-.259.302-.086.086-.176.179-.076.35.1.172.444.733.953 1.186.655.584 1.206.765 1.378.852.172.086.273.072.373-.043.1-.115.431-.502.546-.673.115-.172.23-.144.388-.086.158.057 1.003.473 1.176.559.172.086.287.129.33.201.043.072.043.418-.101.823zM12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1zm0 18a7 7 0 1 1 7-7 7.008 7.008 0 0 1-7 7z"/></svg>
                            </button>
                          )}
                          <button onClick={() => handleDeleteTx(tx.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded"><TrashIcon size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      {!isFullscreen && (
        <button onClick={() => setShowAddTx(true)} className="fixed bottom-6 left-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 active:scale-90 z-20">
          <PlusIcon size={28} />
        </button>
      )}

      {/* Add Transaction Modal */}
      {showAddTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-[60]">
          <div className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
            <h2 className="text-xl font-black text-gray-900 mb-6 text-right">تسجيل عملية جديدة</h2>
            <form onSubmit={handleAddTx} className="space-y-4">
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="type" value={TransactionType.DEBT} defaultChecked className="hidden peer" />
                  <div className="text-center py-2.5 rounded-lg peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-red-600 font-bold transition-all text-sm">مبلغ عليه (دين)</div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="type" value={TransactionType.PAYMENT} className="hidden peer" />
                  <div className="text-center py-2.5 rounded-lg peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-green-600 font-bold transition-all text-sm">مبلغ منه (سداد)</div>
                </label>
              </div>

              <div className="text-right">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">المبلغ</label>
                <input type="number" name="amount" required className="block w-full rounded-xl border-gray-200 py-3 px-4 border text-2xl font-black text-blue-700 text-right" placeholder="0" />
              </div>

              <div className="text-right">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">البيان / الوصف</label>
                <input type="text" name="description" className="block w-full rounded-xl border-gray-200 py-3 px-4 border text-sm text-right" placeholder="مثال: شراء بضاعة، دفعة أعمال..." />
              </div>

              <div className="text-right">
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">تاريخ الاستحقاق / تذكير (اختياري)</label>
                <input type="date" name="dueDate" className="block w-full rounded-xl border-gray-200 py-3 px-4 border text-sm text-right font-bold text-gray-700" />
                <p className="text-[10px] text-gray-400 mt-1">سيتم تمييز العملية كمتأخرة إذا لم يتم السداد قبل هذا التاريخ.</p>
              </div>

              <div className="space-y-3 text-right">
                <label className="block text-xs font-bold text-gray-500 uppercase">إرفاق صورة (اختياري)</label>
                <div className="flex gap-3">
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-blue-300 cursor-pointer">
                    <ImageIcon className="text-blue-500" />
                    <span className="text-[10px] font-bold text-gray-500 mt-2">المعرض</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 hover:border-blue-300 cursor-pointer">
                    <CameraIcon className="text-blue-500" />
                    <span className="text-[10px] font-bold text-gray-500 mt-2">الكاميرا</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
                {imgPreview && <img src={imgPreview} className="h-20 w-20 object-cover rounded-xl border mx-auto shadow-sm" />}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-xl font-black text-sm shadow-lg hover:bg-blue-700 active:scale-95 transition-all">حفظ العملية</button>
                <button type="button" onClick={() => setShowAddTx(false)} className="flex-1 bg-gray-50 text-gray-500 py-4 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <h2 className="text-xl font-black text-gray-900 mb-2">حذف العميل؟</h2>
            <p className="text-gray-500 text-sm mb-6">هل أنت متأكد؟ سيتم حذف كافة العمليات المرتبطة بهذا العميل بشكل نهائي.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); onDelete(); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all shadow-md">تأكيد الحذف</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetails;
