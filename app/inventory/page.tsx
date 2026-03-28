'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/components/FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Calendar, 
  CreditCard, 
  ChevronDown, 
  Key, 
  ExternalLink, 
  Tag, 
  Hash,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface Purchase {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  amountPaid: number;
  couponUsed: boolean;
  couponCode: string | null;
  purchaseDate: string;
  quantity: number;
  confirmationKey: string;
  receiptUrl: string;
  status: 'pending' | 'approved' | 'cancelled' | 'refunded';
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', user.uid),
      orderBy('purchaseDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Purchase[];
      setPurchases(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchases');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center justify-center text-center">
        <div className="atmosphere" />
        <Navbar />
        <div className="glass p-8 max-w-md">
          <Clock size={48} className="text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-white/60 mb-6">Você precisa estar logado para visualizar seu inventário.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-12 px-6 relative">
      <div className="atmosphere" />
      <Navbar />

      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 mb-2"
          >
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-primary/30">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Meu <span className="gradient-text">Inventário</span></h1>
              <p className="text-white/40 text-sm">Histórico de compras e chaves de ativação</p>
            </div>
          </motion.div>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass h-20 animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="glass p-12 text-center">
            <Package size={48} className="text-white/10 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhuma compra encontrada</h2>
            <p className="text-white/40">Suas compras aparecerão aqui assim que forem confirmadas.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase, index) => (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass overflow-hidden border border-white/5 hover:border-white/10 transition-colors"
              >
                <button 
                  onClick={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
                  className="w-full p-6 flex items-center justify-between text-left relative group/btn"
                >
                  {/* Hover Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center text-primary border border-white/10 group-hover/btn:border-primary/50 transition-all duration-300">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover/btn:text-primary transition-colors">{purchase.productName}</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                          <Calendar size={12} />
                          {new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          purchase.status === 'approved' ? 'bg-primary/10 text-primary border-primary/20' :
                          purchase.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {purchase.status === 'approved' ? 'Aprovado' :
                           purchase.status === 'pending' ? 'Pendente' :
                           purchase.status === 'cancelled' ? 'Cancelado' : 'Reembolsado'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="hidden sm:block text-right">
                      <p className="text-xl font-bold font-mono tracking-tight">R$ {purchase.amountPaid.toFixed(2)}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Pago</p>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedId === purchase.id ? 180 : 0 }}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover/btn:text-white transition-colors"
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === purchase.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "circOut" }}
                      className="border-t border-white/5 bg-white/[0.02]"
                    >
                      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <DetailItem 
                            icon={<Package size={18} className="text-primary" />} 
                            label="Produto Adquirido" 
                            value={purchase.productName} 
                            subValue={`${purchase.quantity} unidades`}
                          />
                          <DetailItem 
                            icon={<CreditCard size={18} className="text-primary" />} 
                            label="Valor da Transação" 
                            value={`R$ ${purchase.amountPaid.toFixed(2)}`} 
                            subValue={purchase.couponUsed ? `Com desconto aplicado` : 'Preço integral'}
                          />
                          <DetailItem 
                            icon={<Tag size={18} className="text-primary" />} 
                            label="Cupom Utilizado" 
                            value={purchase.couponUsed ? purchase.couponCode || 'CUPOM_VALIDO' : 'Nenhum'} 
                            isBadge={purchase.couponUsed}
                          />
                          <DetailItem 
                            icon={<CheckCircle2 size={18} className="text-primary" />} 
                            label="Status do Pagamento" 
                            value={purchase.status.toUpperCase()} 
                            isBadge={true}
                            subValue={purchase.status === 'approved' ? 'Pagamento confirmado via Mercado Pago' : 'Aguardando confirmação do banco'}
                          />
                        </div>
                        
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
                              <Key size={16} className="text-primary" />
                              Chave de Comprovação
                            </div>
                            <div className="bg-gradient-to-br from-white/5 to-transparent p-4 rounded-2xl border border-white/10 flex items-center justify-between group/key hover:border-primary/30 transition-colors">
                              <span className="font-mono text-sm text-primary font-bold tracking-wider">{purchase.confirmationKey}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(purchase.confirmationKey);
                                  alert("Chave copiada!");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-primary/10 text-[10px] font-bold text-primary hover:bg-primary hover:text-black transition-all duration-300"
                              >
                                COPIAR
                              </button>
                            </div>
                            <p className="text-[10px] text-white/30 italic">Use esta chave para suporte ou resgate manual se necessário.</p>
                          </div>
                          
                          <div className="pt-4">
                            <a 
                              href={purchase.receiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_25px_rgba(0,255,153,0.3)] rounded-2xl text-sm font-bold text-black transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <ExternalLink size={18} />
                              BAIXAR COMPROVANTE FISCAL
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function DetailItem({ 
  icon, 
  label, 
  value, 
  subValue, 
  isBadge 
}: { 
  icon: React.ReactNode, 
  label: string, 
  value: string, 
  subValue?: string,
  isBadge?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-bold text-white/40 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className="flex flex-col">
        <div className={`text-sm font-medium ${isBadge ? 'text-accent' : ''}`}>
          {value}
        </div>
        {subValue && <div className="text-[10px] text-white/30">{subValue}</div>}
      </div>
    </div>
  );
}
