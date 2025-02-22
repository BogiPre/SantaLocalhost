import React, { useEffect, useState } from 'react';

interface LeaderboardProps {
    onNavigateBack?: () => void;
}

interface Person {
    id: number;
    name: string;
    score: number;
    country?: string;
    verdict: 'NAUGHTY' | 'NICE';
    timestamp: string;
}

const getCountryFlag = (countryCode: string) => {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-red-600';
};

const getScoreMessage = (score: number) => {
    if (score >= 70) return 'Nice!';
    if (score >= 30) return 'Could Be Better';
    return 'Naughty!';
};

const Leaderboard: React.FC<LeaderboardProps> = ({ onNavigateBack }) => {
    const [leaderboard, setLeaderboard] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userCountry, setUserCountry] = useState<string | null>(null);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

    const fetchLeaderboard = async (showLoadingState = false) => {
        if (showLoadingState) {
            setIsRefreshing(true);
        }
        
        try {
            const response = await fetch('/api/leaderboard');
            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }
            const data = await response.json();
            setLeaderboard(data);
            setLastUpdateTime(new Date());
            setError(null);
        } catch (err) {
            console.error('Leaderboard fetch error:', err);
            setError('Failed to fetch leaderboard data');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    // Initial load and polling setup
    useEffect(() => {
        fetchLeaderboard(true);

        // Set up polling every 10 seconds
        const intervalId = setInterval(() => {
            fetchLeaderboard(false);
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);

    // Fetch user's country
    useEffect(() => {
        const fetchUserCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_code) {
                    setUserCountry(data.country_code);
                }
            } catch (err) {
                console.error('Failed to fetch country:', err);
            }
        };

        fetchUserCountry();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
                <p className="mt-4 text-gray-600">Loading leaderboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-600 text-center mb-4">{error}</div>
                <button
                    onClick={() => fetchLeaderboard(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onNavigateBack}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                    ← Back to Scanner
                </button>
                
                <button
                    onClick={() => fetchLeaderboard(true)}
                    className="px-4 py-2 text-sm font-medium text-red-700 border border-red-700 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                    disabled={isRefreshing}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-center text-red-700 mb-6 sm:mb-8">
                Santa's Naughty or Nice List
            </h1>

            {lastUpdateTime && (
                <p className="text-center text-gray-500 text-sm mb-4">
                    Last updated: {lastUpdateTime.toLocaleTimeString()}
                </p>
            )}

            {userCountry && (
                <p className="text-center text-gray-600 mb-4">
                    Your location: {getCountryFlag(userCountry)}
                </p>
            )}

            <div className="space-y-4">
                {leaderboard.map((person, index) => (
                    <div 
                        key={index}
                        className="p-3 sm:p-4 bg-white rounded-lg shadow-md border-2 border-red-200 transition-all hover:border-red-300"
                    >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm">#{index + 1}</span>
                                    <h3 className="text-lg sm:text-xl font-semibold truncate">
                                        {person.name}
                                    </h3>
                                    {person.country && (
                                        <span 
                                            className="text-xl flex-shrink-0" 
                                            title={person.country}
                                        >
                                            {getCountryFlag(person.country)}
                                        </span>
                                    )}
                                </div>
                                <p className={`font-medium ${getScoreColor(person.score)}`}>
                                    {getScoreMessage(person.score)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(person.timestamp).toLocaleString()}
                                </p>
                            </div>
                            <div className="w-full sm:w-32">
                                <div className="w-full bg-gray-200 rounded-full h-4">
                                    <div 
                                        className={`h-4 rounded-full transition-all ${
                                            person.score >= 70 ? 'bg-green-500' : 
                                            person.score >= 30 ? 'bg-yellow-500' : 
                                            'bg-red-500'
                                        }`}
                                        style={{ width: `${person.score}%` }}
                                    ></div>
                                </div>
                                <p className="text-gray-600 mt-1 text-right">
                                    Spirit Score: {person.score}%
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;