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
  Code
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ----------------------------------------------------------------------
// Utils (برای ادغام کلاس‌های Tailwind)
// ----------------------------------------------------------------------
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------------
// Types (ساختارهای داده برای ورودی و خروجی API)
// ----------------------------------------------------------------------
interface SimpleInputState {
  price_change: number;
  sentiment_score: number;
}

interface AdvancedFeaturesState {
  sma_10: number;
  rsi: number;
  vol_20: number;
  sentiment: number;
  sentiment_ma: number;
}

// رابط کاربری برای پاسخ نهایی و قوی (شامل ویژگی‌های محاسبه شده)
interface LiveSignalResponse {
  ticker: string;
  proba: number;
  signal: number;
  calculated_features: AdvancedFeaturesState;
  model_timestamp: string; 
}

// ----------------------------------------------------------------------
// Components (کامپوننت‌های کوچک برای طراحی بهتر)
// ----------------------------------------------------------------------

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg", className)}>
    {children}
  </div>
);

const InputField = ({ label, value, onChange, type = "number", step = "0.01" }: any) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      step={step}
      value={value}
      onChange={onChange}
      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
    />
  </div>
);

// کامپوننت برای نمایش ویژگی‌های محاسبه شده
const FeatureDisplay = ({ label, value, unit = '' }: { label: string, value: number, unit?: string }) => (
    <div className="flex flex-col space-y-1.5 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{label}</label>
        <div className="text-white text-lg font-mono tracking-tight">
            {value !== null && value !== undefined ? value.toFixed(3) : 'N/A'}{unit}
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

// ----------------------------------------------------------------------
// Main Application (کامپوننت اصلی)
// ----------------------------------------------------------------------

export default function App() {
  // --- وضعیت Firebase ---
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // --- وضعیت برنامه ---
  const [ticker, setTicker] = useState('AAPL');
  const [mode, setMode] = useState<'simple' | 'live'>('live'); // حالت پیش‌فرض: تولید
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<LiveSignalResponse | null>(null);

  // وضعیت ورودی ساده (فقط برای حالت دمو)
  const [simpleInput, setSimpleInput] = useState<SimpleInputState>({
    price_change: 0.15,
    sentiment_score: 0.8
  });
  
  // ویژگی‌های اولیه برای نمایش قبل از اولین فراخوانی
  const initialFeatures: AdvancedFeaturesState = {
    sma_10: 160.0,
    rsi: 70.0,
    vol_20: 0.015,
    sentiment: 0.70,
    sentiment_ma: 0.65
  };
  const [calculatedFeatures, setCalculatedFeatures] = useState<AdvancedFeaturesState>(initialFeatures);


  // ----------------------------------------------------------------------
  // Firebase Setup (راه‌اندازی یکباره)
  // ----------------------------------------------------------------------
  useEffect(() => {
    // 1. دریافت Config و راه‌اندازی
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

    // 2. منطق احراز هویت
    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(firebaseAuth, __initial_auth_token);
            } else {
                await signInAnonymously(firebaseAuth);
            }
        } catch (error) {
            console.error("Firebase Authentication failed:", error);
            await signInAnonymously(firebaseAuth); // بازگشت به ورود ناشناس
        }
    };

    // 3. Listener برای وضعیت Auth
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
            setUserId(user.uid);
        } else {
            // استفاده از یک ID تصادفی در صورت عدم احراز هویت
            setUserId(crypto.randomUUID()); 
        }
        setIsAuthReady(true);
    });

    initAuth();

    return () => unsubscribe(); // پاکسازی Listener
  }, []); // فقط یک بار هنگام Mount اجرا می شود


  // ----------------------------------------------------------------------
  // مدیریت فراخوانی API
  // ----------------------------------------------------------------------
  const fetchPrediction = async () => {
    if (!isAuthReady) {
        setError("Firebase authentication is not yet ready. Please wait.");
        return;
    }

    setLoading(true);
    setError(null);
    setResponse(null); // پاک کردن پاسخ قبلی
    
    try {
      let endpoint: string;
      let payload: any;
      
      // تعیین نقطه پایانی و Payload بر اساس حالت انتخاب شده
      if (mode === 'live') {
        // حالت تولید: فقط تیکر ارسال می‌شود (انتظار ویژگی‌های محاسبه شده در پاسخ)
        endpoint = '/predict/live';
        payload = { ticker: ticker.toUpperCase() };
      } else {
        // حالت دمو ساده: ویژگی‌های شبیه‌سازی شده ارسال می‌شود (انتظار پاسخ ساده)
        endpoint = '/predict/simple';
        payload = {
            ticker: ticker.toUpperCase(),
            price_change: simpleInput.price_change,
            sentiment_score: simpleInput.sentiment_score
        };
      }

      // فرض بر این است که API در آدرس محلی 8000 در دسترس است
      // NOTE: در محیط واقعی، این URL باید به متغیر محیطی تبدیل شود.
      const res = await axios.post<LiveSignalResponse>(`http://localhost:8000${endpoint}`, payload);
      
      // مدیریت پاسخ:
      if (mode === 'live' && res.data.calculated_features) {
          setCalculatedFeatures(res.data.calculated_features);
          setResponse(res.data);
      } else if (mode === 'simple') {
          // تبدیل پاسخ ساده به ساختار پاسخ کامل برای سازگاری UI
          // ویژگی های محاسبه شده را همان Initial Features قرار می دهیم.
          setResponse({
              ...res.data,
              calculated_features: initialFeatures, 
              model_timestamp: "N/A (Simple Demo)"
          } as LiveSignalResponse);
      } else {
          setResponse(res.data);
      }

    } catch (err: any) {
      console.error("API Call Error:", err);
      // مدیریت خطاهای HTTP از FastAPI
      const apiErrorMessage = err.response?.data?.detail || "خطای ناشناخته. مطمئن شوید بک‌اند (FastAPI) در حال اجرا است.";
      setError(apiErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  // توابع کمکی UI
  const currentResponse = response || { signal: 0, proba: 0.5, ticker: '---', model_timestamp: "---" };
  const isBuy = currentResponse.signal === 1;
  const signalColor = isBuy ? "text-emerald-400" : "text-rose-400";
  const signalBg = isBuy ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20";

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
            <span className={cn("flex items-center gap-1", isAuthReady ? "text-emerald-500" : "text-yellow-500")}><Server size={12}/> Env: {isAuthReady ? "Ready" : "Loading..."}</span>
            <span className="flex items-center gap-1 text-emerald-500"><Activity size={12}/> API: Live</span>
            {userId && <span className="text-xs text-gray-500">UID: {userId}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ستون چپ: کنترل‌ها و وضعیت ویژگی‌ها */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* انتخاب تیکر و سوئیچ حالت */}
          <Card className="p-5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">نماد دارایی (Ticker)</label>
            <div className="flex gap-2 mb-4">
              <input 
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 font-mono text-lg uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={loading}
              />
              <button 
                onClick={fetchPrediction}
                disabled={loading || !isAuthReady}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <Activity size={20} />}
              </button>
            </div>
             <div className="flex border-t border-gray-800 pt-4">
              <button 
                onClick={() => setMode('live')}
                disabled={loading}
                className={cn("flex-1 py-1 text-xs font-medium transition-colors rounded-l-lg", mode === 'live' ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300 bg-gray-800 disabled:opacity-50")}
              >
                حالت تولید (Live: /predict/live)
              </button>
              <button 
                onClick={() => setMode('simple')}
                disabled={loading}
                className={cn("flex-1 py-1 text-xs font-medium transition-colors rounded-r-lg", mode === 'simple' ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300 bg-gray-800 disabled:opacity-50")}
              >
                دموی ساده (Simple: /predict/simple)
              </button>
            </div>
          </Card>

          {/* کارت وضعیت ویژگی‌ها */}
          <Card className="p-0">
            <div className="p-5 space-y-4">
              {mode === 'simple' ? (
                <>
                  <h3 className='text-white font-bold mb-2 flex items-center gap-2'><Code size={16} className='text-indigo-400'/> ورودی‌های دستی دمو</h3>
                  <InputField 
                    label="تغییر قیمت روز قبل (%)" 
                    value={simpleInput.price_change} 
                    onChange={(e: any) => setSimpleInput({...simpleInput, price_change: parseFloat(e.target.value) || 0})} 
                  />
                  <InputField 
                    label="امتیاز احساسات (-1 تا 1)" 
                    value={simpleInput.sentiment_score} 
                    onChange={(e: any) => setSimpleInput({...simpleInput, sentiment_score: parseFloat(e.target.value) || 0})} 
                    step="0.01"
                  />
                  <p className="text-xs text-yellow-500 pt-2">
                    توجه: در حالت ساده، مدل FinBERT و داده‌های Polygon.io استفاده نمی‌شوند.
                  </p>
                </>
              ) : (
                <>
                   <h3 className='text-white font-bold mb-3 flex items-center gap-2'><BarChart2 size={16} className='text-emerald-400'/> ویژگی‌های زنده محاسبه شده</h3>
                   <div className="grid grid-cols-2 gap-3">
                        <FeatureDisplay label="SMA (10 روزه)" value={calculatedFeatures.sma_10} />
                        <FeatureDisplay label="RSI (14 روزه)" value={calculatedFeatures.rsi} />
                        <FeatureDisplay label="نوسان (20 روزه)" value={calculatedFeatures.vol_20} />
                        <FeatureDisplay label="احساسات (FinBERT)" value={calculatedFeatures.sentiment} />
                        <FeatureDisplay label="میانگین متحرک احساسات" value={calculatedFeatures.sentiment_ma} />
                    </div>
                </>
              )}
            </div>
            
            <div className="p-4 bg-gray-800/50 border-t border-gray-800 text-xs text-gray-500 text-center">
                {mode === 'live' ? 
                `نقطه پایانی API: /predict/live. ویژگی‌ها با استفاده از Polygon.io و FinBERT در سرور محاسبه می‌شوند.` :
                `نقطه پایانی API: /predict/simple. ورودی‌های شما مستقیماً برای مدل ساده ارسال می‌شوند.`
              }
            </div>
          </Card>
        </div>

        {/* ستون راست: خروجی و داشبورد */}
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
               <p className='text-sm text-gray-500 mt-1'>(این فرآیند به دلیل دریافت داده و FinBERT ممکن است ۳ تا ۷ ثانیه طول بکشد.)</p>
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
              {/* کارت سیگنال اصلی */}
              <div className={cn("relative p-8 rounded-2xl border backdrop-blur-sm transition-all overflow-hidden", signalBg)}>
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
                        <span className="text-2xl font-mono text-white opacity-80">{currentResponse.ticker}</span>
                      </div>
                    </div>
                    <div className={cn("px-4 py-1 rounded-full text-sm font-bold border", isBuy ? "bg-emerald-500 text-white border-emerald-400" : "bg-rose-500 text-white border-rose-400")}>
                      سیگنال: {currentResponse.signal}
                    </div>
                  </div>

                  <div className="bg-gray-900/40 rounded-xl p-5 backdrop-blur-sm border border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">امتیاز اطمینان</span>
                      <span className="font-mono text-white">{(currentResponse.proba * 100).toFixed(2)}%</span>
                    </div>
                    <ProgressBar 
                      value={currentResponse.proba * 100} 
                      colorClass={isBuy ? "bg-emerald-500" : "bg-rose-500"} 
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>۰٪ (فروش قوی)</span>
                      <span>۱۰۰٪ (خرید قوی)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* شبکه آمار */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <Card className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-gray-500 uppercase">شناسه کاربر</span>
                    <span className="text-xl font-mono text-white mt-1 break-all text-xs">{userId || 'N/A'}</span>
                 </Card>
                 <Card className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-gray-500 uppercase">آخرین آموزش مدل</span>
                    <span className="text-xl font-mono text-white mt-1 text-indigo-400">
                        {currentResponse.model_timestamp.split(' | ')[0].replace('Trained: ', '')}
                    </span>
                 </Card>
                 <Card className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-gray-500 uppercase">آستانه معامله</span>
                    <span className="text-xl font-mono text-white mt-1">
                       {currentResponse.model_timestamp.split(' | ')[1].replace('Threshold: ', '')}
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