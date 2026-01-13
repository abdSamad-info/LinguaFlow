
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-6xl">
        <header className="mb-14 text-center">
          <div className="inline-flex items-center gap-4 mb-6">
             <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center">
               <i className="fa-solid fa-bolt-lightning text-2xl text-white"></i>
             </div>
             <div className="text-left">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                  LinguaFlow<span className="text-blue-600">Pro</span>
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Intelligence for Language</p>
             </div>
          </div>
          <p className="text-xl text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
            Instantly turn casual chat, Roman Urdu, or broken phrases into <span className="text-gray-900 font-bold border-b-2 border-blue-200">flawless professional prose.</span>
          </p>
        </header>

        <main className="relative z-10">
          {children}
        </main>

        <footer className="mt-20 py-10 border-t border-gray-100 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
             <span className="text-gray-400 text-sm font-medium">Powered by Gemini 3 Flash</span>
             <div className="hidden md:block w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
             <span className="text-gray-400 text-sm font-medium">Safe & Secure API</span>
             <div className="hidden md:block w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
             <span className="text-gray-400 text-sm font-medium">Zero Data Storage</span>
          </div>
          <p className="text-gray-300 text-xs font-bold tracking-widest uppercase">&copy; {new Date().getFullYear()} LINGUAFLOW AUTOMATION ENGINE</p>
        </footer>
      </div>
      
      {/* Decorative elements */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-[100]"></div>
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-indigo-100 rounded-full blur-[100px] opacity-30 pointer-events-none"></div>
    </div>
  );
};

export default Layout;
