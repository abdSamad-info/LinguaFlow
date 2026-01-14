
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  accentColor: string;
  fontFamily: string;
  borderRadius: string;
  blurLevel: string;
}

const Layout: React.FC<LayoutProps> = ({ children, accentColor, fontFamily, borderRadius, blurLevel }) => {
  return (
    <div 
      className="min-h-screen flex flex-col items-center py-4 sm:py-8 px-4 transition-all duration-500 bg-[#030712]"
      style={{ 
        fontFamily,
        '--radius': borderRadius,
        '--blur': blurLevel,
        '--accent': accentColor
      } as React.CSSProperties}
    >
      <div className="w-full max-w-6xl">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
             <div 
               className="w-14 h-14 flex items-center justify-center border border-white/10 transition-all duration-500"
               style={{ 
                 backgroundColor: accentColor, 
                 boxShadow: `0 10px 40px -10px ${accentColor}77`,
                 borderRadius: 'var(--radius)'
               }}
             >
               <i className="fa-solid fa-gem text-2xl text-white"></i>
             </div>
             <div className="text-center md:text-left">
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                  LinguaFlow<span style={{ color: accentColor }}>Pro</span>
                </h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Enterprise Logic v6.0</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <div 
              className="px-4 py-2 glass border-white/5 flex items-center gap-3"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }}></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neural Link Active</span>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 py-10 border-t border-white/5 text-center">
          <p className="text-slate-600 text-[10px] font-bold tracking-[0.5em] uppercase mb-2">
            AI-Language Automation Engine
          </p>
          <p className="text-slate-700 text-[9px] font-medium tracking-widest uppercase">
            &copy; {new Date().getFullYear()} LINGUAFLOW PRO COMMAND CENTER
          </p>
        </footer>
      </div>
      
      <style>{`
        .glass {
          background: rgba(17, 24, 39, 0.4);
          backdrop-filter: blur(var(--blur));
          -webkit-backdrop-filter: blur(var(--blur));
          border-radius: var(--radius);
        }
        ::selection {
          background: var(--accent);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default Layout;
