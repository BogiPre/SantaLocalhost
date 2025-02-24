import { Question } from './types';
import { questions } from './data/questions';
import express, { Express, Request, Response } from "express";
import cors from "cors";
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Define Schema
const scanResultSchema = new mongoose.Schema({
  name: String,
  verdict: String,
  message: String,
  score: Number,
  country: String,
  timestamp: { type: Date, default: Date.now },
});

const ScanResult = mongoose.model('ScanResult', scanResultSchema);

// API Routes
app.get("/api/questions", (req: Request, res: Response) => {
  res.json(questions);
});

app.post("/api/scan-results", async (req: Request, res: Response) => {
  try {
    const scanResult = new ScanResult(req.body);
    await scanResult.save();
    res.status(201).json(scanResult);
  } catch (error) {
    console.error('Error saving scan result:', error);
    res.status(500).json({ error: 'Failed to save scan result' });
  }
});

app.get("/api/leaderboard", async (req: Request, res: Response) => {
  try {
    const leaderboard = await ScanResult.find()
      .sort({ score: -1 })
      .limit(100)
      .exec();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Serve static files in production
if (NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Start server after MongoDB connection is established
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    app.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
      console.log(`[server]: Environment is ${NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();