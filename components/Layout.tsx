
import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-10">
      <div className="w-full max-w-7xl">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center justify-center border border-white/10">
               <i className="fa-solid fa-atom text-2xl text-white animate-spin-slow"></i>
             </div>
             <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                  LinguaFlow<span className="text-blue-500">Pro</span>
                </h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Personal AI Terminal</p>
             </div>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 glass rounded-xl border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Engine Active</span>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 py-10 border-t border-white/5 text-center">
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">
            &copy; {new Date().getFullYear()} LINGUAFLOW PRO ENGINE
          </p>
        </footer>
      </div>
      
      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Layout;
