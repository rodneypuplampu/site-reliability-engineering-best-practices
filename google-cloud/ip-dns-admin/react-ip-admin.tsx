import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Network, Users, Clock, AlertCircle } from 'lucide-react';

const IPAdminPortal = () => {
  const [cidrBlocks, setCIDRBlocks] = useState([]);
  const [ipRequests, setIPRequests] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('PROD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const environments = [
    { id: 'PROD', name: 'Production' },
    { id: 'DEV', name: 'Development' },
    { id: 'STAGING', name: 'Staging' }
  ];

  useEffect(() => {
    fetchCIDRBlocks();
    fetchIPRequests();
  }, [selectedEnvironment]);

  const fetchCIDRBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cidr-blocks/');
      const data = await response.json();
      setCIDRBlocks(data.filter(block => block.environment === selectedEnvironment));
    } catch (error) {
      setError('Error fetching CIDR blocks');
      console.error('Error fetching CIDR blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIPRequests = async () => {
    try {
      const response = await fetch('/api/ip-requests/');
      const data = await response.json();
      setIPRequests(data);
    } catch (error) {
      console.error('Error fetching IP requests:', error);
    }
  };

  const handleRequestApproval = async (requestId, cidrBlockId) => {
    try {
      await fetch(`/api/ip-requests/${requestId}/process_request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'APPROVE',
          cidr_block_id: cidrBlockId
        })
      });
      fetchIPRequests();
      fetchCIDRBlocks();
    } catch (error) {
      console.error('Error processing request:', error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6" />
            IP Address Management Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            {environments.map(env => (
              <button
                key={env.id}
                onClick={() => setSelectedEnvironment(env.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedEnvironment === env.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {env.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CIDR Blocks Panel */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Network className="w-5 h-5" />
                CIDR Blocks - {environments.find(env => env.id === selectedEnvironment)?.name}
              </h2>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {cidrBlocks.map(block => (
                    <div key={block.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{block.cidr_range}</div>
                          <div className="text-sm text-gray-500">{block.region}</div>
                        </div>
                        <span className={`px-2 py-1 rounded text-sm ${
                          block.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                          block.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {block.status}
                        </span>
                      </div>
                      {block.assigned_to && (
                        <div className="text-sm text-gray-600 mt-2">
                          Assigned to: {block.assigned_to}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* IP Requests Panel */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                IP Range Requests
              </h2>
              <div className="space-y-2">
                {ipRequests.map(request => (
                  <div key={request.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{request.application_name}</div>
                        <div className="text-sm text-gray-500">
                          Environment: {request.environment}
                        </div>
                        <div className="text-sm text-gray-500">
                          Size: /{request.subnet_size}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-sm ${
                        request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Purpose: {request.purpose}
                    </div>
                    {request.status === 'PENDING' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleRequestApproval(request.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IPAdminPortal;