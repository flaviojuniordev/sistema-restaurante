type MenuItemProps = {
    name: string;
    description: string;
    price: number;
};

export default function MenuItem({ name, description, price }: MenuItemProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{name}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
            <p className="text-green-700 font-bold text-lg">R$ {price.toFixed(2)}</p>
        </div>
    );
}