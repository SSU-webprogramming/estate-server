import { registerAs } from '@nestjs/config';

export default registerAs('clova', () => ({
  apiKey: process.env.CLOVA_API_KEY,
  apiGateway: process.env.CLOVA_API_GATEWAY,
}));
