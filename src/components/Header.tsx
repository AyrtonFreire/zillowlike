"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const user = (session as any)?.user || null;
  const role = (session as any)?.user?.role || (session as any)?.role;

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-black text-blue-600 tracking-tight">
              Zillowlike
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-gray-700">
              <Link href="/" className="hover:text-blue-700 hover:underline underline-offset-8">Comprar</Link>
              <Link href="/" className="hover:text-blue-700 hover:underline underline-offset-8">Alugar</Link>
              <Link href="/" className="hover:text-blue-700 hover:underline underline-offset-8">Vender</Link>
              <Link href="/" className="hover:text-blue-700 hover:underline underline-offset-8">Financiar</Link>
              <Link href="/" className="hover:text-blue-700 hover:underline underline-offset-8">Encontrar agente</Link>
            </nav>
          </div>
          <div className="flex items-center gap-5 text-sm text-gray-700">
            <Link href="/favorites" className="hover:text-blue-700">Favoritos</Link>
            <Link href="/saved-searches" className="hover:text-blue-700">Buscas</Link>
            {status === "loading" ? (
              <span className="text-gray-500">...</span>
            ) : user ? (
              <>
                <span className="hidden sm:inline text-gray-600">Olá, {user.name || user.email || 'usuário'}</span>
                {role === 'ADMIN' && <Link href="/admin" className="hover:text-blue-700">Admin</Link>}
                <button onClick={() => signOut({ callbackUrl: '/' })} className="hover:text-blue-700">Sair</button>
              </>
            ) : (
              <button onClick={() => signIn('google', { callbackUrl: '/', prompt: 'select_account' })} className="hover:text-blue-700">Entrar com Google</button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
