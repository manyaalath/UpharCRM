import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      {/* Brand */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-[#DBEAFE] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#1E40AF]/10">
          <span
            className="material-symbols-outlined text-[#1E40AF] text-[32px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            diversity_3
          </span>
        </div>
        <h1 className="text-[36px] font-bold text-[#1E40AF] tracking-tight">Uphar CRM</h1>
        <p className="text-slate-500 mt-1 text-[15px]">Specimen Distribution Management</p>
        <div className="w-12 h-[2px] bg-[#1E40AF] mt-4 mx-auto rounded-full" />
      </div>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-3xl">
        {/* CRM Card */}
        <Link
          href="/login"
          className="flex-1 group bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-[#1E40AF]/30 transition-all duration-200 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 bg-[#1E40AF] rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-white text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
          <h2 className="text-[18px] font-bold text-slate-900 mb-2">CRM Login</h2>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Access dashboard, leads, records, and analytics
          </p>
          <div className="mt-6 px-6 py-2 bg-[#1E40AF] text-white rounded-lg text-[13px] font-semibold group-hover:bg-[#1e3a8a] transition-colors">
            Enter CRM
          </div>
        </Link>

        {/* Data Entry Card */}
        <Link
          href="/login/data-entry"
          className="flex-1 group bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all duration-200 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-amber-600 text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_note
            </span>
          </div>
          <h2 className="text-[18px] font-bold text-slate-900 mb-2">Data Entry Login</h2>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Challan entry for field operators
          </p>
          <div className="mt-6 px-6 py-2 bg-amber-500 text-white rounded-lg text-[13px] font-semibold group-hover:bg-amber-600 transition-colors">
            Enter Portal
          </div>
        </Link>

        {/* Books Card */}
        <Link
          href="/login/books"
          className="flex-1 group bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md hover:border-indigo-400/50 transition-all duration-200 flex flex-col items-center text-center"
        >
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-indigo-600 text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
          </div>
          <h2 className="text-[18px] font-bold text-slate-900 mb-2">Books Login</h2>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            Add and manage the book catalog
          </p>
          <div className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold group-hover:bg-indigo-700 transition-colors">
            Enter Portal
          </div>
        </Link>
      </div>

      <p className="mt-10 text-[12px] text-slate-400">
        Uphar Prakashan — Restricted Access
      </p>
    </div>
  );
}
