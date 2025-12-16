"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceBRL, setPriceBRL] = useState("");
  const [type, setType] = useState("HOUSE");

  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [bathrooms, setBathrooms] = useState<number | "">("");
  const [areaM2, setAreaM2] = useState<number | "">("");
  const [images, setImages] = useState<{ url: string; alt?: string; sortOrder?: number }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/owner/properties/${id}`);
        if (!res.ok) throw new Error("Falha ao carregar imóvel");
        const data = await res.json();
        const p = data.property;
        setTitle(p.title);
        setDescription(p.description);
        setPriceBRL(String(Math.round(p.price / 100)));
        setType(p.type);
        setStreet(p.street);
        setNeighborhood(p.neighborhood || "");
        setCity(p.city);
        setState(p.state);
        setPostalCode(p.postalCode || "");
        setBedrooms(p.bedrooms ?? "");
        setBathrooms(p.bathrooms ?? "");
        setAreaM2(p.areaM2 ?? "");
        const imgs = Array.isArray(p.images) ? p.images.map((im: any, idx: number) => ({ url: im.url, alt: im.alt || "", sortOrder: im.sortOrder ?? idx })) : [];
        setImages(imgs);
      } catch (e: any) {
        setError(e.message || "Erro ao carregar");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        title,
        description,
        price: Math.round(Number(priceBRL) * 100),
        type,
        street,
        neighborhood: neighborhood || null,
        city,
        state,
        postalCode: postalCode || null,
        bedrooms: bedrooms === "" ? null : Number(bedrooms),
        bathrooms: bathrooms === "" ? null : Number(bathrooms),
        areaM2: areaM2 === "" ? null : Number(areaM2),
        images: images.filter((i)=> !!i.url).map((i, idx)=> ({ url: i.url, alt: i.alt || null, sortOrder: i.sortOrder ?? idx })),
      };
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, data: payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Falha ao salvar alterações');
      }
      window.location.href = `/property/${id}`;
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link href={`/owner`} className="text-glass-teal hover:text-blue-800">← Meus imóveis</Link>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Editar imóvel</h1>
        {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
        <form onSubmit={onSave} className="space-y-6 bg-white p-6 rounded-xl shadow">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input className="w-full border rounded px-3 py-2" value={title} onChange={(e)=>setTitle(e.target.value)} required />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Imagens</h2>
            <div className="space-y-4">
              {images.map((img, idx) => (
                <div key={idx} className="border p-4 rounded">
                  <label className="block text-sm font-medium mb-1">URL da imagem {idx+1}</label>
                  <input className="w-full border rounded px-3 py-2" value={img.url} onChange={(e)=>{
                    const v = e.target.value;
                    setImages((arr)=> arr.map((it,i)=> i===idx? { ...it, url: v }: it));
                  }} />
                  <div className="mt-2 flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={async (e)=>{
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const sigRes = await fetch('/api/upload/cloudinary-sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder: 'zillowlike' }) });
                        if (!sigRes.ok) throw new Error('Falha ao assinar upload');
                        const sig = await sigRes.json();
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('api_key', sig.apiKey);
                        fd.append('timestamp', String(sig.timestamp));
                        fd.append('signature', sig.signature);
                        fd.append('folder', sig.folder);
                        const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd });
                        const data = await up.json();
                        if (!up.ok || !data.secure_url) throw new Error('Upload falhou');
                        setImages((arr)=> arr.map((it,i)=> i===idx? { ...it, url: data.secure_url }: it));
                      } catch {}
                    }} />
                    <button type="button" className="text-sm text-red-600" onClick={()=> setImages((arr)=> arr.filter((_,i)=> i!==idx))}>Remover</button>
                  </div>
                </div>
              ))}
              <button type="button" className="w-full border-2 border-dashed rounded p-4" onClick={()=> setImages((arr)=> [...arr, { url: '' }])}>Adicionar imagem</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea className="w-full border rounded px-3 py-2" rows={4} value={description} onChange={(e)=>setDescription(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preço (R$)</label>
              <input className="w-full border rounded px-3 py-2" value={priceBRL} onChange={(e)=>setPriceBRL(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select className="w-full border rounded px-3 py-2" value={type} onChange={(e)=>setType(e.target.value)}>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Apartamento</option>
                <option value="CONDO">Condomínio</option>
                <option value="TOWNHOUSE">Sobrado</option>
                <option value="STUDIO">Studio</option>
                <option value="LAND">Terreno</option>
                <option value="COMMERCIAL">Comercial</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rua</label>
              <input className="w-full border rounded px-3 py-2" value={street} onChange={(e)=>setStreet(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bairro</label>
              <input className="w-full border rounded px-3 py-2" value={neighborhood} onChange={(e)=>setNeighborhood(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input className="w-full border rounded px-3 py-2" value={city} onChange={(e)=>setCity(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input className="w-full border rounded px-3 py-2" value={state} onChange={(e)=>setState(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CEP</label>
              <input className="w-full border rounded px-3 py-2" value={postalCode} onChange={(e)=>setPostalCode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quartos</label>
              <input className="w-full border rounded px-3 py-2" type="number" value={bedrooms} onChange={(e)=>setBedrooms(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banheiros</label>
              <input className="w-full border rounded px-3 py-2" type="number" step="0.5" value={bathrooms} onChange={(e)=>setBathrooms(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Área (m²)</label>
              <input className="w-full border rounded px-3 py-2" type="number" value={areaM2} onChange={(e)=>setAreaM2(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Link href={`/owner`} className="px-4 py-2 border rounded">Cancelar</Link>
            <button type="submit" disabled={saving} className="px-4 py-2 glass-teal text-white rounded disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
