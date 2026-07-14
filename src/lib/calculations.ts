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

export function soilHealthScore(reading: Pick<SensorReading, 'nitrogen' | 'phosphorus' | 'potassium' | 'moisture'>) {
  const n = normalize(reading.nitrogen, 20, 120);
  const p = normalize(reading.phosphorus, 8, 65);
  const k = normalize(reading.potassium, 40, 220);
  const m = bell(reading.moisture, 36, 24);
  return Math.round(Math.max(0, Math.min(100, n * 0.28 + p * 0.22 + k * 0.25 + m * 0.25)));
}

export function generateAIRecommendation(input: AIInput): AIResult {
  const score = soilHealthScore({
    nitrogen: input.nitrogen,
    phosphorus: input.phosphorus,
    potassium: input.potassium,
    moisture: input.moisture
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
  const deficiency = [lowN && 'Nitrogen Low', lowP && 'Phosphorus Low', lowK && 'Potassium Low', input.moisture < 24 && 'Moisture Low']
    .filter(Boolean)
    .join(', ') || 'No major deficiency detected';
  const quantity = score > 78 ? '40-60 kg/acre maintenance dose' : score > 58 ? '70-90 kg/acre corrected split dose' : '100-120 kg/acre staged recovery plan';
  const irrigation = input.moisture < 24 ? 'Irrigate within 24 hours' : input.moisture < 36 ? 'Maintain regular irrigation cycle' : 'Moisture good, avoid over-irrigation';
  const suitableCrops = score > 72 ? `${crop}, legumes, leafy vegetables` : score > 55 ? `${crop}, millets, pulses` : 'Hardy cover crops, millets, soil-building legumes';
  return {
    fertilizer,
    suitability,
    deficiency,
    soilHealthScore: score,
    quantity,
    irrigation,
    suitableCrops,
    confidence: score > 75 ? 88 : score > 55 ? 74 : 62,
    basis: 'Analysis based on available sensors: NPK and soil moisture.'
  };
}

function normalize(value: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

function bell(value: number, target: number, spread: number) {
  return Math.max(0, 100 - Math.abs(value - target) * (100 / spread));
}
