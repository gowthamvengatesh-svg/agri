import { apiCall } from './api';
import type { Survey, SensorReading } from '../types';

export interface SurveyHistoryResponse {
  userId: string;
  count: number;
  surveys: Survey[];
}

export interface SurveyDetailResponse {
  surveyId: string;
  readings: SensorReading[];
  statistics: {
    totalReadings: number;
    nitrogen: { avg: number; min: number; max: number };
    phosphorus: { avg: number; min: number; max: number };
    potassium: { avg: number; min: number; max: number };
    moisture: { avg: number; min: number; max: number };
  };
}

export interface FieldHistoryResponse {
  fieldId: string;
  period: string;
  count: number;
  readings: SensorReading[];
}

// Get user's survey history
export async function getSurveyHistory(limit: number = 50): Promise<SurveyHistoryResponse> {
  return apiCall<SurveyHistoryResponse>(`/history/surveys?limit=${limit}`);
}

// Get detailed survey data with statistics
export async function getSurveyDetails(surveyId: string): Promise<SurveyDetailResponse> {
  return apiCall<SurveyDetailResponse>(`/history/survey/${surveyId}`);
}

// Export survey as CSV
export async function exportSurveyAsCSV(surveyId: string): Promise<Blob> {
  const token = await getAuthToken();
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:4100/api'}/history/survey/${surveyId}/export/csv`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  if (!response.ok) throw new Error('Failed to export CSV');
  return response.blob();
}

// Get field history
export async function getFieldHistory(fieldId: string, days: number = 30, limit: number = 500): Promise<FieldHistoryResponse> {
  return apiCall<FieldHistoryResponse>(
    `/history/field/${fieldId}?days=${days}&limit=${limit}`
  );
}

// Generate CSV from readings
export function generateCSV(readings: SensorReading[], field?: { name: string; crop: string }, survey?: Survey): string {
  const headers = ['Point', 'Nitrogen (mg/kg)', 'Phosphorus (mg/kg)', 'Potassium (mg/kg)', 'Moisture (%)', 'Temperature (°C)', 'EC (dS/m)', 'pH', 'Soil Health (%)', 'Latitude', 'Longitude', 'Time'];
  
  const rows = readings.map((r) => [
    r.pointIndex,
    r.nitrogen,
    r.phosphorus,
    r.potassium,
    r.moisture,
    r.temperature,
    r.ec,
    r.ph,
    r.soilHealth,
    r.gps.lat.toFixed(5),
    r.gps.lng.toFixed(5),
    new Date(r.time).toLocaleString()
  ]);

  // Add metadata
  const metadata = [
    ['AgriSense AI Rover - Survey Report'],
    [],
    ['Field', field?.name ?? 'Unknown'],
    ['Crop', field?.crop ?? 'Unknown'],
    ['Survey Status', survey?.status ?? 'N/A'],
    ['Total Samples', readings.length],
    ['Generated', new Date().toLocaleString()],
    [],
    ['Statistics'],
    ['Metric', 'Average', 'Min', 'Max'],
    ...getStatistics(readings)
  ];

  const csvContent = [
    ...metadata.map(row => row.join(',')),
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

// Calculate statistics for readings
function getStatistics(readings: SensorReading[]): (string | number)[][] {
  if (readings.length === 0) return [];

  const metrics = {
    'Nitrogen': readings.map(r => r.nitrogen),
    'Phosphorus': readings.map(r => r.phosphorus),
    'Potassium': readings.map(r => r.potassium),
    'Moisture': readings.map(r => r.moisture),
  };

  return Object.entries(metrics).map(([name, values]) => [
    name,
    (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
    Math.min(...values).toFixed(2),
    Math.max(...values).toFixed(2)
  ]);
}

// Download CSV file
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

// Helper to get auth token
async function getAuthToken(): Promise<string> {
  const { auth } = await import('../lib/firebase');
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.getIdToken();
}
