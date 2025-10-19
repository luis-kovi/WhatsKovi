import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

redis.on('error', (error) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Redis] connection error', error);
  }
});

export default redis;
