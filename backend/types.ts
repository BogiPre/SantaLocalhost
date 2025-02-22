import { NextFunction } from "express";

export interface Question {
  id: number;
  text: string;
  options: {
    text: string;
    naughtyPoints: number;
  }[];
}

export interface ScanResult {
  name: string;
  verdict: 'NAUGHTY' | 'NICE';
  message: string;
  score: number;
  country?: string;
  timestamp?: Date;
}

export interface ErrorResponse {
  error: {
    message: string;
    status: number;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded';
  services: {
    database: 'connected' | 'disconnected';
    cache: 'connected' | 'disconnected';
  };
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;