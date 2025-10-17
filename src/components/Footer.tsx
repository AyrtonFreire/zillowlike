export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 text-sm text-gray-700">
        <div>
          <div className="font-semibold text-gray-900 mb-2">Zillowlike</div>
          <ul className="space-y-1">
            <li><a className="hover:text-blue-700" href="#">Sobre</a></li>
            <li><a className="hover:text-blue-700" href="#">Carreiras</a></li>
            <li><a className="hover:text-blue-700" href="#">Contato</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-2">Explorar</div>
          <ul className="space-y-1">
            <li><a className="hover:text-blue-700" href="/?city=Petrolina&state=PE">Petrolina</a></li>
            <li><a className="hover:text-blue-700" href="/?city=Juazeiro&state=BA">Juazeiro</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-2">Ajuda</div>
          <ul className="space-y-1">
            <li><a className="hover:text-blue-700" href="#">FAQ</a></li>
            <li><a className="hover:text-blue-700" href="#">Termos</a></li>
            <li><a className="hover:text-blue-700" href="#">Privacidade</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-2">Anunciar</div>
          <ul className="space-y-1">
            <li><a className="hover:text-blue-700" href="/owner/new">Anuncie seu imóvel</a></li>
            <li><a className="hover:text-blue-700" href="#">Encontre um agente</a></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 py-4">© {new Date().getFullYear()} Zillowlike</div>
    </footer>
  );
}
