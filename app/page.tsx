'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { useAuth } from '@/components/FirebaseProvider';
import { db, handleFirestoreError, OperationType, auth, googleProvider } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, X, Ticket, Check, ArrowRight, Wallet, QrCode, Copy, CheckCircle2, LogIn } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  amount: number;
  stock: number;
  price: number;
  bonusPercent?: number;
  discountPrice?: number;
  discountExpiry?: string;
}

interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
}

export default function StorePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [paymentStep, setPaymentStep] = useState(0); // 0: Summary, 1: Payment
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{ qr_code: string, qr_code_base64: string, id: string } | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData.sort((a, b) => a.price - b.price));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setCouponError('Cupom inválido ou expirado.');
        setAppliedCoupon(null);
      } else {
        const couponData = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        } as Coupon;
        setAppliedCoupon(couponData);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setCouponError('Erro ao validar cupom.');
    }
  };

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    const basePrice = selectedProduct.discountPrice || selectedProduct.price;
    let total = basePrice * purchaseQuantity;
    if (appliedCoupon) {
      total = total * (1 - appliedCoupon.discountPercent / 100);
    }
    return total;
  };

  const handleGeneratePix = async () => {
    if (!user || !selectedProduct) return;
    
    setIsGeneratingPix(true);
    try {
      const response = await fetch('/api/checkout/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: calculateTotal(),
          description: `Compra de ${selectedProduct.name} (${purchaseQuantity}x) - MC Coins`,
          userEmail: user.email,
          userId: user.uid,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Checkout API Error Data:', data);
        throw new Error(data.error || `Erro do servidor (${response.status})`);
      }

      setPixData(data);
      setPaymentStep(1);
    } catch (error: any) {
      console.error('Error generating Pix:', error);
      alert(error.message || 'Erro ao gerar Pix. Verifique se o MP_ACCESS_TOKEN está configurado.');
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedProduct) return;
    
    setIsProcessing(true);
    try {
      const confirmationKey = pixData?.id || Math.random().toString(36).substring(2, 15).toUpperCase();
      
      await addDoc(collection(db, 'purchases'), {
        userId: user.uid,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        amountPaid: calculateTotal(),
        couponUsed: !!appliedCoupon,
        couponCode: appliedCoupon?.code || null,
        purchaseDate: new Date().toISOString(),
        quantity: purchaseQuantity,
        confirmationKey: confirmationKey,
        status: 'pending',
        receiptUrl: pixData?.id 
          ? `https://www.mercadopago.com.br/payments/${pixData.id}/receipt`
          : `https://mercadopago.com.br/receipt/${confirmationKey}`,
        createdAt: serverTimestamp()
      });

      // Reset and close
      setSelectedProduct(null);
      setPaymentStep(0);
      setPurchaseQuantity(1);
      setAppliedCoupon(null);
      setCouponCode('');
      setPixData(null);
      
      // Redirect or show success (optional, here we just close)
      alert("Pagamento confirmado! Verifique seu inventário.");
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert('Erro ao processar pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-12 px-6 relative">
      <div className="atmosphere" />
      <Navbar />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-16 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -z-10"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Servidor Online & Ativo</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-black tracking-tighter mb-6 leading-none"
          >
            LOJA DE <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient-x">COINS</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Aumente seu poder no servidor com MC Coins. 
            <span className="text-white"> Entrega instantânea</span> via Pix e bônus exclusivos em cada pacote!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 group">
              <CheckCircle2 size={18} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Entrega Automática</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 group">
              <Wallet size={18} className="text-secondary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Pagamento Seguro</span>
            </div>
          </motion.div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass h-80 animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard 
                  product={product} 
                  onBuy={(p) => {
                    setSelectedProduct(p);
                    setPurchaseQuantity(1);
                    setPaymentStep(0);
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Checkout Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass max-w-md w-full p-8 relative z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/30">
                    <ShoppingBag size={20} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Finalizar Compra</h2>
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              {paymentStep === 0 ? (
                <>
                  {/* Product Info */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-white/50">Item Selecionado</span>
                      <span className="text-xs font-bold text-accent">+{selectedProduct.bonusPercent}% BÔNUS</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">{selectedProduct.name}</span>
                      <span className="font-mono text-lg">R$ {(selectedProduct.discountPrice || selectedProduct.price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-white/40">{selectedProduct.amount.toLocaleString()} MC Coins</p>
                      <div className="flex items-center gap-3 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                        <button 
                          onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                          className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                        >
                          -
                        </button>
                        <span className="text-sm font-mono w-4 text-center">{purchaseQuantity}</span>
                        <button 
                          onClick={() => setPurchaseQuantity(Math.min(selectedProduct.stock, purchaseQuantity + 1))}
                          className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="mb-8">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">
                      CUPOM DE DESCONTO
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                          <Ticket size={16} />
                        </div>
                        <input 
                          type="text" 
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="CÓDIGO"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:border-primary/50 outline-none transition-colors uppercase font-mono"
                        />
                      </div>
                      <button 
                        onClick={handleApplyCoupon}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                    {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
                    {appliedCoupon && (
                      <div className="flex items-center gap-2 text-accent text-xs mt-2 font-bold">
                        <Check size={14} />
                        CUPOM APLICADO: {appliedCoupon.discountPercent}% OFF
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-white/10 pt-6 mb-8">
                    <div className="flex justify-between items-center mb-2 text-sm text-white/60">
                      <span>Subtotal ({purchaseQuantity}x)</span>
                      <span className="font-mono">R$ {((selectedProduct.discountPrice || selectedProduct.price) * purchaseQuantity).toFixed(2)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between items-center mb-2 text-sm text-accent">
                        <span>Desconto ({appliedCoupon.discountPercent}%)</span>
                        <span className="font-mono">- R$ {((selectedProduct.discountPrice || selectedProduct.price) * purchaseQuantity * appliedCoupon.discountPercent / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xl font-bold mt-4">
                      <span>Total</span>
                      <span className="text-primary font-mono tracking-tight">R$ {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action */}
                  {user ? (
                    <button 
                      onClick={handleGeneratePix}
                      disabled={isGeneratingPix}
                      className="w-full btn-primary flex items-center justify-center gap-3 group disabled:opacity-50"
                    >
                      {isGeneratingPix ? (
                        "GERANDO PIX..."
                      ) : (
                        <>
                          <Wallet size={20} />
                          PAGAR AGORA
                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={handleLogin}
                      className="w-full btn-primary flex items-center justify-center gap-3 group bg-accent hover:bg-accent/80"
                    >
                      <LogIn size={20} />
                      FAÇA LOGIN PARA COMPRAR
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-full bg-white rounded-2xl p-6 mb-6 flex flex-col items-center gap-4">
                    <div className="bg-black/5 p-4 rounded-xl">
                      {pixData?.qr_code_base64 ? (
                        <img 
                          src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                          alt="QR Code Pix" 
                          className="w-48 h-48"
                        />
                      ) : (
                        <QrCode size={180} className="text-black" />
                      )}
                    </div>
                    <p className="text-black/60 text-xs font-medium">
                      Escaneie o QR Code acima com o app do seu banco
                    </p>
                  </div>

                  <div className="w-full mb-8">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block text-left">
                      PIX COPIA E COLA
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs font-mono truncate text-white/60">
                        {pixData?.qr_code || "Gerando código..."}
                      </div>
                      <button 
                        onClick={() => {
                          if (pixData?.qr_code) {
                            navigator.clipboard.writeText(pixData.qr_code);
                            alert("Copiado!");
                          }
                        }}
                        disabled={!pixData?.qr_code}
                        className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-3">
                    <button 
                      onClick={handleConfirmPayment}
                      disabled={isProcessing}
                      className="w-full btn-primary flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        "PROCESSANDO..."
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          CONFIRMAR PAGAMENTO
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setPaymentStep(0)}
                      className="text-white/40 text-xs hover:text-white transition-colors"
                    >
                      Voltar para o resumo
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-center text-white/30 mt-6 uppercase tracking-widest">
                Pagamento seguro via Mercado Pago / Pix
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
