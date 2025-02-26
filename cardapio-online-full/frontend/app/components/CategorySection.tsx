import MenuItem from './MenuItem';

type CategorySectionProps = {
    category: string;
    items: { name: string; description: string; price: number }[];
};

export default function CategorySection({ category, items }: CategorySectionProps) {
    return (
        <section className="mb-12">
            <h2 className="text-3xl font-semibold text-gray-800 mb-6 bg-gray-200 p-3 rounded-lg shadow-sm">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, index) => (
                    <MenuItem key={index} {...item} />
                ))}
            </div>
        </section>
    );
}