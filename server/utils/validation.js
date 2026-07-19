export function validateSensorReading(data) {
  const errors = [];
  
  if (typeof data.nitrogen !== 'number' || data.nitrogen < 0 || data.nitrogen > 200) {
    errors.push('Nitrogen must be a number between 0-200');
  }
  
  if (typeof data.phosphorus !== 'number' || data.phosphorus < 0 || data.phosphorus > 200) {
    errors.push('Phosphorus must be a number between 0-200');
  }
  
  if (typeof data.potassium !== 'number' || data.potassium < 0 || data.potassium > 200) {
    errors.push('Potassium must be a number between 0-200');
  }
  
  if (typeof data.moisture !== 'number' || data.moisture < 0 || data.moisture > 100) {
    errors.push('Moisture must be a number between 0-100');
  }
  
  if (data.temperature !== undefined && (typeof data.temperature !== 'number' || data.temperature < -40 || data.temperature > 60)) {
    errors.push('Temperature must be a number between -40 to 60°C');
  }
  
  if (data.battery !== undefined && (typeof data.battery !== 'number' || data.battery < 0 || data.battery > 100)) {
    errors.push('Battery must be a number between 0-100');
  }
  
  if (errors.length > 0) {
    const err = new Error(errors.join(', '));
    err.name = 'ValidationError';
    throw err;
  }
  
  return true;
}

export function validateCommand(data) {
  const validCommands = ['forward', 'backward', 'left', 'right', 'stop', 'home', 'start_survey', 'stop_survey', 'pause_survey', 'resume_survey'];
  
  if (!validCommands.includes(data.command)) {
    const err = new Error(`Command must be one of: ${validCommands.join(', ')}`);
    err.name = 'ValidationError';
    throw err;
  }
  
  return true;
}

export function validateRoverConfig(data) {
  if (!data.ipAddress || typeof data.ipAddress !== 'string') {
    throw new Error('Valid ipAddress is required');
  }
  
  if (!['WiFi', 'Bluetooth', 'Offline'].includes(data.connectionType)) {
    throw new Error('connectionType must be WiFi, Bluetooth, or Offline');
  }
  
  return true;
}
