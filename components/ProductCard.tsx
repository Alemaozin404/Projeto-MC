'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Coins, Zap, ShoppingCart, LogIn } from 'lucide-react';
import { useAuth } from './FirebaseProvider';

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

interface ProductCardProps {
  product: Product;
  onBuy: (product: Product) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  const { user } = useAuth();
  const hasDiscount = product.discountPrice && product.discountPrice > 0;
  const currentPrice = hasDiscount ? product.discountPrice : product.price;

  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="glass p-6 flex flex-col gap-6 relative overflow-hidden group"
    >
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/40 transition-all duration-700" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 blur-3xl rounded-full group-hover:bg-secondary/30 transition-all duration-700" />
      
      {/* Animated Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center text-primary border border-white/10 group-hover:border-primary/50 transition-all duration-300 shadow-inner group-hover:shadow-primary/20">
          <Coins size={28} className="group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
        </div>
        {product.bonusPercent && product.bonusPercent > 0 && (
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: ["0 0 0px rgba(255,153,0,0)", "0 0 20px rgba(255,153,0,0.4)", "0 0 0px rgba(255,153,0,0)"]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-gradient-to-r from-accent/30 to-primary/30 text-accent text-[10px] font-bold px-3 py-1 rounded-full border border-accent/30 flex items-center gap-1 uppercase tracking-wider"
          >
            <Zap size={10} className="animate-pulse" />
            +{product.bonusPercent}% BÔNUS
          </motion.div>
        )}
      </div>

      <div className="flex flex-col gap-1 relative z-10">
        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors duration-300 bg-clip-text group-hover:bg-gradient-to-r from-white to-primary">{product.name}</h3>
        <p className="text-white/50 text-sm font-mono tracking-tighter group-hover:text-white/70 transition-colors duration-300">
          {product.amount.toLocaleString()} MC COINS
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between relative z-10">
        <div className="flex flex-col">
          {hasDiscount && (
            <span className="text-white/30 text-xs line-through font-mono">
              R$ {product.price.toFixed(2)}
            </span>
          )}
          <span className="text-2xl font-bold font-mono tracking-tight text-white group-hover:text-primary transition-colors duration-300">
            R$ {currentPrice?.toFixed(2)}
          </span>
          {product.stock <= 5 && product.stock > 0 && (
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1 animate-pulse flex items-center gap-1">
              <span className="w-1 h-1 bg-red-400 rounded-full" />
              Apenas {product.stock} em estoque!
            </span>
          )}
        </div>
        
        <button 
          onClick={() => onBuy(product)}
          disabled={product.stock <= 0}
          className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 transform active:scale-90 group/btn relative overflow-hidden ${
            product.stock <= 0 
              ? 'bg-white/5 border-white/5 text-white/10 cursor-not-allowed' 
              : 'bg-white/5 hover:bg-gradient-to-br hover:from-primary hover:to-secondary border-white/10 hover:border-primary text-white group-hover/btn:text-white hover:shadow-[0_0_20px_rgba(255,78,0,0.5)]'
          }`}
        >
          {product.stock <= 0 ? (
            <span className="text-[10px] font-bold">OFF</span>
          ) : !user ? (
            <LogIn size={20} className="group-hover/btn:scale-110 transition-transform" />
          ) : (
            <ShoppingCart size={20} className="group-hover/btn:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Hover Line */}
      <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient-x w-0 group-hover:w-full transition-all duration-700" />
    </motion.div>
  );
}
