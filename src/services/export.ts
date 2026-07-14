import type { Field, SensorReading, Survey } from '../types';

export function exportCSV(readings: SensorReading[]) {
  const headers = ['Point', 'Nitrogen', 'Phosphorus', 'Potassium', 'Moisture', 'Temperature', 'EC', 'pH', 'Soil Health', 'Latitude', 'Longitude', 'Time'];
  const rows = readings.map((r) => [r.pointIndex, r.nitrogen, r.phosphorus, r.potassium, r.moisture, r.temperature, r.ec, r.ph, r.soilHealth, r.gps.lat, r.gps.lng, r.time]);
  download([headers, ...rows].map((row) => row.join(',')).join('\n'), 'text/csv', 'agrisense-report.csv');
}

export function exportPDF(field: Field | undefined, survey: Survey | undefined, readings: SensorReading[]) {
  const html = `
    <html><head><title>AgriSense Report</title><style>
    body{font-family:Inter,Arial,sans-serif;padding:32px;color:#142117} h1{color:#2E7D32} table{border-collapse:collapse;width:100%}td,th{border:1px solid #d8ead9;padding:8px;text-align:left}
    </style></head><body>
    <h1>AgriSense AI Rover Report</h1>
    <h2>${field?.name ?? 'Field'} - ${field?.crop ?? ''}</h2>
    <p>Samples: ${readings.length} | Survey: ${survey?.status ?? 'n/a'} | Generated: ${new Date().toLocaleString()}</p>
    <table><thead><tr><th>Point</th><th>N</th><th>P</th><th>K</th><th>Moisture</th><th>pH</th><th>Health</th></tr></thead>
    <tbody>${readings.map((r) => `<tr><td>${r.pointIndex}</td><td>${r.nitrogen}</td><td>${r.phosphorus}</td><td>${r.potassium}</td><td>${r.moisture}%</td><td>${r.ph}</td><td>${r.soilHealth}</td></tr>`).join('')}</tbody></table>
    <p><strong>Recommendation:</strong> Balance low nutrient zones, irrigate below 28% moisture, and rescan after application.</p>
    </body></html>`;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

function download(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
