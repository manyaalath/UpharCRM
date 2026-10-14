'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ArrowDownUp, BookPlus, ClipboardPaste, FileSpreadsheet, Search, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog, Dialog, EmptyState, Input, Page, PageHeader, Panel, Skeleton, Textarea, cn } from '@/components/ui';
import { formatDate } from '@/lib/date';

interface Book {
  id: string;
  title: string;
  created_at?: string;
  copies?: number;
  challans?: number;
}

type SortKey = 'title' | 'copies' | 'created_at';

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'title', dir: 1 });

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [toDelete, setToDelete] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBooks = useCallback(
    () =>
      fetch('/api/books?with_counts=1')
        .then(async res => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setBooks(data.data || []);
        })
        .catch(() => toast.error('Could not load the catalogue'))
        .finally(() => setLoading(false)),
    []
  );
  const fetchBooks = loadBooks;

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? books.filter(b => b.title.toLowerCase().includes(q)) : books;
    return [...list].sort((a, b) => {
      if (sort.key === 'title') return a.title.localeCompare(b.title) * sort.dir;
      if (sort.key === 'copies') return ((a.copies || 0) - (b.copies || 0)) * sort.dir;
      return (a.created_at || '').localeCompare(b.created_at || '') * sort.dir;
    });
  }, [books, search, sort]);

  const totalCopies = useMemo(() => books.reduce((n, b) => n + (b.copies || 0), 0), [books]);

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'title' ? 1 : -1 }));

  const addOne = async () => {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not add the title');
        return;
      }
      setBooks(prev => [...prev, { ...data.data, copies: 0, challans: 0 }]);
      setNewTitle('');
      toast.success(`Added “${data.data.title}”`);
    } catch {
      toast.error('Could not add the title');
    } finally {
      setAdding(false);
    }
  };

  const addMany = async (titles: string[]) => {
    const res = await fetch('/api/books/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titles }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Bulk add failed');
      return false;
    }
    toast.success(`${data.created} added`, { description: data.skipped ? `${data.skipped} already in the catalogue` : undefined });
    await fetchBooks();
    return true;
  };

  const submitPaste = async () => {
    const titles = pasteText.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
    if (!titles.length) return;
    setBulkSaving(true);
    try {
      if (await addMany(titles)) {
        setPasteText('');
        setPasteOpen(false);
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const norm = (s: string) => s.toLowerCase().replace(/[_\s]/g, '');
      const key = Object.keys(rows[0] || {}).find(h => ['booktitle', 'title', 'bookname', 'name'].includes(norm(h)));
      if (!key) {
        toast.error('No “Book Title” column found', { description: 'Name the column Book Title and try again.' });
        return;
      }
      const titles = rows.map(r => String(r[key] ?? '').trim()).filter(Boolean);
      if (!titles.length) {
        toast.error('No titles found in the file');
        return;
      }
      await addMany(titles);
    } catch (err) {
      toast.error(err instanceof Error ? `Could not read the file: ${err.message}` : 'Could not read the file');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/books?id=${toDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not delete');
        return;
      }
      setBooks(prev => prev.filter(b => b.id !== toDelete.id));
      toast.success(`Deleted “${toDelete.title}”`);
      setToDelete(null);
    } catch {
      toast.error('Could not delete');
    } finally {
      setDeleting(false);
    }
  };

  const pasteCount = pasteText.split(/\r?\n/).filter(t => t.trim()).length;

  return (
    <Page>
      <PageHeader
        title="Book catalogue"
        description={loading ? 'Loading…' : `${books.length} titles · ${totalCopies.toLocaleString('en-IN')} specimen copies distributed`}
        actions={
          <>
            <Button onClick={() => setPasteOpen(true)} icon={<ClipboardPaste className="size-4" />}>Paste a list</Button>
            <Button onClick={() => fileRef.current?.click()} loading={uploading} icon={<FileSpreadsheet className="size-4" />}>Upload Excel</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </>
        }
      />

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center px-3 py-3 border-b border-line">
          <form onSubmit={e => { e.preventDefault(); addOne(); }} className="flex flex-1 gap-2">
            <div className="flex-1">
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Add a title and press Enter"
                leading={<BookPlus />}
                aria-label="New book title"
              />
            </div>
            <Button type="submit" variant="primary" loading={adding} disabled={!newTitle.trim()}>Add</Button>
          </form>
          <div className="sm:w-64">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search titles" leading={<Search />} aria-label="Search titles" />
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={search ? `No titles match “${search}”` : 'The catalogue is empty'}
            description={search ? undefined : 'Add titles one by one above, paste a list, or upload an Excel sheet with a Book Title column.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <SortTh label="Title" active={sort.key === 'title'} onClick={() => toggleSort('title')} />
                  <SortTh label="Copies given" active={sort.key === 'copies'} onClick={() => toggleSort('copies')} className="text-right" />
                  <th className="text-right">Challans</th>
                  <SortTh label="Added" active={sort.key === 'created_at'} onClick={() => toggleSort('created_at')} />
                  <th className="w-12"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(b => {
                  const used = (b.challans || 0) > 0;
                  return (
                    <tr key={b.id} className="group">
                      <td className="text-ink">{b.title}</td>
                      <td className="num">{(b.copies || 0).toLocaleString('en-IN')}</td>
                      <td className="num text-ink-2">{b.challans || 0}</td>
                      <td className="text-ink-2 whitespace-nowrap">{formatDate(b.created_at)}</td>
                      <td className="text-right">
                        <Button
                          variant="quiet-danger"
                          size="icon"
                          onClick={() => setToDelete(b)}
                          disabled={used}
                          title={used ? 'Already distributed — cannot be deleted' : 'Delete title'}
                          aria-label={`Delete ${b.title}`}
                          className="opacity-60 group-hover:opacity-100"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste a list of titles"
        description="One title per line. Titles already in the catalogue are skipped."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPasteOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitPaste} loading={bulkSaving} disabled={!pasteCount}>
              Add {pasteCount || ''} title{pasteCount === 1 ? '' : 's'}
            </Button>
          </>
        }
      >
        <Textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={10} placeholder={'Hindi Vyakaran Class 8\nGanit Class 10'} className="font-mono text-[12.5px]" />
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        danger
        title="Delete this title?"
        description={toDelete ? `“${toDelete.title}” will be removed from the catalogue. Operators will no longer see it when entering challans.` : undefined}
        confirmLabel="Delete"
      />
    </Page>
  );
}

function SortTh({ label, active, onClick, className }: { label: string; active: boolean; onClick: () => void; className?: string }) {
  return (
    <th className={className} aria-sort={active ? 'ascending' : undefined}>
      <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1 hover:text-ink', active && 'text-ink')}>
        {label}
        <ArrowDownUp className={cn('size-3', active ? 'opacity-100' : 'opacity-40')} />
      </button>
    </th>
  );
}
