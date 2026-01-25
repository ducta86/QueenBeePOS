
import React, { useState } from 'react';
import { useStore } from '../store';
import { Lock, User, LogIn, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login, storeConfig } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Truyền mật khẩu thô trực tiếp vào store login
      const success = await login(username, password);
      if (!success) {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi hệ thống khi xác thực.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-['Inter']">
      {/* Delicate Minimalist Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.4]" 
             style={{ backgroundImage: `radial-gradient(#e2e8f0 1px, transparent 1px)`, backgroundSize: '32px 32px' }}>
        </div>

        {/* Soft Organic Glows */}
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] animate-[pulse_15s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[100px] animate-[pulse_20s_ease-in-out_infinite_delay-2s]"></div>

        {/* Minimalist Line Art Drawings */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.15]" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Subtle curved lines */}
          <path d="M-5 80 Q 25 60 55 85 T 105 75" fill="none" stroke="#6366f1" strokeWidth="0.05" />
          <path d="M-5 20 Q 30 40 60 15 T 105 25" fill="none" stroke="#6366f1" strokeWidth="0.05" />
          
          {/* Minimalist geometric shapes */}
          <circle cx="85" cy="15" r="8" fill="none" stroke="#6366f1" strokeWidth="0.03" />
          <rect x="10" y="70" width="12" height="12" rx="2" fill="none" stroke="#6366f1" strokeWidth="0.03" transform="rotate(15 16 76)" />
          <path d="M45 45 L 55 55 M 55 45 L 45 55" stroke="#6366f1" strokeWidth="0.03" />
        </svg>
      </div>

      <div className="w-full max-w-[450px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Clean Light Glass Card */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white p-10 md:p-14 rounded-[56px] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.06)] space-y-12">
          
          <div className="text-center space-y-6">
            <div className="relative inline-block group">
               <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-700"></div>
               <div className="w-20 h-20 bg-indigo-600 rounded-[30px] mx-auto flex items-center justify-center text-white shadow-2xl shadow-indigo-100 relative z-10 -rotate-3 group-hover:rotate-0 transition-all duration-700">
                  <ShieldCheck size={40} />
               </div>
            </div>
            
            <div className="space-y-2">
               <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{storeConfig.name}</h1>
               <div className="flex items-center justify-center space-x-3">
                 <div className="h-[1px] w-6 bg-slate-200"></div>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Hệ thống quản lý bán hàng</p>
                 <div className="h-[1px] w-6 bg-slate-200"></div>
               </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-600 animate-in shake duration-300">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-[11px] font-bold">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1.5 opacity-80">Tài khoản</label>
              <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                    <User size={18} />
                 </div>
                 <input 
                    type="text" 
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[26px] outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 focus:bg-white text-slate-900 font-bold transition-all placeholder:text-slate-300 text-sm"
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                 />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1.5 opacity-80">Mật khẩu</label>
              <div className="relative group">
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
                    <Lock size={18} />
                 </div>
                 <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full pl-16 pr-14 py-5 bg-slate-50 border border-slate-100 rounded-[26px] outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 focus:bg-white text-slate-900 font-bold transition-all placeholder:text-slate-300 text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                 />
                 <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
                 >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-[12px] uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              <span>ĐĂNG NHẬP</span>
            </button>
          </form>

          <div className="pt-4 text-center">
             <div className="inline-flex items-center space-x-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">
               <span>EST. 2025</span>
               <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
               <span>SECURED ACCESS</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
