'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function GarcomPage() {
    const [menu, setMenu] = useState([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [table, setTable] = useState('');
    const [order, setOrder] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.push('/garcom/login');
            return;
        }

        const fetchMenu = async () => {
            const res = await fetch('http://localhost:3001/api/menu');
            const data = await res.json();
            setMenu(data);
        };

        const fetchOrders = async () => {
            const res = await fetch('http://localhost:3001/api/garcom/orders', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            setOrders(Array.isArray(data) ? data : []);
        };

        fetchMenu();
        fetchOrders();

        socket.on('newOrder', (order) => {
            setOrders((prev) => [...prev, order]);
        });

        socket.on('orderUpdated', (updatedOrder) => {
            setOrders((prev) =>
                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)).filter((o) => o.status !== 'delivered')
            );
        });

        return () => {
            socket.off('newOrder');
            socket.off('orderUpdated');
        };
    }, [router]);

    const addToOrder = (item: any) => {
        setOrder([...order, item]);
    };

    const submitOrder = async () => {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const res = await fetch('http://localhost:3001/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ table, items: order }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
            setOrder([]);
            setTable('');
        } else {
            alert('Erro ao enviar pedido');
        }
    };

    const markDelivered = async (orderId: number) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`http://localhost:3001/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'delivered' }),
        });
        if (!res.ok) alert('Erro ao marcar como entregue');
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">Área do Garçom</h1>

            {/* Formulário de Novo Pedido */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <label className="block text-lg font-medium text-gray-700 mb-2">Número da Mesa</label>
                <input
                    type="text"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    placeholder="Ex.: 5"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menu.map((section: any) =>
                        section.items.map((item: any, index: number) => (
                            <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                                <h2 className="text-xl font-semibold text-gray-800">{item.name}</h2>
                                <p className="text-gray-600 mb-4">{item.description}</p>
                                <p className="text-blue-600 font-bold">R$ {item.price.toFixed(2)}</p>
                                <button
                                    onClick={() => addToOrder(item)}
                                    className="mt-4 w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"
                                >
                                    Adicionar
                                </button>
                            </div>
                        ))
                    )}
                </div>
                {order.length > 0 && (
                    <div className="mt-6">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Novo Pedido - Mesa {table}</h2>
                        <ul className="list-disc pl-5 mb-4">
                            {order.map((item, index) => (
                                <li key={index} className="text-gray-700">{item.name} - R$ {item.price.toFixed(2)}</li>
                            ))}
                        </ul>
                        <button
                            onClick={submitOrder}
                            disabled={loading}
                            className={`w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Enviando...' : 'Enviar Pedido'}
                        </button>
                    </div>
                )}
            </div>

            {/* Pedidos Feitos */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Seus Pedidos</h2>
                {orders.length === 0 ? (
                    <p className="text-gray-600">Nenhum pedido ativo no momento.</p>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="mb-6 p-4 border rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-800">Mesa {order.table}</h3>
                            <p className="text-gray-500 mb-2">Criado em: {new Date(order.created_at).toLocaleString()}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-lg font-medium text-gray-700">Comidas</h4>
                                    <ul className="list-disc pl-5">
                                        {order.items.filter((item: any) => item.type === 'food').map((item: any, index: number) => (
                                            <li key={index} className="text-gray-700">{item.name}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-lg font-medium text-gray-700">Outros</h4>
                                    <ul className="list-disc pl-5">
                                        {order.items.filter((item: any) => item.type === 'other').map((item: any, index: number) => (
                                            <li key={index} className="text-gray-700">{item.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="mt-4">
                                {order.status === 'pending' && <p className="text-yellow-600 font-medium">Aguardando cozinha</p>}
                                {order.status === 'preparing' && <p className="text-orange-600 font-medium">Em preparo</p>}
                                {order.status === 'completed' && (
                                    <div className="flex items-center gap-4">
                                        <p className="text-green-600 font-medium">Seu pedido está pronto!</p>
                                        <button
                                            onClick={() => markDelivered(order.id)}
                                            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
                                        >
                                            OK (Entregue)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}