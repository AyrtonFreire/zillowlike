"use client";

import { useState } from "react";

export default function ContactForm({ propertyId }: { propertyId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOk(null);
    setErr(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, name, email, phone, message }),
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao enviar.');
      setOk('Mensagem enviada com sucesso! Entraremos em contato.');
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } catch (e: any) {
      setErr(e?.message || 'Não foi possível enviar agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {ok && <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">{ok}</div>}
      {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{err}</div>}
      <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Seu nome" value={name} onChange={(e)=>setName(e.target.value)} required />
      <input className="w-full border rounded px-3 py-2 text-sm" type="email" placeholder="Seu e-mail" value={email} onChange={(e)=>setEmail(e.target.value)} required />
      <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Telefone (opcional)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
      <textarea className="w-full border rounded px-3 py-2 text-sm" rows={4} placeholder="Mensagem" value={message} onChange={(e)=>setMessage(e.target.value)} required />
      <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded text-sm">{loading ? 'Enviando...' : 'Enviar mensagem'}</button>
    </form>
  );
}
