import type { AIInput, AIResult, Field, SensorReading } from '../types';

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function computeField(input: Pick<Field, 'length' | 'width' | 'samplingDistance'>) {
  const area = input.length * input.width;
  const distance = Math.max(input.samplingDistance, 1);
  const samplingPoints = Math.max(1, Math.ceil(area / (distance * distance)));
  const estimatedSurveyTime = Math.ceil(samplingPoints * 1.7);
  const estimatedBattery = Math.min(100, Math.ceil(12 + samplingPoints * 0.8));
  return { area, samplingPoints, estimatedSurveyTime, estimatedBattery };
}

export function soilHealthScore(reading: Pick<SensorReading, 'nitrogen' | 'phosphorus' | 'potassium' | 'moisture' | 'ph' | 'ec'>) {
  const n = normalize(reading.nitrogen, 20, 120);
  const p = normalize(reading.phosphorus, 8, 65);
  const k = normalize(reading.potassium, 40, 220);
  const m = bell(reading.moisture, 36, 24);
  const ph = bell(reading.ph, 6.7, 1.8);
  const ec = 100 - normalize(Math.abs(reading.ec - 1.2), 0, 3) * 0.65;
  return Math.round(Math.max(0, Math.min(100, n * 0.2 + p * 0.16 + k * 0.18 + m * 0.2 + ph * 0.16 + ec * 0.1)));
}

export function generateAIRecommendation(input: AIInput): AIResult {
  const score = soilHealthScore({
    nitrogen: input.nitrogen,
    phosphorus: input.phosphorus,
    potassium: input.potassium,
    moisture: input.moisture,
    ph: input.ph,
    ec: input.ec
  });
  const lowN = input.nitrogen < 55;
  const lowP = input.phosphorus < 28;
  const lowK = input.potassium < 95;
  const fertilizer = [
    lowN ? 'increase nitrogen with split urea application' : 'maintain nitrogen',
    lowP ? 'add phosphorus-rich basal fertilizer' : 'phosphorus is adequate',
    lowK ? 'supplement potash before irrigation' : 'potassium reserve is stable'
  ].join(', ');
  const crop = input.crop.trim() || 'Selected crop';
  const suitability = score > 78 ? `${crop} suitability is high` : score > 58 ? `${crop} suitability is moderate with corrections` : `${crop} needs soil recovery before scale-up`;
  const deficiency = [lowN && 'Nitrogen', lowP && 'Phosphorus', lowK && 'Potassium', input.ph < 5.8 && 'Acidic pH', input.moisture < 24 && 'Low moisture']
    .filter(Boolean)
    .join(', ') || 'No major deficiency detected';
  return { fertilizer, suitability, deficiency, soilHealthScore: score };
}

function normalize(value: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function bell(value: number, target: number, spread: number) {
  return Math.max(0, 100 - Math.abs(value - target) * (100 / spread));
}
