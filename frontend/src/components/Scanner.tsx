import React, { useState, useEffect } from 'react';
import type { ScanResult } from '../types';
import type { Question } from '../types';
import NameInput from './NameInput';
import ScanningAnimation from './ScanningAnimation';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Scanner: React.FC = () => {
  const [name, setName] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/questions');
        if (!response.ok) {
          throw new Error('Failed to fetch questions');
        }
        const data = await response.json();
        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to load questions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleNameSubmit = (submittedName: string) => {
    setName(submittedName);
  };

  const handleShowLeaderboard = () => {
    navigate('/leaderboard');
  };

  const handleAnswer = (naughtyPoints: number) => {
    setAnswers([...answers, naughtyPoints]);
    
    if (currentQuestion === questions.length - 1) {
      setIsScanning(true);
      setTimeout(calculateResult, 12000);
    } else {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const calculateResult = async () => {
    const totalPoints = answers.reduce((sum, points) => sum + points, 0);
    const maxPoints = questions.length * 10;
    const score = (maxPoints - totalPoints) / maxPoints * 100;

    const verdict: ScanResult = {
      name: name,
      verdict: score >= 50 ? 'NICE' : 'NAUGHTY',
      score: Math.round(score),
      message: getResultMessage(score)
    };

    try {
      const countryResponse = await fetch('https://ipapi.co/json/');
      const countryData = await countryResponse.json();
      if (countryData.status === 'success') {
        verdict.country = countryData.countryCode;
      }
    } catch (err) {
      console.error('Failed to fetch country:', err);
    }

    setResult(verdict);
    setIsScanning(false);

    try {
      await fetch('/api/scan-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verdict),
      });
    } catch (error) {
      console.error("Failed to save scan result", error);
    }
  };

  const getResultMessage = (score: number): string => {
    if (score >= 90) return `${name}, you're practically an elf! Santa's very proud!`;
    if (score >= 70) return `${name}, you've made the Nice list with flying colors!`;
    if (score >= 50) return `${name}, you just made the Nice list - keep it up!`;
    if (score >= 30) return `${name}, you're on the Naughty list, but there's still hope!`;
    return `${name}, coal for you this year! Time to turn things around!`;
  };

  const resetScan = () => {
    setName('');
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading Santa's Scanner...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!name) {
    return <NameInput onSubmit={handleNameSubmit} onLeaderboard={handleShowLeaderboard} />;
  }

  if (isScanning) {
    return <ScanningAnimation name={name} />;
  }

  if (result) {
    return (
      <div className="text-center space-y-6">
        <h2 className={`text-4xl font-bold ${
          result.verdict === 'NICE' ? 'text-green-600' : 'text-red-600'
        }`}>
          {result.verdict}!
        </h2>
        <p className="text-xl">{result.message}</p>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full ${
              result.verdict === 'NICE' ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${result.score}%` }}
          ></div>
        </div>
        <p className="text-gray-600">Christmas Spirit Score: {result.score}%</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={resetScan}
            className="mt-8 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Scan Another Person
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="mt-8 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length || currentQuestion >= questions.length) {
    return (
      <div className="text-center">
        <p className="text-red-600 mb-4">Something went wrong with the questions.</p>
        <button
          onClick={resetScan}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Start Over
        </button>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-red-700">
        Question {currentQuestion + 1} of {questions.length}
      </h2>
      <p className="text-xl text-center text-gray-700">{currentQ.text}</p>
      <div className="space-y-3">
        {currentQ.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option.naughtyPoints)}
            className="w-full p-4 text-left rounded-lg border-2 border-red-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Scanner;