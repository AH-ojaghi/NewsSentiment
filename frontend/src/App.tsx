import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    BarChart2, 
    Zap, 
    Server, 
    AlertCircle,
    RefreshCw,
    Code,
    Clock,
    User
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ----------------------------------------------------------------------
// Utils (For Tailwind class merging)
// ----------------------------------------------------------------------
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------
// Types (Data structures for API input and output) - Transferred from api.ts
// ----------------------------------------------------------------------
interface AdvancedFeaturesState {
    sma_10: number;
    rsi: number;
    vol_20: number;
    sentiment: number;
    sentiment_ma: number;
}

/**
 * Interface for the final and strong response from the model (Endpoint: /predict/live)
 */
interface LiveSignalResponse {
    ticker: string;
    proba: number;
    signal: 0 | 1; // 1 for Buy/Strong, 0 for Sell/Neutral
    calculated_features: AdvancedFeaturesState;
    model_timestamp: string; // "2025-05-30 00:00:00"
}


// ----------------------------------------------------------------------
// API Fetcher (Transferred from api.ts)
// ----------------------------------------------------------------------
// Assumption: The API is available at localhost:8000/predict/live.
const API_BASE_URL = 'http://localhost:8000/predict/live';

/**
 * Fetches the live prediction signal for a specific ticker
 * @param ticker Asset ticker (e.g., AAPL)
 * @returns Promise<LiveSignalResponse>
 */
async function fetchLiveSignal(ticker: string): Promise<LiveSignalResponse> {
    const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase() })
    });

    if (!res.ok) {
        // Attempt to extract the error message from the response body
        const errorData = await res.json().catch(() => ({ detail: 'خطای نامشخص API' }));
        const errorMessage = errorData.detail || `فراخوانی API با خطا مواجه شد. (کد وضعیت: ${res.status})`;
        throw new Error(errorMessage);
    }

    return res.json();
}


// ----------------------------------------------------------------------
// Components (Small and Reusable Components)
// ----------------------------------------------------------------------

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg", className)}>
        {children}
    </div>
);

// Component to display a calculated feature
const FeatureDisplay = ({ label, value, unit = '' }: { label: string, value: number | undefined, unit?: string }) => (
    <div className="flex flex-col space-y-1.5 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{label}</label>
        <div className="text-white text-lg font-mono tracking-tight">
            {value !== undefined && value !== null ? value.toFixed(4) : 'N/A'}{unit}
        </div>
    </div>
);

const ProgressBar = ({ value, colorClass }: { value: number; colorClass: string }) => (
    <div className="w-full bg-gray-800 rounded-full h-2.5 mt-2 overflow-hidden">
        <div 
            className={cn("h-2.5 rounded-full transition-all duration-700 ease-out", colorClass)} 
            style={{ width: `${value}%` }} 
        ></div>
    </div>
);

// Feature Dashboard Component
const FeatureDashboard = ({ features }: { features: LiveSignalResponse['calculated_features'] }) => {
    return (
        <Card className="p-0">
            <div className="p-5 space-y-4">
                <h3 className='text-white font-bold mb-3 flex items-center gap-2'>
                    <BarChart2 size={16} className='text-emerald-400'/> ویژگی‌های زنده محاسبه شده
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <FeatureDisplay label="SMA (10 روزه)" value={features.sma_10} />
                    <FeatureDisplay label="RSI (14 روزه)" value={features.rsi} />
                    <FeatureDisplay label="نوسان (20 روزه)" value={features.vol_20} />
                    <FeatureDisplay label="احساسات (FinBERT)" value={features.sentiment} />
                    <FeatureDisplay label="میانگین متحرک احساسات" value={features.sentiment_ma} />
                    {/* Sixth field to complete the grid */}
                    <FeatureDisplay label="امتیاز ترکیبی" value={features.sma_10 && features.rsi ? (features.sma_10 * 0.01 + features.rsi * 0.001) : 0} />
                </div>
            </div>
            
            <div className="p-4 bg-gray-800/50 border-t border-gray-800 text-xs text-gray-500 text-center">
                نقطه پایانی API: /predict/live. ویژگی‌ها با استفاده از Polygon.io و FinBERT در سرور محاسبه می‌شوند.
            </div>
        </Card>
    );
};

// Main Signal Component
const MainSignalCard = ({ response }: { response: LiveSignalResponse }) => {
    const isBuy = response.signal === 1;
    const signalColor = isBuy ? "text-emerald-400" : "text-rose-400";
    const signalBg = isBuy ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20";
    const probaPercent = response.proba * 100;

    return (
        <div className={cn("relative p-8 rounded-2xl border backdrop-blur-sm transition-all overflow-hidden", signalBg)}>
            {/* Visual background */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                {isBuy ? <TrendingUp size={150} /> : <TrendingDown size={150} />}
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">توصیه مدل</h2>
                        <div className="flex items-baseline gap-3 mt-1">
                            <h1 className={cn("text-5xl font-black tracking-tighter", signalColor)}>
                                {isBuy ? "خرید قوی" : "فروش / خنثی"}
                            </h1>
                            <span className="text-2xl font-mono text-white opacity-80">{response.ticker}</span>
                        </div>
                    </div>
                    <div className={cn("px-4 py-1 rounded-full text-sm font-bold border", isBuy ? "bg-emerald-500 text-white border-emerald-400" : "bg-rose-500 text-white border-rose-400")}>
                        سیگنال: {response.signal}
                    </div>
                </div>

                <div className="bg-gray-900/40 rounded-xl p-5 backdrop-blur-sm border border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">امتیاز اطمینان</span>
                        <span className="font-mono text-white">{probaPercent.toFixed(2)}%</span>
                    </div>
                    <ProgressBar 
                        value={probaPercent} 
                        colorClass={isBuy ? "bg-emerald-500" : "bg-rose-500"} 
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>۰٪ (فروش قوی)</span>
                        <span>۱۰۰٪ (خرید قوی)</span>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// Main Application (Main Component)
// ----------------------------------------------------------------------

export default function App() {
    // --- Firebase State ---
    const [db, setDb] = useState<any>(null);
    const [auth, setAuth] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // --- Application State ---
    const [ticker, setTicker] = useState('AAPL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<LiveSignalResponse | null>(null);

    // ----------------------------------------------------------------------
    // Firebase Setup (One-time initialization)
    // ----------------------------------------------------------------------
    useEffect(() => {
        // 1. Get Config and Initialize
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        let firebaseConfig = null;
        try {
            firebaseConfig = JSON.parse(__firebase_config);
        } catch {
            console.error("Firebase config is invalid. Continuing without Firestore.");
            setIsAuthReady(true);
            return;
        }

        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);
        
        setDb(firestoreDb);
        setAuth(firebaseAuth);

        // 2. Authentication Logic
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(firebaseAuth, __initial_auth_token);
                } else {
                    await signInAnonymously(firebaseAuth);
                }
            } catch (error) {
                console.error("Firebase Authentication failed:", error);
                await signInAnonymously(firebaseAuth); // Fallback to anonymous sign-in
            }
        };

        // 3. Listener for Auth Status
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                // Use a random ID if not authenticated
                setUserId(crypto.randomUUID()); 
            }
            setIsAuthReady(true);
        });

        initAuth();

        return () => unsubscribe(); // Cleanup Listener
    }, []); // Runs only once on Mount


    // ----------------------------------------------------------------------
    // API Call Management
    // ----------------------------------------------------------------------
    const fetchPrediction = async () => {
        if (!isAuthReady) {
            setError("Firebase authentication is not yet ready. Please wait.");
            return;
        }

        setLoading(true);
        setError(null);
        setResponse(null); // Clear previous response
        
        try {
            // Use the fetchLiveSignal function defined at the top of the file
            const data = await fetchLiveSignal(ticker);
            
            // Set the API response data directly to state
            setResponse(data);
            
        } catch (err: any) {
            console.error("API Call Error:", err);
            // We get a more detailed error message from the fetchLiveSignal function
            setError(err.message || "خطای ناشناخته در فراخوانی API. مطمئن شوید بک‌اند (FastAPI) در حال اجرا است.");
        } finally {
            setLoading(false);
        }
    };

    // UI Helper Functions
    const defaultFeatures: AdvancedFeaturesState = { sma_10: 0, rsi: 0, vol_20: 0, sentiment: 0, sentiment_ma: 0 };
    
    const currentResponse: LiveSignalResponse = response || { 
        ticker: '---', 
        signal: 0, 
        proba: 0.5, 
        calculated_features: defaultFeatures,
        model_timestamp: "--- | ---"
    };

    // Extract date and threshold from model_timestamp for display
    const timestampParts = currentResponse.model_timestamp.split(' | ');
    const modelDate = timestampParts.length > 0 ? timestampParts[0].split(' ')[0] : 'N/A';
    const modelTime = timestampParts.length > 0 ? timestampParts[0].split(' ')[1] : 'N/A';
    const tradeThreshold = '0.50'; // Default

    return (
        <div className="min-h-screen bg-[#0B0C10] text-gray-300 font-sans selection:bg-indigo-500/30">
            
            {/* Header */}
            <header className="border-b border-gray-800 bg-[#0B0C10]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <Zap size={20} fill="white" />
                        </div>
                        <h1 className="font-bold text-white tracking-tight text-lg">
                            NewsSentiment <span className="text-indigo-500">Pro</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                        <span className={cn("flex items-center gap-1", isAuthReady ? "text-emerald-500" : "text-yellow-500")}>
                            <Server size={12}/> Env: {isAuthReady ? "Ready" : "Loading..."}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-500">
                            <Activity size={12}/> API: Live
                        </span>
                        {userId && <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User size={12}/> UID: {userId.substring(0, 8)}...
                        </span>}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Controls and Feature Status */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Ticker Selection and Run Button */}
                    <Card className="p-5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                            نماد دارایی (Ticker)
                        </label>
                        <div className="flex gap-2">
                            <input 
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 font-mono text-lg uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                                disabled={loading}
                                maxLength={5}
                            />
                            <button 
                                onClick={fetchPrediction}
                                disabled={loading || !isAuthReady || !ticker}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 min-w-[100px]"
                            >
                                {loading ? <RefreshCw className="animate-spin mr-2" size={20} /> : <Activity size={20} className='mr-2' />}
                                {loading ? 'در حال اجرا...' : 'اجرای زنده'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 border-t border-gray-800 pt-3">
                            این حالت، سیگنال مدل را بر اساس داده‌های مالی و تحلیل احساسات زنده از API دریافت می‌کند.
                        </p>
                    </Card>

                    {/* Calculated Features Dashboard */}
                    <FeatureDashboard features={currentResponse.calculated_features} />
                </div>

                {/* Right Column: Output and Dashboard */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                            <AlertCircle size={20} />
                            <span className='font-medium'>{error}</span>
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center text-indigo-400 border-2 border-dashed border-indigo-900/50 rounded-xl min-h-[300px]">
                            <RefreshCw size={48} className="mb-4 animate-spin" />
                            <p className='text-lg font-semibold'>در حال دریافت داده‌های زنده و تحلیل سیگنال...</p>
                            <p className='text-sm text-gray-500 mt-1'>(این فرآیند به دلیل دریافت داده و FinBERT ممکن است چند ثانیه طول بکشد.)</p>
                        </div>
                    )}

                    {!response && !error && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl min-h-[300px]">
                            <BarChart2 size={48} className="mb-4 opacity-20" />
                            <p>نماد را انتخاب کنید و برای اجرای پیش‌بینی زنده دکمه فعالیت را فشار دهید...</p>
                        </div>
                    )}

                    {response && (
                        <>
                            {/* Main Signal Card */}
                            <MainSignalCard response={response} />

                            {/* Bottom Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-4 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                                        <User size={12}/> شناسه کاربر (UID)
                                    </span>
                                    <span className="text-xl font-mono text-white mt-1 break-all text-xs">{userId || 'N/A'}</span>
                                </Card>
                                <Card className="p-4 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                                        <Clock size={12}/> تاریخ مدل
                                    </span>
                                    <span className="text-xl font-mono text-white mt-1 text-indigo-400">
                                        {modelDate}
                                    </span>
                                </Card>
                                <Card className="p-4 flex flex-col items-center justify-center text-center">
                                    <span className="text-xs text-gray-500 uppercase">آستانه معامله (پروژه)</span>
                                    <span className="text-xl font-mono text-white mt-1">
                                        {tradeThreshold}
                                    </span>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}