import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calendar, ChevronDown, ChevronUp, Search, Phone, Users, Clock, MessageSquare, BarChart2, Filter } from 'lucide-react';

// Mock data - in a real implementation, this would come from your API
const mockCallData = [
  { hour: '00:00', inbound: 12, outbound: 5, abandoned: 2 },
  { hour: '01:00', inbound: 8, outbound: 3, abandoned: 1 },
  { hour: '02:00', inbound: 5, outbound: 2, abandoned: 0 },
  { hour: '03:00', inbound: 3, outbound: 1, abandoned: 0 },
  { hour: '04:00', inbound: 4, outbound: 2, abandoned: 1 },
  { hour: '05:00', inbound: 7, outbound: 3, abandoned: 1 },
  { hour: '06:00', inbound: 15, outbound: 7, abandoned: 3 },
  { hour: '07:00', inbound: 28, outbound: 12, abandoned: 5 },
  { hour: '08:00', inbound: 42, outbound: 18, abandoned: 7 },
  { hour: '09:00', inbound: 65, outbound: 32, abandoned: 11 },
  { hour: '10:00', inbound: 78, outbound: 41, abandoned: 14 },
  { hour: '11:00', inbound: 84, outbound: 45, abandoned: 12 },
  { hour: '12:00', inbound: 76, outbound: 38, abandoned: 10 },
  { hour: '13:00', inbound: 82, outbound: 43, abandoned: 13 },
  { hour: '14:00', inbound: 87, outbound: 47, abandoned: 15 },
  { hour: '15:00', inbound: 75, outbound: 36, abandoned: 11 },
  { hour: '16:00', inbound: 68, outbound: 32, abandoned: 9 },
  { hour: '17:00', inbound: 52, outbound: 24, abandoned: 7 },
  { hour: '18:00', inbound: 43, outbound: 18, abandoned: 5 },
  { hour: '19:00', inbound: 36, outbound: 15, abandoned: 4 },
  { hour: '20:00', inbound: 28, outbound: 12, abandoned: 3 },
  { hour: '21:00', inbound: 22, outbound: 10, abandoned: 2 },
  { hour: '22:00', inbound: 18, outbound: 8, abandoned: 1 },
  { hour: '23:00', inbound: 14, outbound: 6, abandoned: 1 }
];

const mockIntentData = [
  { intent: 'Check Order Status', count: 245 },
  { intent: 'Technical Support', count: 187 },
  { intent: 'Billing Question', count: 156 },
  { intent: 'Product Information', count: 132 },
  { intent: 'Return Request', count: 98 }
];

const mockQueueData = [
  { queue: 'General Support', calls: 312, waitTime: 124 },
  { queue: 'Technical Support', calls: 245, waitTime: 156 },
  { queue: 'Billing', calls: 187, waitTime: 98 },
  { queue: 'Sales', calls: 142, waitTime: 62 },
  { queue: 'Customer Service', calls: 203, waitTime: 112 }
];

const mockContactRecords = [
  { 
    id: 'c123456789', 
    timestamp: '2025-02-24T09:45:23', 
    ani: '+14155552671', 
    dnis: '+18005551234', 
    queue: 'Technical Support', 
    agent: 'John Doe', 
    duration: 245, 
    waitTime: 43,
    status: 'Completed'
  },
  { 
    id: 'c123456790', 
    timestamp: '2025-02-24T10:12:45', 
    ani: '+12065559876', 
    dnis: '+18005551234', 
    queue: 'Billing', 
    agent: 'Jane Smith', 
    duration: 183, 
    waitTime: 62,
    status: 'Completed'
  },
  { 
    id: 'c123456791', 
    timestamp: '2025-02-24T10:34:12', 
    ani: '+16505557890', 
    dnis: '+18005551234', 
    queue: 'General Support', 
    agent: 'Mike Johnson', 
    duration: 317, 
    waitTime: 28,
    status: 'Completed'
  },
  { 
    id: 'c123456792', 
    timestamp: '2025-02-24T11:05:56', 
    ani: '+19175554567', 
    dnis: '+18005551234', 
    queue: 'Technical Support', 
    agent: 'Sarah Williams', 
    duration: 452, 
    waitTime: 75,
    status: 'Completed'
  },
  { 
    id: 'c123456793', 
    timestamp: '2025-02-24T11:23:34', 
    ani: '+13235556789', 
    dnis: '+18005551234', 
    queue: 'Sales', 
    agent: 'Robert Brown', 
    duration: 186, 
    waitTime: 22,
    status: 'Completed'
  },
  { 
    id: 'c123456794', 
    timestamp: '2025-02-24T11:45:09', 
    ani: '+14085552345', 
    dnis: '+18005551234', 
    queue: 'Customer Service', 
    agent: 'Lisa Chen', 
    duration: 274, 
    waitTime: 48,
    status: 'Completed'
  },
  { 
    id: 'c123456795', 
    timestamp: '2025-02-24T12:02:18', 
    ani: '+16175558901', 
    dnis: '+18005551234', 
    queue: 'Billing', 
    agent: 'David Miller', 
    duration: 321, 
    waitTime: 56,
    status: 'Completed'
  }
];

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Dashboard component
const Dashboard = () => {
  const [dateRange, setDateRange] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Calculate summary metrics
  const totalInboundCalls = mockCallData.reduce((sum, item) => sum + item.inbound, 0);
  const totalOutboundCalls = mockCallData.reduce((sum, item) => sum + item.outbound, 0);
  const totalAbandonedCalls = mockCallData.reduce((sum, item) => sum + item.abandoned, 0);
  const averageWaitTime = mockQueueData.reduce((sum, item) => sum + item.waitTime, 0) / mockQueueData.length;
  
  // Filter contacts based on search query
  const filteredContacts = mockContactRecords.filter(contact => 
    contact.id.includes(searchQuery) || 
    contact.ani.includes(searchQuery) || 
    contact.dnis.includes(searchQuery) || 
    contact.queue.toLowerCase().includes(searchQuery.toLowerCase()) || 
    contact.agent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6" />
              <h1 className="text-xl font-bold">Amazon Connect Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  className="flex items-center space-x-1 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
                  onClick={() => setDateRange(dateRange === 'today' ? 'week' : 'today')}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{dateRange === 'today' ? 'Today' : 'This Week'}</span>
                  {dateRange === 'today' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <button 
                  className="flex items-center space-x-1 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {filterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {filterOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10">
                    <div className="p-3">
                      <h3 className="font-semibold mb-2">Filter Options</h3>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm text-gray-700">Queue</label>
                          <select className="w-full px-2 py-1 border rounded text-sm text-gray-700">
                            <option value="">All Queues</option>
                            <option value="technical">Technical Support</option>
                            <option value="billing">Billing</option>
                            <option value="sales">Sales</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700">Agent</label>
                          <select className="w-full px-2 py-1 border rounded text-sm text-gray-700">
                            <option value="">All Agents</option>
                            <option value="john">John Doe</option>
                            <option value="jane">Jane Smith</option>
                            <option value="mike">Mike Johnson</option>
                          </select>
                        </div>
                        <div className="pt-2 border-t flex justify-end">
                          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Apply</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex">
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'contacts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('contacts')}
            >
              Contact Records
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'analytics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'reports' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Calls Today</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{totalInboundCalls + totalOutboundCalls}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-md">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-sm text-green-500 font-medium">+12% </span>
                  <span className="text-sm text-gray-500 ml-1">from yesterday</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Agents</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">18</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-md">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-sm text-green-500 font-medium">+2 </span>
                  <span className="text-sm text-gray-500 ml-1">agents from yesterday</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg. Wait Time</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{Math.floor(averageWaitTime / 60)}m {averageWaitTime % 60}s</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-md">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-sm text-red-500 font-medium">+15% </span>
                  <span className="text-sm text-gray-500 ml-1">from yesterday</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Abandoned Rate</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{((totalAbandonedCalls / totalInboundCalls) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-md">
                    <BarChart2 className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-sm text-green-500 font-medium">-2.3% </span>
                  <span className="text-sm text-gray-500 ml-1">from yesterday</span>
                </div>
              </div>
            </div>
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Call Volume by Hour Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800">Call Volume by Hour</h2>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockCallData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="inbound" stroke="#0088FE" name="Inbound" strokeWidth={2} />
                      <Line type="monotone" dataKey="outbound" stroke="#00C49F" name="Outbound" strokeWidth={2} />
                      <Line type="monotone" dataKey="abandoned" stroke="#FF8042" name="Abandoned" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Top Intents Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800">Top Lex Intents</h2>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockIntentData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="intent" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Queue Performance */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Queue Performance</h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Call Volume</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Wait Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockQueueData.map((queue, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{queue.queue}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{queue.calls}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.floor(queue.waitTime / 60)}m {queue.waitTime % 60}s</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${queue.waitTime < 120 ? 'bg-green-100 text-green-800' : queue.waitTime < 180 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {queue.waitTime < 120 ? 'Within SLA' : queue.waitTime < 180 ? 'At Risk' : 'SLA Breached'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-800">Contact Records</h1>
              <div className="relative w-64">
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg" 
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-2.5">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ANI</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNIS</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queue</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContacts.map((contact) => (
                      <tr key={contact.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{contact.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(contact.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.ani}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.dnis}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.queue}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.agent}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Math.floor(contact.duration / 60)}m {contact.duration % 60}s
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredContacts.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No contacts found matching your search criteria.
                </div>
              )}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing <span className="font-medium">{filteredContacts.length}</span> results
                </div>
                <div className="flex space-x-2">
                  <button className="bg-white px-3 py-1 border rounded text-gray-600 hover:bg-gray-50">Previous</button>
                  <button className="bg-blue-600 px-3 py-1 border border-blue-600 rounded text-white hover:bg-blue-700">Next</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-800">Analytics & Insights</h1>
              <div className="flex space-x-3">
                <select className="px-3 py-2 border rounded-lg">
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="thisweek">This Week</option>
                  <option value="lastweek">Last Week</option>
                  <option value="thismonth">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Export
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inbound vs Outbound Pie Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800">Call Distribution</h2>
                <div className="h-64 mt-4 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Inbound', value: totalInboundCalls },
                          { name: 'Outbound', value: totalOutboundCalls },
                          { name: 'Abandoned', value: totalAbandonedCalls }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[0, 1, 2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Queue Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800">Queue Distribution</h2>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockQueueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="queue" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="calls" fill="#8884d8" name="Call Volume" />
                      <Bar dataKey="waitTime" fill="#82ca9d" name="Wait Time (s)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Analytics Summary */}
              <div className="col-span-1 lg:col-span-2 bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-800">Analytics Summary</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Top Performing Agent</h3>
                    <p className="mt-1 text-lg font-semibold">Jane Smith</p>
                    <p className="text-sm text-gray-500">42 calls handled today</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Busiest Queue</h3>
                    <p className="mt-1 text-lg font-semibold">Technical Support</p>
                    <p className="text-sm text-gray-500">245 calls today</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Peak Hours</h3>
                    <p className="mt-1 text-lg font-semibold">10:00 AM - 2:00 PM</p>
                    <p className="text-sm text-gray-500">42% of total call volume</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
              <div className="flex space-x-3">
                <button className="bg-white border px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50">
                  Schedule Report
                </button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Generate Report
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Available Reports</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium text-gray-900">Agent Performance</h3>
                    <p className="mt-1 text-sm text-gray-500">Detailed metrics on agent productivity and call handling.</p>
                  </div>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium text-gray-900">Queue Analytics</h3>
                    <p className="mt-1 text-sm text-gray-500">Wait times, abandonment rates, and service levels by queue.</p>
                  </div>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium text-gray-900">Call Volume Trends</h3>
                    <p className="mt-1 text-sm text-gray-500">Historical call patterns by hour, day, and month.</p>
                  </div>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium text-gray-900">Lex Bot Performance</h3>
                    <p className="mt-1 text-sm text-gray-500">Intent recognition rates and conversation flows.</p>
                  </div>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium text-gray-900">Customer Interaction</h3>
                    <p className="mt-1 text-sm text-gray-500">Detailed transcripts and conversation metrics.</p>
                  </div>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-medium text-gray-900">SLA Compliance</h3>
                    <p className="mt-1 text-sm text-gray-500">Service level agreement metrics and breach analysis.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-800">Recent Reports</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Daily Call Summary</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Feb 24, 2025 06:00 AM</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">System</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">CSV</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">Download</button>
                        <button className="text-gray-600 hover:text-gray-900">View</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Weekly Agent Performance</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Feb 23, 2025 11:30 PM</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Admin User</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PDF</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">Download</button>
                        <button className="text-gray-600 hover:text-gray-900">View</button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Queue SLA Report</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Feb 23, 2025 08:15 AM</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">John Manager</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Excel</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">Download</button>
                        <button className="text-gray-600 hover:text-gray-900">View</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 Amazon Connect Dashboard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;