"use client";
import React, { useState } from "react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { buildSearchParams } from "@/lib/url";

export default function HeroSearch() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = buildSearchParams({ q, type, minPrice, maxPrice, bedroomsMin, sort: "recent", page: 1, pageSize: 12 });
    router.push(`/?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur rounded-2xl shadow-card p-3 sm:p-6 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-3">
      <Input label="Cidade, Região ou País" placeholder="Ex: Petrolina, PE" value={q} onChange={(e)=>setQ(e.target.value)} />
      <Select label="Tipo" value={type} onChange={(e)=>setType(e.target.value)}>
        <option value="">Todos</option>
        <option value="HOUSE">Casa</option>
        <option value="APARTMENT">Apartamento</option>
        <option value="CONDO">Condomínio</option>
        <option value="STUDIO">Studio</option>
        <option value="LAND">Terreno</option>
        <option value="COMMERCIAL">Comercial</option>
      </Select>
      <Input label="Preço mín" placeholder="R$" value={minPrice} onChange={(e)=>setMinPrice(e.target.value.replace(/\D/g, ""))} />
      <Input label="Preço máx" placeholder="R$" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value.replace(/\D/g, ""))} />
      <Select label="Quartos" value={bedroomsMin} onChange={(e)=>setBedroomsMin(e.target.value)}>
        <option value="">Qualquer</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="5">5+</option>
      </Select>
      <div className="sm:col-span-5">
        <Button type="submit" className="w-full sm:w-auto sm:ml-auto">Buscar</Button>
      </div>
    </form>
  );
}
