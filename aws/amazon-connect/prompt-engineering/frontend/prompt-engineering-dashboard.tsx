import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Settings, Save, Play, History, MessageSquare, Phone } from 'lucide-react';

const PromptEngineeringDashboard = () => {
  const [selectedConversationType, setSelectedConversationType] = useState('chat');
  const [currentFlow, setCurrentFlow] = useState('customer_service');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [metrics, setMetrics] = useState([]);
  
  // Simulated metrics data
  const sampleMetrics = [
    { date: '2024-02-01', satisfaction: 85, completion: 92, accuracy: 88 },
    { date: '2024-02-02', satisfaction: 87, completion: 94, accuracy: 90 },
    { date: '2024-02-03', satisfaction: 86, completion: 91, accuracy: 89 },
    { date: '2024-02-04', satisfaction: 88, completion: 93, accuracy: 91 },
    { date: '2024-02-05', satisfaction: 89, completion: 95, accuracy: 92 }
  ];

  useEffect(() => {
    setMetrics(sampleMetrics);
  }, []);

  const ConversationTypeSelector = () => (
    <div className="flex space-x-4 mb-4">
      <Button 
        variant={selectedConversationType === 'chat' ? 'default' : 'outline'}
        onClick={() => setSelectedConversationType('chat')}
        className="flex items-center"
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Chat
      </Button>
      <Button 
        variant={selectedConversationType === 'voice' ? 'default' : 'outline'}
        onClick={() => setSelectedConversationType('voice')}
        className="flex items-center"
      >
        <Phone className="mr-2 h-4 w-4" />
        Voice
      </Button>
    </div>
  );

  const PromptEditor = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Prompt Template Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select value={currentFlow} onValueChange={setCurrentFlow}>
            <SelectTrigger>
              <SelectValue placeholder="Select flow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer_service">Customer Service</SelectItem>
              <SelectItem value="technical_support">Technical Support</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>
          <Textarea 
            placeholder="Enter your prompt template here..."
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            className="h-48"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Configure RAG
            </Button>
            <Button variant="outline" className="flex items-center">
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
            <Button className="flex items-center">
              <Play className="mr-2 h-4 w-4" />
              Test Flow
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ConversationSimulator = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Conversation Simulator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-4 border rounded-lg p-4 overflow-y-auto bg-gray-50">
          {conversationHistory.map((msg, idx) => (
            <div key={idx} className={`mb-2 ${msg.type === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
              <strong>{msg.type === 'user' ? 'User: ' : 'Bot: '}</strong>
              {msg.text}
            </div>
          ))}
        </div>
        <div className="flex space-x-2">
          <Input placeholder="Type a test message..." className="flex-1" />
          <Button>Send</Button>
        </div>
      </CardContent>
    </Card>
  );

  const MetricsDisplay = () => (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="satisfaction" stroke="#8884d8" name="Customer Satisfaction" />
              <Line type="monotone" dataKey="completion" stroke="#82ca9d" name="Task Completion" />
              <Line type="monotone" dataKey="accuracy" stroke="#ffc658" name="Response Accuracy" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Prompt Engineering Dashboard</h1>
      <ConversationTypeSelector />
      
      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Prompt Editor</TabsTrigger>
          <TabsTrigger value="simulator">Simulator</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor">
          <PromptEditor />
        </TabsContent>
        
        <TabsContent value="simulator">
          <ConversationSimulator />
        </TabsContent>
        
        <TabsContent value="metrics">
          <MetricsDisplay />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptEngineeringDashboard;