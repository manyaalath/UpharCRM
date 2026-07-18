'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

interface Book {
  id: string;
  title: string;
  created_at?: string;
}

type Notice = { type: 'success' | 'error'; message: string } | null;

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      if (data.data) setBooks(data.data);
    } catch {
      showNotice('error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;

    setSaving(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Failed to add book');
        return;
      }
      setTitle('');
      showNotice('success', `"${clean}" added`);
      fetchBooks();
    } catch {
      showNotice('error', 'Failed to add book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (book: Book) => {
    if (!confirm(`Delete "${book.title}"?`)) return;
    try {
      const res = await fetch(`/api/books?id=${book.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Failed to delete');
        return;
      }
      showNotice('success', `"${book.title}" deleted`);
      fetchBooks();
    } catch {
      showNotice('error', 'Failed to delete');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];

      if (rows.length === 0) {
        showNotice('error', 'The file has no data rows.');
        return;
      }

      // Find the title column (Book Title / Title, ignoring case + spaces)
      const norm = (s: string) => s.toLowerCase().replace(/[_\s]/g, '');
      const headers = Object.keys(rows[0]);
      const titleKey = headers.find(h => norm(h) === 'booktitle' || norm(h) === 'title' || norm(h) === 'bookname' || norm(h) === 'name');

      if (!titleKey) {
        showNotice('error', 'No "Book Title" column found. Use a column named Book Title.');
        return;
      }

      const titles = rows.map(r => String(r[titleKey] ?? '').trim()).filter(Boolean);
      if (titles.length === 0) {
        showNotice('error', 'No book titles found in the file.');
        return;
      }

      const res = await fetch('/api/books/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Bulk upload failed');
        return;
      }

      showNotice('success', `Imported: ${data.created} added, ${data.skipped} already existed.`);
      fetchBooks();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filtered = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase().trim()));

  return (
    <div className="flex-grow flex flex-col items-center pb-16 pt-6 px-4 w-full">
      <div className="w-full max-w-[720px] flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 leading-tight">Book Entry</h1>
          <hr className="h-[3px] bg-indigo-500 border-none mt-2 w-full rounded-full" />
        </div>

        {notice && (
          <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {notice.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {notice.message}
          </div>
        )}

        {/* Add + bulk upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manual add */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-500">add_circle</span>
              Add a book
            </h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book title"
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded text-[13px] font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Book'}
              </button>
            </form>
          </div>

          {/* Bulk upload */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-500">upload_file</span>
              Bulk upload (Excel)
            </h2>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2 py-1">
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-[12px] text-slate-500">Uploading...</p>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[28px] text-slate-300">description</span>
                  <p className="text-[12px] text-slate-500 mt-1">Click to upload .xlsx / .csv</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Sheet must have a <span className="font-semibold">Book Title</span> column.
            </p>
          </div>
        </div>

        {/* List */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-slate-900">
              All Books <span className="text-slate-400 font-normal">({books.length})</span>
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-white border border-slate-300 rounded px-3 py-1.5 text-[13px] text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-14 text-slate-500 gap-2">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <span className="material-symbols-outlined text-[36px] block mb-2 text-slate-300">menu_book</span>
              {books.length === 0 ? 'No books yet. Add one above.' : 'No books match your search.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map(book => (
                <li key={book.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <span className="text-[14px] text-slate-800">{book.title}</span>
                  <button
                    onClick={() => handleDelete(book)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete book"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
