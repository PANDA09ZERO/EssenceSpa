import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="font-display text-7xl font-bold text-brand-green/30">404</h1>
        <h2 className="font-display text-2xl font-bold mt-4">Página no encontrada</h2>
        <p className="text-brand-text-light mt-2">Lo sentimos, la página que buscas no existe.</p>
        <Link href="/dashboard" className="btn-primary inline-block mt-6">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
