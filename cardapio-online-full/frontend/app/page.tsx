import Header from './components/Header';
import CategorySection from './components/CategorySection';
import Footer from './components/Footer';

async function fetchMenu() {
  try {
    const res = await fetch('http://localhost:3001/api/menu', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Erro ao carregar cardápio: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('Falha no fetch:', error);
    return [];
  }
}

export default async function Home() {
  const menu = await fetchMenu();

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto p-6">
        {menu.length > 0 ? (
          menu.map((section: any, index: number) => (
            <CategorySection key={index} category={section.category} items={section.items} />
          ))
        ) : (
          <p className="text-center text-red-500 text-lg">Não foi possível carregar o cardápio.</p>
        )}
      </main>
      <Footer />
    </>
  );
}