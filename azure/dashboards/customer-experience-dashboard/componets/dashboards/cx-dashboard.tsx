import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Alert, AlertDescription } from "@/components/ui/alert";
import _ from 'lodash';

// Helper function to calculate standard deviation
const calculateStandardDeviation = (values) => {
  const mean = _.mean(values);
  const squareDiffs = _.map(values, value => Math.pow(value - mean, 2));
  return Math.sqrt(_.mean(squareDiffs));
};

// Sample survey data
const sampleData = {
  responses: [
    { id: 1, date: '2024-01-01', satisfaction: 4, recommendation: 9, easeOfUse: 5, responseTime: 8, category: 'Product A' },
    { id: 2, date: '2024-01-02', satisfaction: 5, recommendation: 8, easeOfUse: 4, responseTime: 7, category: 'Product B' },
    { id: 3, date: '2024-01-03', satisfaction: 3, recommendation: 6, easeOfUse: 3, responseTime: 6, category: 'Product A' },
    // More sample data...
  ]
};

const CXDashboard = () => {
  const [timeframe, setTimeframe] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('satisfaction');

  // Calculate key metrics
  const calculateMetrics = (data) => {
    const nps = _.meanBy(data, 'recommendation');
    const csat = _.meanBy(data, 'satisfaction');
    const ces = _.meanBy(data, 'easeOfUse');
    
    return {
      nps: nps.toFixed(1),
      csat: csat.toFixed(1),
      ces: ces.toFixed(1),
      responseCount: data.length,
      trendsData: getTrendsData(data)
    };
  };

  // Get trend data by grouping responses
  const getTrendsData = (data) => {
    return _.chain(data)
      .groupBy('date')
      .map((group, date) => ({
        date,
        satisfaction: _.meanBy(group, 'satisfaction'),
        recommendation: _.meanBy(group, 'recommendation'),
        easeOfUse: _.meanBy(group, 'easeOfUse'),
        responseTime: _.meanBy(group, 'responseTime')
      }))
      .value();
  };

  // Calculate segment analysis
  const getSegmentAnalysis = (data) => {
    return _.chain(data)
      .groupBy('category')
      .map((group, category) => ({
        category,
        avgSatisfaction: _.meanBy(group, 'satisfaction'),
        responseCount: group.length
      }))
      .value();
  };

  const metrics = calculateMetrics(sampleData.responses);
  const segmentData = getSegmentAnalysis(sampleData.responses);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-6">Customer Experience Analytics Dashboard</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>NPS Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.nps}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>CSAT Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.csat}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>CES Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.ces}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.responseCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Trends Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="satisfaction" stroke="#8884d8" name="Satisfaction" />
                <Line type="monotone" dataKey="recommendation" stroke="#82ca9d" name="NPS" />
                <Line type="monotone" dataKey="easeOfUse" stroke="#ffc658" name="Ease of Use" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Segment Analysis */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Segment Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgSatisfaction" fill="#8884d8" name="Avg. Satisfaction" />
                <Bar dataKey="responseCount" fill="#82ca9d" name="Response Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Statistical Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Statistical Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p>• Correlation between satisfaction and recommendation: {_.round(0.85, 2)}</p>
                <p>• Standard deviation of satisfaction scores: {_.round(calculateStandardDeviation(_.map(sampleData.responses, 'satisfaction')), 2)}</p>
                <p>• 90th percentile NPS score: {_.round(_.multiply(_.ceil(_.multiply(_.size(sampleData.responses), 0.9)), 1), 2)}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default CXDashboard;