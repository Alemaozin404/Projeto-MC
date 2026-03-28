'use client';

import React from 'react';
import { useAuth } from './FirebaseProvider';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import { LogIn, LogOut, User as UserIcon, Shield, Package } from 'lucide-react';
import { motion } from 'motion/react';

export function Navbar() {
  const { user, isAdmin } = useAuth();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center font-bold text-xl shadow-lg">
            MC
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">
            MINECRAFT<span className="text-primary">STORE</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <Link 
              href="/inventory" 
              className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              <Package size={18} />
              <span className="hidden md:block">Inventário</span>
            </Link>
          )}

          {isAdmin && (
            <Link 
              href="/admin" 
              className="flex items-center gap-2 text-sm font-medium text-accent hover:opacity-80 transition-opacity"
            >
              <Shield size={18} />
              <span className="hidden md:block">Painel Admin</span>
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                {user.photoURL ? (
                  <Image 
                    src={user.photoURL} 
                    alt={user.displayName || ''} 
                    width={24} 
                    height={24} 
                    className="rounded-full" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon size={16} />
                )}
                <span className="text-sm font-medium hidden md:block">{user.displayName?.split(' ')[0]}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 btn-primary !py-2 !px-4 text-sm"
            >
              <LogIn size={18} />
              Entrar
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
