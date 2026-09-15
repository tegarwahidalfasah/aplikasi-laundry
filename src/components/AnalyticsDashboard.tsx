'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, DollarSign, Users } from 'lucide-react';
import type { Order } from '@/lib/catalog';

interface AnalyticsDashboardProps {
  orders: Order[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard({ orders }: AnalyticsDashboardProps) {
  // Helper functions
  const getFinalPrice = (order: Order) => {
    if (order.finalPrice !== undefined) return order.finalPrice;
    const discount = order.discount || 0;
    return order.totalPrice - (order.totalPrice * discount / 100);
  };

  const filterActiveOrders = (orders: Order[]) => 
    orders.filter(o => o.status !== 'Dibatalkan');

  // 1. Revenue Analytics (Last 7 days)
  const revenueData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.createdAt.startsWith(date) && o.status !== 'Dibatalkan');
      const revenue = dayOrders.reduce((sum, o) => sum + getFinalPrice(o), 0);
      return {
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        revenue: Math.round(revenue),
        orders: dayOrders.length
      };
    });
  }, [orders]);

  // 2. Service Type Distribution
  const serviceData = React.useMemo(() => {
    const activeOrders = filterActiveOrders(orders);
    const serviceCount: Record<string, number> = {};
    
    activeOrders.forEach(order => {
      serviceCount[order.serviceType] = (serviceCount[order.serviceType] || 0) + 1;
    });

    return Object.entries(serviceCount).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // 3. Status Distribution
  const statusData = React.useMemo(() => {
    const statusCount: Record<string, number> = {};
    
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });

    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // 4. Top Customers
  const topCustomers = React.useMemo(() => {
    const customerSpending: Record<string, { total: number; orders: number }> = {};
    
    filterActiveOrders(orders).forEach(order => {
      if (!customerSpending[order.customerName]) {
        customerSpending[order.customerName] = { total: 0, orders: 0 };
      }
      customerSpending[order.customerName].total += getFinalPrice(order);
      customerSpending[order.customerName].orders += 1;
    });

    return Object.entries(customerSpending)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [orders]);

  // Summary Stats
  const stats = React.useMemo(() => {
    const activeOrders = filterActiveOrders(orders);
    const totalRevenue = activeOrders.reduce((sum, o) => sum + getFinalPrice(o), 0);
    const totalCompensation = orders.reduce((sum, o) => sum + (o.compensation || 0), 0);
    const cancelledOrders = orders.filter(o => o.status === 'Dibatalkan').length;
    
    return {
      totalRevenue: Math.round(totalRevenue),
      totalOrders: orders.length,
      activeOrders: activeOrders.length,
      cancelledOrders,
      totalCompensation: Math.round(totalCompensation),
      avgOrderValue: activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Pendapatan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                Rp {stats.totalRevenue.toLocaleString('id-ID')}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Pesanan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500">{stats.activeOrders} aktif • {stats.cancelledOrders} batal</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pelanggan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{topCustomers.length}</p>
              <p className="text-xs text-gray-500">Top spender</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rata-rata/Order</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                Rp {stats.avgOrderValue.toLocaleString('id-ID')}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Pendapatan 7 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} name="Pendapatan" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Distribusi Layanan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {serviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Status Pesanan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" name="Jumlah Pesanan" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">5 Pelanggan Teratas</h3>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => (
              <div key={customer.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-500' :
                    'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">{customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{customer.orders} pesanan</p>
                  </div>
                </div>
                <p className="font-bold text-green-600">Rp {customer.total.toLocaleString('id-ID')}</p>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-center text-gray-500 py-8">Belum ada data pelanggan</p>
            )}
          </div>
        </div>
      </div>

      {/* Compensation Warning */}
      {stats.totalCompensation > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">⚠️ Total Kompensasi Diberikan</h3>
          <p className="text-red-700 dark:text-red-300">
            Rp {stats.totalCompensation.toLocaleString('id-ID')} telah diberikan sebagai kompensasi untuk {stats.cancelledOrders} pesanan yang dibatalkan/dirasakan rugi.
          </p>
        </div>
      )}
    </div>
  );
}
