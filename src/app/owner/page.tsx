import { getServerSession } from "next-auth";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { buildPropertyPath } from "@/lib/slug";

export default async function OwnerDashboardPage() {
  const session = await getServerSession();
  const userId = (session as any)?.user?.id || (session as any)?.userId || (session as any)?.user?.sub;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Área do proprietário</h1>
          <p className="text-gray-600 mb-4">Faça login para ver e gerenciar seus imóveis.</p>
          <Link className="text-blue-600 hover:text-blue-800" href="/">← Voltar</Link>
        </div>
      </div>
    );
  }

  const properties = await prisma.property.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-blue-600 hover:text-blue-800">← Voltar à busca</Link>
            <Link href="/start" className="glass-teal text-white px-4 py-2 rounded-lg hover:bg-blue-700">Novo imóvel</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Seus imóveis</h1>

        {properties.length === 0 ? (
          <div className="text-gray-600">Você ainda não cadastrou imóveis.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm border">
                <div className="aspect-w-16 aspect-h-12">
                  {p.images[0]?.url ? (
                    <Image src={p.images[0].url} alt={p.title} width={800} height={480} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-gray-100" />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-500 mb-1">{p.city}/{p.state}</div>
                  <div className="font-semibold line-clamp-2 mb-2">{p.title}</div>
                  <div className="text-blue-600 font-bold mb-3">R$ {(p.price / 100).toLocaleString("pt-BR")}</div>
                  <div className="flex gap-4 items-center">
                    <Link href={buildPropertyPath(p.id, p.title)} className="text-sm text-blue-600 hover:text-blue-800" aria-label={`Ver ${p.title}`}>Ver</Link>
                    <Link href={`/owner/edit/${p.id}`} className="text-sm text-gray-700 hover:text-gray-900" aria-label={`Editar ${p.title}`}>Editar</Link>
                    <form action={async () => {
                      "use server";
                      const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
                      await fetch(`${base}/api/properties`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: p.id }),
                      });
                      revalidatePath("/owner");
                    }}>
                      <button type="submit" className="text-sm text-red-600 hover:text-red-800" aria-label={`Excluir ${p.title}`}>Excluir</button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
