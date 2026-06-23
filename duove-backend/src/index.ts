import { config } from './config/env';

console.log('Hello from Duove backend!');
console.log(`Running on port ${config.port} in ${config.nodeEnv} mode`);
