'use client';

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function Cozinha() {
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/kitchen')
            .then((res) => res.json())
            .then((data) => setOrders(data));

        socket.on('newOrder', (order) => {
            setOrders((prev) => [...prev, order]);
        });

        socket.on('orderUpdated', (updatedOrder) => {
            setOrders((prev) =>
                prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)).filter((order) => order.status !== 'completed')
            );
        });

        return () => {
            socket.off('newOrder');
            socket.off('orderUpdated');
        };
    }, []);

    const updateStatus = async (orderId: number, newStatus: string) => {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`http://localhost:3001/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) alert('Erro ao atualizar status');
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">Cozinha</h1>
            {orders.length === 0 ? (
                <p className="text-gray-600 text-center text-lg bg-gray-200 p-4 rounded-lg">Nenhum pedido pendente no momento.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className={`p-6 rounded-xl shadow-lg ${order.status === 'pending' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 'bg-green-50 border-l-4 border-green-500'
                                }`}
                        >
                            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Mesa {order.table}</h2>
                            <ul className="list-disc pl-5 mb-4">
                                {order.items.map((item: any, index: number) => (
                                    <li key={index} className="text-gray-700">{item.name} - R$ {item.price.toFixed(2)}</li>
                                ))}
                            </ul>
                            <p className="text-gray-500 mb-4">Criado em: {new Date(order.created_at).toLocaleString()}</p>
                            <div className="flex gap-4">
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'preparing')}
                                        className="bg-yellow-600 text-white p-2 rounded-lg hover:bg-yellow-700"
                                    >
                                        Preparar
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button
                                        onClick={() => updateStatus(order.id, 'completed')}
                                        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700"
                                    >
                                        Concluir
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}