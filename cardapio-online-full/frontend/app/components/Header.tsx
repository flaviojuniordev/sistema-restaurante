export default function Header() {
    return (
        <header className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 shadow-lg">
            <div className="container mx-auto flex items-center gap-4">
                <img src="/logo.webp" alt="Restaurante Sabor" className="h-16 w-16 rounded-full object-cover" />
                <h1 className="text-4xl font-extrabold tracking-tight">Restaurante Sabor</h1>
            </div>
        </header>
    );
}