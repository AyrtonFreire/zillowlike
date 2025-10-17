"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h1>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar esta página.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Voltar para Home
          </Link>
          <Link
            href="/api/auth/signout"
            className="block w-full px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Sair da Conta
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Se você acredita que deveria ter acesso a esta página, entre em
          contato com o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
