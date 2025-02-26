'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'garcom' });
    const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: 'Entradas' });
    const router = useRouter();

    const fixedCategories = ['Entradas', 'Pratos Principais', 'Bebidas', 'Sobremesas'];

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) router.push('/admin/login');

        const fetchData = async () => {
            try {
                const usersResponse = await fetch('http://localhost:3001/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!usersResponse.ok) throw new Error(`Erro ao buscar usuários: ${usersResponse.status}`);
                const usersData = await usersResponse.json();
                setUsers(Array.isArray(usersData) ? usersData : []);

                const productsResponse = await fetch('http://localhost:3001/api/admin/products', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!productsResponse.ok) throw new Error(`Erro ao buscar produtos: ${productsResponse.status}`);
                const productsData = await productsResponse.json();
                setProducts(Array.isArray(productsData) ? productsData : []);
            } catch (error) {
                console.error('Erro no fetch:', error);
                setUsers([]);
                setProducts([]);
            }
        };

        fetchData();
    }, [router]);

    const addUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('authToken');
        try {
            const res = await fetch('http://localhost:3001/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    newUsername: newUser.username,
                    newPassword: newUser.password,
                    role: newUser.role,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNewUser({ username: '', password: '', role: 'garcom' });
                const updatedData = await fetch('http://localhost:3001/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }).then((res) => res.json());
                setUsers(Array.isArray(updatedData) ? updatedData : []);
            } else {
                alert(data.message || 'Erro ao adicionar usuário');
            }
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            alert('Falha ao adicionar usuário');
        }
    };

    const addProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('authToken');
        const res = await fetch('http://localhost:3001/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...newProduct, price: parseFloat(newProduct.price) }),
        });
        if (res.ok) {
            setNewProduct({ name: '', description: '', price: '', category: 'Entradas' });
            const data = await fetch('http://localhost:3001/api/admin/products', {
                headers: { 'Authorization': `Bearer ${token}` },
            }).then((res) => res.json());
            setProducts(Array.isArray(data) ? data : []);
        } else {
            alert('Erro ao adicionar produto');
        }
    };

    const deleteUser = async (userId: number) => {
        const token = localStorage.getItem('authToken');
        try {
            const res = await fetch(`http://localhost:3001/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const updatedData = await fetch('http://localhost:3001/api/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }).then((res) => res.json());
                setUsers(Array.isArray(updatedData) ? updatedData : []);
            } else {
                alert(data.message || 'Erro ao remover usuário');
            }
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            alert('Falha ao remover usuário');
        }
    };

    const deleteProduct = async (productId: number) => {
        const token = localStorage.getItem('authToken');
        try {
            const res = await fetch(`http://localhost:3001/api/admin/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const updatedData = await fetch('http://localhost:3001/api/admin/products', {
                    headers: { 'Authorization': `Bearer ${token}` },
                }).then((res) => res.json());
                setProducts(Array.isArray(updatedData) ? updatedData : []);
            } else {
                alert(data.message || 'Erro ao remover produto');
            }
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            alert('Falha ao remover produto');
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-8">Área Admin</h1>

            <section className="mb-12 bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Gerenciar Usuários</h2>
                <form onSubmit={addUser} className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="garcom">Garçom</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700">
                        Adicionar
                    </button>
                </form>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((user: any) => (
                                    <tr key={user.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">{user.username}</td>
                                        <td className="p-4">{user.role}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                                                disabled={user.username === 'admin'}
                                            >
                                                Remover
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-500">Nenhum usuário encontrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Gerenciar Produtos</h2>
                <form onSubmit={addProduct} className="mb-6 grid grid-cols-1 sm:grid-cols-6 gap-4">
                    <input
                        type="text"
                        placeholder="Nome"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                        type="text"
                        placeholder="Descrição"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                        type="number"
                        placeholder="Preço"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <select
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        {fixedCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={newProduct.type || 'food'}
                        onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value })}
                        className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="food">Comida</option>
                        <option value="other">Outro</option>
                    </select>
                    <button type="submit" className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700">
                        Adicionar
                    </button>
                </form>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="p-4">Nome</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Preço</th>
                                <th className="p-4">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map((product: any) => (
                                    <tr key={product.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">{product.name}</td>
                                        <td className="p-4">{product.category}</td>
                                        <td className="p-4">R$ {product.price.toFixed(2)}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => deleteProduct(product.id)}
                                                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                                            >
                                                Remover
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-gray-500">Nenhum produto encontrado</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </section>
        </div>
    );
}