'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/FirebaseProvider';
import { Navbar } from '@/components/Navbar';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Save, X, Package, Ticket, Settings, Clock, DollarSign, Percent, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  amount: number;
  stock: number;
  price: number;
  bonusPercent: number;
  discountPrice?: number;
  discountExpiry?: string;
}

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'coupons'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const productsUnsubscribe = onSnapshot(query(collection(db, 'products'), orderBy('price', 'asc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const couponsUnsubscribe = onSnapshot(query(collection(db, 'coupons'), orderBy('code', 'asc')), (snapshot) => {
      setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'coupons'));

    return () => {
      productsUnsubscribe();
      couponsUnsubscribe();
    };
  }, [isAdmin]);

  const seedProducts = async () => {
    const initialProducts = [
      { name: 'Pacote Inicial', amount: 10, stock: 100, price: 0.01, bonusPercent: 0 },
      { name: 'Pacote Bronze', amount: 50, stock: 50, price: 0.15, bonusPercent: 0 },
      { name: 'Pacote Prata', amount: 100, stock: 30, price: 0.30, bonusPercent: 5 },
      { name: 'Pacote Ouro', amount: 250, stock: 20, price: 0.75, bonusPercent: 10 },
      { name: 'Pacote Diamante', amount: 500, stock: 10, price: 1.50, bonusPercent: 20 },
    ];

    try {
      for (const p of initialProducts) {
        await addDoc(collection(db, 'products'), p);
      }
      setStatus({ type: 'success', message: 'Produtos iniciais adicionados!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao popular produtos.' });
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const handleSaveNew = async () => {
    try {
      const collectionName = activeTab === 'products' ? 'products' : 'coupons';
      
      // Validation
      if (activeTab === 'products') {
        if (!editForm.name || editForm.amount === undefined || editForm.price === undefined || editForm.stock === undefined) {
          setStatus({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
          return;
        }
        if (editForm.price < 0.01 || editForm.price > 1.50) {
          setStatus({ type: 'error', message: 'O preço deve estar entre R$ 0,01 e R$ 1,50.' });
          return;
        }
      } else {
        if (!editForm.code || !editForm.discountPercent) {
          setStatus({ type: 'error', message: 'Preencha todos os campos obrigatórios.' });
          return;
        }
      }

      await addDoc(collection(db, collectionName), editForm);
      setIsAdding(false);
      setEditForm({});
      setStatus({ type: 'success', message: 'Item adicionado com sucesso!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao adicionar item.' });
      handleFirestoreError(error, OperationType.CREATE, activeTab);
    }
  };

  const handleUpdate = async (id: string, collectionName: string) => {
    try {
      const { id: _, ...data } = editForm; // Remove ID from payload
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);
      setIsEditing(null);
      setStatus({ type: 'success', message: 'Item atualizado com sucesso!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao atualizar item.' });
      handleFirestoreError(error, OperationType.UPDATE, collectionName);
    }
  };

  const handleDelete = async (id: string, collectionName: string) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      setStatus({ type: 'success', message: 'Item excluído com sucesso!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao excluir item.' });
      handleFirestoreError(error, OperationType.DELETE, collectionName);
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <main className="min-h-screen pt-24 pb-12 px-6 relative">
      <div className="atmosphere" />
      <Navbar />

      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Painel de <span className="gradient-text">Administração</span></h1>
            <p className="text-white/50">Gerencie seus produtos, cupons e promoções.</p>
          </div>
          
          <div className="flex glass p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              <Package size={18} />
              Produtos
            </button>
            <button 
              onClick={() => setActiveTab('coupons')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'coupons' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              <Ticket size={18} />
              Cupons
            </button>
          </div>
        </header>

        <section className="glass p-8 relative">
          {/* Status Toast */}
          <AnimatePresence>
            {status && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`absolute top-4 right-8 z-20 px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-red-400/20 text-red-400 border border-red-400/30'}`}
              >
                {status.type === 'success' ? <Check size={16} /> : <X size={16} />}
                {status.message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              {activeTab === 'products' ? <Package className="text-primary" /> : <Ticket className="text-primary" />}
              {activeTab === 'products' ? 'Gerenciar Pacotes de Coins' : 'Gerenciar Cupons de Desconto'}
            </h2>
            <div className="flex gap-4">
              {activeTab === 'products' && products.length === 0 && (
                <button 
                  onClick={seedProducts}
                  className="btn-outline !py-2 !px-4 text-sm flex items-center gap-2"
                >
                  Popular Produtos
                </button>
              )}
              <button 
                onClick={() => {
                  setIsAdding(true);
                  setIsEditing(null);
                  setEditForm(activeTab === 'products' ? { name: '', amount: 100, stock: 10, price: 0.10, bonusPercent: 0 } : { code: '', discountPercent: 10, active: true });
                }}
                className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2"
              >
                <Plus size={18} />
                Adicionar {activeTab === 'products' ? 'Pacote' : 'Cupom'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-widest">
                  {activeTab === 'products' ? (
                    <>
                      <th className="pb-4 font-medium">Nome</th>
                      <th className="pb-4 font-medium">Quantidade (MC)</th>
                      <th className="pb-4 font-medium">Estoque</th>
                      <th className="pb-4 font-medium">Preço Base</th>
                      <th className="pb-4 font-medium">Bônus %</th>
                      <th className="pb-4 font-medium">Promoção (R$)</th>
                      <th className="pb-4 font-medium">Expiração</th>
                      <th className="pb-4 font-medium text-right">Ações</th>
                    </>
                  ) : (
                    <>
                      <th className="pb-4 font-medium">Código</th>
                      <th className="pb-4 font-medium">Desconto %</th>
                      <th className="pb-4 font-medium">Status</th>
                      <th className="pb-4 font-medium text-right">Ações</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* New Item Row */}
                {isAdding && (
                  <tr className="border-b border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {activeTab === 'products' ? (
                      <>
                        <td className="py-4">
                          <input 
                            type="text" 
                            placeholder="Nome do Pacote"
                            value={editForm.name} 
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            placeholder="MC"
                            value={editForm.amount} 
                            onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-24"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            placeholder="Estoque"
                            value={editForm.stock} 
                            onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-20"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.price} 
                            onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-20"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            value={editForm.bonusPercent} 
                            onChange={(e) => setEditForm({...editForm, bonusPercent: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-16"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.discountPrice || 0} 
                            onChange={(e) => setEditForm({...editForm, discountPrice: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-20"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="datetime-local" 
                            value={editForm.discountExpiry || ''} 
                            onChange={(e) => setEditForm({...editForm, discountExpiry: e.target.value})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4">
                          <input 
                            type="text" 
                            placeholder="CÓDIGO"
                            value={editForm.code} 
                            onChange={(e) => setEditForm({...editForm, code: e.target.value.toUpperCase()})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 font-mono"
                          />
                        </td>
                        <td className="py-4">
                          <input 
                            type="number" 
                            value={editForm.discountPercent} 
                            onChange={(e) => setEditForm({...editForm, discountPercent: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-16"
                          />
                        </td>
                        <td className="py-4">
                          <select 
                            value={editForm.active ? 'true' : 'false'} 
                            onChange={(e) => setEditForm({...editForm, active: e.target.value === 'true'})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        </td>
                      </>
                    )}
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={handleSaveNew} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"><Save size={18} /></button>
                        <button onClick={() => setIsAdding(false)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )}

                {activeTab === 'products' ? (
                  products.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        {isEditing === p.id ? (
                          <input 
                            type="text" 
                            value={editForm.name} 
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                          />
                        ) : (
                          <span className="font-bold">{p.name}</span>
                        )}
                      </td>
                      <td className="py-4 font-mono">
                        {isEditing === p.id ? (
                          <input 
                            type="number" 
                            value={editForm.amount} 
                            onChange={(e) => setEditForm({...editForm, amount: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-24"
                          />
                        ) : (
                          `${p.amount.toLocaleString()} MC`
                        )}
                      </td>
                      <td className="py-4">
                        {isEditing === p.id ? (
                          <input 
                            type="number" 
                            value={editForm.stock} 
                            onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-20"
                          />
                        ) : (
                          <span className={`${p.stock <= 5 ? 'text-red-400 font-bold' : 'text-white/60'}`}>
                            {p.stock} un.
                          </span>
                        )}
                      </td>
                      <td className="py-4 font-mono">
                        {isEditing === p.id ? (
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.price} 
                            onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-20"
                          />
                        ) : (
                          `R$ ${p.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="py-4">
                        {isEditing === p.id ? (
                          <input 
                            type="number" 
                            value={editForm.bonusPercent} 
                            onChange={(e) => setEditForm({...editForm, bonusPercent: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-16"
                          />
                        ) : (
                          <span className="text-accent font-bold">+{p.bonusPercent}%</span>
                        )}
                      </td>
                      <td className="py-4 font-mono">
                        {isEditing === p.id ? (
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.discountPrice || 0} 
                            onChange={(e) => setEditForm({...editForm, discountPrice: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-20"
                          />
                        ) : (
                          p.discountPrice ? `R$ ${p.discountPrice.toFixed(2)}` : '-'
                        )}
                      </td>
                      <td className="py-4 text-xs text-white/40">
                        {isEditing === p.id ? (
                          <input 
                            type="datetime-local" 
                            value={editForm.discountExpiry || ''} 
                            onChange={(e) => setEditForm({...editForm, discountExpiry: e.target.value})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                          />
                        ) : (
                          p.discountExpiry ? new Date(p.discountExpiry).toLocaleDateString() : '-'
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing === p.id ? (
                            <>
                              <button onClick={() => handleUpdate(p.id, 'products')} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"><Save size={18} /></button>
                              <button onClick={() => setIsEditing(null)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setIsEditing(p.id); setEditForm(p); }} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
                              <button onClick={() => handleDelete(p.id, 'products')} className="p-2 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  coupons.map((c) => (
                    <tr key={c.id} className="border-b border-white/5 group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        {isEditing === c.id ? (
                          <input 
                            type="text" 
                            value={editForm.code} 
                            onChange={(e) => setEditForm({...editForm, code: e.target.value.toUpperCase()})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 font-mono"
                          />
                        ) : (
                          <span className="font-bold font-mono tracking-wider">{c.code}</span>
                        )}
                      </td>
                      <td className="py-4">
                        {isEditing === c.id ? (
                          <input 
                            type="number" 
                            value={editForm.discountPercent} 
                            onChange={(e) => setEditForm({...editForm, discountPercent: Number(e.target.value)})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50 w-16"
                          />
                        ) : (
                          <span className="text-primary font-bold">{c.discountPercent}% OFF</span>
                        )}
                      </td>
                      <td className="py-4">
                        {isEditing === c.id ? (
                          <select 
                            value={editForm.active ? 'true' : 'false'} 
                            onChange={(e) => setEditForm({...editForm, active: e.target.value === 'true'})}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm outline-none focus:border-primary/50"
                          >
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.active ? 'bg-accent/10 text-accent border-accent/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                            {c.active ? 'ATIVO' : 'INATIVO'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing === c.id ? (
                            <>
                              <button onClick={() => handleUpdate(c.id, 'coupons')} className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"><Save size={18} /></button>
                              <button onClick={() => setIsEditing(null)} className="p-2 text-white/40 hover:bg-white/10 rounded-lg transition-colors"><X size={18} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setIsEditing(c.id); setEditForm(c); }} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Edit2 size={18} /></button>
                              <button onClick={() => handleDelete(c.id, 'coupons')} className="p-2 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
