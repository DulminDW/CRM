import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Plane,
  Hotel,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stateLocation = location.state as { from?: { pathname?: string } } | null;
  const from = stateLocation?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your company email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signInWithEmail(email, password);

      if (error) {
        setErrorMessage(error.message || 'Invalid email or password.');
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      {/* 
        ========================================================================
        LEFT PANEL: 52% Desktop Width with Deep Navy Travel/Hotel Background
        Large curved boundary on the right edge (desktop)
        ========================================================================
      */}
      <div className="relative w-full lg:w-[52%] bg-[#08264F] flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden min-h-[380px] lg:min-h-screen">
        {/* Subtle decorative background imagery / hotel & travel aesthetic */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80')`
          }}
        />

        {/* Deep navy radial gradient overlay to guarantee crystal clear contrast */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#061D3D] via-[#08264F]/95 to-[#0D3874]/90" />

        {/* Elegant background geometric curves & travel routes */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="400" cy="400" r="350" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="8 8" />
            <circle cx="400" cy="400" r="260" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="400" cy="400" r="170" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d="M100 200 C 300 100, 500 500, 700 300" stroke="#1455D9" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
        </div>

        {/* Top Branding Section */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1455D9] to-[#08264F] border border-white/20 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-black/20">
            W
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-white leading-tight">
              WINDOW COMPANIES
            </div>
            <div className="text-[11px] font-semibold tracking-widest text-[#EAF2FF]/80 uppercase">
              Hotel & Travel Management
            </div>
          </div>
        </div>

        {/* Center Hero Message */}
        <div className="relative z-10 my-auto py-8 lg:py-0">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-[#EAF2FF] mb-6 shadow-sm">
            <Plane className="w-3.5 h-3.5 text-[#1455D9]" />
            <span>Enterprise Partner & DMC Rates Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Unified Hospitality & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#EAF2FF] to-[#1455D9]">
              Travel Sales CRM
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-[#EAF2FF]/80 max-w-lg leading-relaxed">
            Manage partner travel agencies, regional market desks, contact profiles,
            contracted hotel seasonal rates, and negotiated special slots in one secure console.
          </p>

          {/* Value Props / Features in Pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/90">
              <Hotel className="w-4 h-4 text-[#1455D9]" />
              <span>Randoli · Beragala · Horton Heights · H.S.H.</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/90">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tier Agency Hierarchy</span>
            </div>
          </div>
        </div>

        {/* Bottom Security / Copyright */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-white/60 gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Enterprise End-to-End Encryption · PostgreSQL RLS</span>
          </div>
          <div>© {new Date().getFullYear()} Window Companies (Pvt) Ltd.</div>
        </div>
      </div>

      {/* 
        ========================================================================
        RIGHT PANEL: 48% Desktop Width with Clean White Centered Login Card
        ========================================================================
      */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[440px] bg-white rounded-2xl border border-[#D9E0EA] shadow-xl shadow-slate-200/50 p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#08264F] flex items-center justify-center text-white font-bold text-sm">
                W
              </div>
              <span className="font-bold text-sm tracking-tight text-[#08264F]">
                WINDOW COMPANIES CRM
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-[#101828]">
              Sign In to Your Account
            </h2>
            <p className="mt-1.5 text-sm text-[#667085]">
              Enter your corporate credentials to access the sales & rates console.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800 animate-shake">
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-bold uppercase tracking-wider text-[#101828] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-bold uppercase tracking-wider text-[#101828]"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#667085]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-[#FFFFFF] border border-[#D9E0EA] rounded-xl text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1455D9]/20 focus:border-[#1455D9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#667085] hover:text-[#101828] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#667085] hover:text-[#101828]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#1455D9] rounded border-[#D9E0EA] focus:ring-[#1455D9]"
                />
                <span>Stay signed in on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#1455D9] hover:bg-[#1044B2] focus:outline-none focus:ring-4 focus:ring-[#1455D9]/20 shadow-md shadow-[#1455D9]/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to CRM</span>
              )}
            </button>
          </form>

          {/* Configuration Note */}
          {isConfigured && (
            <div className="mt-8 pt-5 border-t border-[#D9E0EA] flex items-center justify-center gap-1.5 text-xs text-[#16A34A] font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Production Supabase Auth Connected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
