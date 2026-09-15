"use client";

import { useState } from "react";

interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<void>;
  busy: boolean;
}

export default function LoginModal({ onLogin, busy }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tighter text-white flex items-center justify-center gap-2 mb-2">
            <span className="bg-blue-600 px-2 py-1 rounded-lg text-sm">LA</span>
            LAUNDRY<span className="text-blue-500">.DASH</span>
          </h1>
          <p className="text-slate-400 text-sm">Silakan login untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="username" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4"
          >
            {busy ? "Memproses..." : "Login"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-xs text-blue-300 font-medium">
            <strong className="block text-[10px] uppercase tracking-widest mb-1">Setup Pertama Kali:</strong>
            Buat file .env.local dengan:<br />
            ADMIN_USERNAME=admin<br />
            ADMIN_PASSWORD_HASH=&lt;hash dari bcrypt&gt;
          </p>
        </div>
      </div>
    </div>
  );
}
