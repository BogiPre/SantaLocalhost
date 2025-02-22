import express, { Request, Response, NextFunction, RequestHandler } from "express";
import cors from "cors";
import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import compression from 'compression';
import { ReadPreferenceMode } from 'mongodb';
import { questions } from './data/questions';
import type { Question, ScanResult as ScanResultType, HealthCheckResponse } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Constants
const CACHE_VERSION = 1;
const STALE_TTL = 600; // 10 minutes for stale-while-revalidate
const CACHE_DURATION = 300; // 5 minutes for fresh cache

// MongoDB Connection Options
const mongoOptions = {
  maxPoolSize: 150,
  minPoolSize: 20,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  writeConcern: { w: 1, j: true, wtimeout: 5000 },
  readPreference: 'secondaryPreferred' as ReadPreferenceMode
};

// Redis Configuration
const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 10000,
    keepAlive: 5000,
    reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000)
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
};

// Redis Client Setup
let redisClient: ReturnType<typeof createClient> | null = null;
let redisHealthy = false;

const setupRedis = async () => {
  const client = createClient(redisConfig);
  
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
    redisHealthy = false;
  });
  
  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
    redisHealthy = false;
  });
  
  client.on('ready', async () => {
    console.log('Redis client ready and healthy');
    try {
      await client.ping();
      redisHealthy = true;
    } catch (error) {
      redisHealthy = false;
    }
  });

  try {
    await client.connect();
    redisClient = client;
    redisHealthy = true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    redisClient = null;
    redisHealthy = false;
  }
};

// MongoDB Schema
const scanResultSchema = new mongoose.Schema({
  name: { type: String, index: true, required: true },
  verdict: { type: String, enum: ['NAUGHTY', 'NICE'], index: true, required: true },
  message: String,
  score: { type: Number, index: true, required: true },
  country: { type: String, index: true, sparse: true },
  timestamp: { type: Date, default: Date.now, index: true }
}, { 
  timestamps: true,
  autoIndex: NODE_ENV === 'development'
});

// Indexes
scanResultSchema.index({ score: -1, timestamp: -1 });
scanResultSchema.index({ country: 1, score: -1 });
scanResultSchema.index({ verdict: 1, score: -1 });

const ScanResult = mongoose.model<ScanResultType>('ScanResult', scanResultSchema);

// Compression Configuration
const compressionOptions = {
  level: 6,
  threshold: 0,
  filter: (req: express.Request, res: express.Response) => {
    if (req.headers['x-no-compression']) return false;
    if (req.path.startsWith('/api')) return true;
    return compression.filter(req, res);
  },
  chunkSize: 16384
};


// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(compression(compressionOptions));

// Performance Tracking
const trackPerformance: express.RequestHandler = (req, res, next) => {
  const start = process.hrtime();
  res.locals.getElapsedTime = () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    return Math.round((seconds * 1000 + nanoseconds / 1000000) * 100) / 100;
  };
  next();
};

// Enhanced Cache Middleware
const enhancedCache: express.RequestHandler = async (req, res, next) => {
  if (!redisClient?.isOpen || !redisHealthy) {
    res.locals.cacheStatus = 'MISS';
    return next();
  }

  const cacheKey = `v${CACHE_VERSION}:leaderboard`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const parsedData = JSON.parse(cached);
      
      // Background refresh
      (async () => {
        try {
          const freshData = await fetchFreshData();
          await redisClient.setEx(cacheKey, CACHE_DURATION, JSON.stringify(freshData));
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      })();

      res.set({
        'X-Cache': 'HIT',
        'Cache-Control': `public, max-age=${CACHE_DURATION}, stale-while-revalidate=${STALE_TTL}`,
        'Content-Type': 'application/json',
        'Vary': 'Accept-Encoding',
        'Content-Encoding': 'gzip'
      });
      return res.json(parsedData);
    }
    
    res.locals.cacheKey = cacheKey;
    res.locals.cacheStatus = 'MISS';
    next();
  } catch (error) {
    console.error('Cache error:', error);
    res.locals.cacheStatus = 'MISS';
    next();
  }
};

// Route Handlers
const getQuestions: express.RequestHandler = async (req, res) => {
  const responseData = {
    data: questions,
    metadata: {
      total: questions.length,
      timestamp: new Date().toISOString()
    }
  };

  if (redisClient?.isOpen && redisHealthy) {
    await redisClient.setEx(`v${CACHE_VERSION}:questions`, 3600, JSON.stringify(responseData));
  }

  res.set({
    'Cache-Control': 'public, max-age=3600, must-revalidate',
    'X-Response-Time': `${res.locals.getElapsedTime()}ms`,
    'X-Cache': 'MISS',
    'Vary': 'Accept-Encoding'
  });
  res.json(responseData);
};

const postScanResults: express.RequestHandler = async (req, res, next) => {
  try {
    const scanResult = new ScanResult(req.body);
    await scanResult.save();
    
    if (redisClient?.isOpen && redisHealthy) {
      await redisClient.del(`v${CACHE_VERSION}:leaderboard`);
    }
    
    res.set({ 
      'X-Response-Time': `${res.locals.getElapsedTime()}ms`,
      'X-MongoDB-Index': 'true',
      'Cache-Control': 'no-store',
      'Vary': 'Accept-Encoding'
    });
    
    res.status(201).json(scanResult);
  } catch (error) {
    next(error);
  }
};

const getLeaderboard: express.RequestHandler = async (req, res, next) => {
  try {
    const leaderboard = await ScanResult.find()
      .select('name score verdict country timestamp')
      .sort({ score: -1 })
      .limit(100)
      .lean()
      .exec();

    const responseData = {
      data: leaderboard,
      metadata: {
        total: leaderboard.length,
        timestamp: new Date().toISOString(),
        source: 'database'
      }
    };

    if (redisClient?.isOpen && redisHealthy) {
      await redisClient.setEx(`v${CACHE_VERSION}:leaderboard`, CACHE_DURATION, JSON.stringify(responseData));
    }

    res.set({
      'X-Cache': 'MISS',
      'X-Response-Time': `${res.locals.getElapsedTime()}ms`,
      'X-MongoDB-Time': Date.now() - res.locals.startTime,
      'X-MongoDB-Index': 'true',
      'Cache-Control': `public, max-age=${CACHE_DURATION}, stale-while-revalidate=${STALE_TTL}`,
      'Vary': 'Accept-Encoding',
      'Content-Type': 'application/json'
    });

    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

// Routes
app.get("/api/questions", trackPerformance, getQuestions);
app.post("/api/scan-results", trackPerformance, postScanResults);
app.get("/api/leaderboard", trackPerformance, enhancedCache, getLeaderboard);

// Error Handler
const errorHandler: express.ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: {
      message: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      status: 500
    }
  });
};

app.use(errorHandler);

// Server Startup
const startServer = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/santascanner',
      mongoOptions
    );
    await setupRedis();
    
    app.listen(port, () => {
      console.log(`Server running on port ${port} in ${NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();