"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function EmergencyLogout() {
  useEffect(() => {
    // Force complete logout and clear everything
    const performLogout = async () => {
      try {
        // Sign out from NextAuth
        await signOut({ 
          redirect: false,
          callbackUrl: "/"
        });
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Clear localStorage
        localStorage.clear();
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Wait a bit then redirect
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } catch (error) {
        console.error("Logout error:", error);
      }
    };
    
    performLogout();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Limpando Sessão...
        </h1>
        <p className="text-gray-600 mb-6">
          Fazendo logout e limpando todos os dados de autenticação.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
          <p className="font-semibold text-blue-900 mb-2">O que está sendo feito:</p>
          <ul className="space-y-1 text-blue-800">
            <li>✓ Logout do NextAuth</li>
            <li>✓ Limpeza de cookies</li>
            <li>✓ Limpeza de localStorage</li>
            <li>✓ Limpeza de sessionStorage</li>
            <li>✓ Redirecionamento para home</li>
          </ul>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Você será redirecionado em instantes...
        </p>
      </div>
    </div>
  );
}
