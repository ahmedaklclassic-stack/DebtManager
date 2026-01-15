
import React, { useState, useEffect } from 'react';
import { Client, Transaction } from './types';
import Sidebar from './components/Sidebar';
import ClientDetails from './components/ClientDetails';
import Dashboard from './components/Dashboard';
import { PlusIcon, UserIcon, CameraIcon, ImageIcon, TrashIcon, Logo } from './components/Icons';

// نستخدم محاكاة بسيطة للخدمة السحابية في هذا النموذج لضمان العمل البرمجي
// في البيئة الحقيقية، يتم استبدال gapi ببروتوكول المصادقة الفعلي
const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState<{ name: string; phone: string; avatarUrl?: string }>({ name: '', phone: '' });

  // محاكاة تسجيل الدخول والمزامنة
  useEffect(() => {
    const savedUser = localStorage.getItem('debt_manager_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      syncFromCloud();
    }
    
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const syncToCloud = async (data: Client[]) => {
    if (!user) return;
    setIsSyncing(true);
    // محاكاة رفع الملف إلى Google Drive AppData
    console.log('Syncing to Google Drive...');
    localStorage.setItem('debt_manager_data', JSON.stringify(data));
    setTimeout(() => setIsSyncing(false), 800);
  };

  const syncFromCloud = async () => {
    setIsSyncing(true);
    const saved = localStorage.getItem('debt_manager_data');
    if (saved) {
      setClients(JSON.parse(saved));
    }
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const handleGoogleLogin = () => {
    // هنا يتم استدعاء نافذة جوجل الفعلية
    const mockUser = { name: 'مستخدم جوجل', email: 'user@gmail.com' };
    setUser(mockUser);
    localStorage.setItem('debt_manager_user', JSON.stringify(mockUser));
    syncFromCloud();
  };

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج؟ سيتم إيقاف المزامنة السحابية.')) {
      setUser(null);
      localStorage.removeItem('debt_manager_user');
      setClients([]);
    }
  };

  const handleImportContacts = async () => {
    try {
      if ('contacts' in navigator && (navigator as any).contacts.select) {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
        if (contacts.length > 0) {
          setFormData({
            ...formData,
            name: contacts[0].name?.[0] || '',
            phone: contacts[0].tel?.[0] || ''
          });
        }
      } else {
        alert('ميزة استيراد جهات الاتصال غير مدعومة حالياً على هذا المتصفح.');
      }
    } catch (ex) { console.error(ex); }
  };

  const addClient = (name: string, phone: string, avatarUrl?: string) => {
    const newClient: Client = {
      id: Date.now().toString(),
      name,
      phone,
      avatarUrl,
      transactions: [],
      createdAt: new Date().toISOString()
    };
    const updated = [...clients, newClient];
    setClients(updated);
    syncToCloud(updated);
    setIsAddingClient(false);
    setSelectedClientId(newClient.id);
    setFormData({ name: '', phone: '' });
  };

  const addTransaction = (clientId: string, transaction: Omit<Transaction, 'id' | 'date'>) => {
    const updated = clients.map(client => {
      if (client.id === clientId) {
        return {
          ...client,
          transactions: [...client.transactions, { ...transaction, id: Date.now().toString(), date: new Date().toISOString() }]
        };
      }
      return client;
    });
    setClients(updated);
    syncToCloud(updated);
  };

  const deleteTransaction = (clientId: string, transactionId: string) => {
    const updated = clients.map(client => {
      if (client.id === clientId) {
        return { ...client, transactions: client.transactions.filter(t => t.id !== transactionId) };
      }
      return client;
    });
    setClients(updated);
    syncToCloud(updated);
  };

  const deleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    syncToCloud(updated);
    if (selectedClientId === id) setSelectedClientId(null);
  };

  if (!user) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-cairo">
        <Logo size={80} className="mb-6" />
        <h1 className="text-3xl font-black text-blue-700 mb-2">ديوني</h1>
        <p className="text-gray-500 mb-8 max-w-xs">تطبيقك الآمن لإدارة مديونيات العملاء مع مزامنة سحابية فورية</p>
        <button 
          onClick={handleGoogleLogin}
          className="flex items-center gap-4 bg-white border border-gray-300 px-8 py-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 font-bold"
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="Google" />
          <span>تسجيل الدخول ببريد جوجل</span>
        </button>
        <p className="mt-8 text-[10px] text-gray-400">بياناتك سيتم تخزينها بشكل آمن على جوجل درايف الخاص بك</p>
      </div>
    );
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-cairo text-right" dir="rtl">
      <div className={`fixed inset-y-0 right-0 z-40 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:relative md:translate-x-0 w-full md:w-80 shrink-0`}>
        <Sidebar 
          clients={clients} 
          onSelectClient={(id) => { setSelectedClientId(id); if (window.innerWidth < 768) setIsSidebarOpen(false); }} 
          selectedClientId={selectedClientId}
          onAddClick={() => setIsAddingClient(true)}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-blue-600"><UserIcon size={24} /></button>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <h1 className="text-xl font-bold text-blue-700">ديوني</h1>
          </div>
          <div className="w-10 flex justify-center">
            {isSyncing && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
          </div>
        </div>

        {/* Status Bar Desktop */}
        <div className="hidden md:flex items-center justify-end px-6 py-2 bg-gray-100 text-[10px] font-bold text-gray-400 gap-4">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`}></div>
            <span>{isSyncing ? 'جاري المزامنة...' : 'متصل بالسحابة'}</span>
          </div>
          <span className="border-r h-3 border-gray-300"></span>
          <button onClick={handleLogout} className="hover:text-red-500 transition-colors uppercase tracking-widest">{user.email}</button>
        </div>

        {selectedClient ? (
          <ClientDetails 
            client={selectedClient} 
            onAddTransaction={(t) => addTransaction(selectedClient.id, t)}
            onDeleteTransaction={(tId) => deleteTransaction(selectedClient.id, tId)}
            onDelete={() => deleteClient(selectedClient.id)}
            onBack={() => setSelectedClientId(null)}
          />
        ) : (
          <Dashboard clients={clients} onAddClient={() => setIsAddingClient(true)} />
        )}
      </main>

      {/* Add Client Modal */}
      {isAddingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">إضافة عميل جديد</h2>
            <button onClick={handleImportContacts} className="w-full mb-6 flex items-center justify-center gap-2 border-2 border-blue-100 bg-blue-50 text-blue-700 py-3 rounded-xl hover:bg-blue-100 border-dashed transition font-bold">
              <UserIcon size={20} /> استيراد من جهات الاتصال
            </button>
            <form onSubmit={(e) => { e.preventDefault(); addClient(formData.name, formData.phone, formData.avatarUrl); }}>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                    {formData.avatarUrl ? <img src={formData.avatarUrl} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-gray-300" />}
                  </div>
                  <div className="flex gap-2">
                    <label className="bg-white border p-2 rounded-lg cursor-pointer text-xs font-bold"><ImageIcon size={16} /> معرض <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) { const r = new FileReader(); r.onload = () => setFormData({...formData, avatarUrl: r.result as string}); r.readAsDataURL(f); }
                    }} /></label>
                  </div>
                </div>
                <div><label className="block text-sm font-medium">الاسم</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-lg border-gray-300 p-3 border text-right" /></div>
                <div><label className="block text-sm font-medium">الهاتف</label><input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full rounded-lg border-gray-300 p-3 border text-right" /></div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold">حفظ</button>
                <button type="button" onClick={() => setIsAddingClient(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
