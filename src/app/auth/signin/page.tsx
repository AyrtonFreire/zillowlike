"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

const IMAGES = [
  "/hero-login.jpg",
  "/hero-login-2.jpg",
  "/hero-login-3.jpg",
];

export default function SignInPage() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left panel: form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2 mb-10">
            <Image src="/logo.svg" alt="Zillowlike" width={28} height={28} />
            <span className="sr-only">Zillowlike</span>
          </Link>
          <h1 className="text-[28px] leading-8 font-semibold text-gray-900 mb-6">Sign in</h1>
          <div className="space-y-6">
            <button
              onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })}
              className="w-full inline-flex items-center justify-center gap-3 border border-gray-300 hover:border-gray-400 rounded-lg py-3 font-medium text-gray-800 hover:bg-gray-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303C33.602,32.91,29.17,36,24,36c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.682,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.113,0,9.81-1.957,13.363-5.146l-6.175-5.238C29.139,35.091,26.715,36,24,36c-5.146,0-9.489-3.112-11.189-7.444l-6.5,5.02C9.631,39.556,16.337,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.091,3.204-3.513,5.793-6.642,7.115c0.001-0.001,0.002-0.001,0.003-0.002l6.175,5.238C34.496,40.638,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
              Continuar com Google
            </button>
            <p className="text-xs text-gray-500">
              Ao continuar, você concorda com os <Link href="/terms" className="underline hover:text-blue-700">Termos de uso</Link> e a <Link href="/privacy" className="underline hover:text-blue-700">Política de privacidade</Link>.
            </p>
          </div>
        </div>
      </div>
      {/* Right panel: fading carousel */}
      <div className="relative hidden lg:block overflow-hidden">
        {IMAGES.map((src, i) => (
          <Image key={src} src={src} alt="Casa" fill className={`object-cover transition-opacity duration-700 ${i===idx? 'opacity-100' : 'opacity-0'}`} />
        ))}
      </div>
    </main>
  );
}
