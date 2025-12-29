import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../constants'
import { Trash2, Plus, Search, FolderPlus, Edit2, Save, X, Heart, Star } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  attachments?: { filename: string; url: string }[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'General', color: 'bg-blue-500' },
  { id: '2', name: 'Math', color: 'bg-purple-500' },
  { id: '3', name: 'Science', color: 'bg-green-500' },
  { id: '4', name: 'English', color: 'bg-red-500' },
  { id: '5', name: 'History', color: 'bg-yellow-500' },
];

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('bg-indigo-500');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-orange-500',
  ];

  // Load notes and categories from backend
  useEffect(() => {
    // load categories and notes from backend for authenticated user
    async function loadAll() {
      try {
        const [catsRes, notesRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/categories`, { credentials: 'include' }),
          fetch(`${BACKEND_URL}/api/notes`, { credentials: 'include' }),
        ])

        if (catsRes.ok) {
          const cats = await catsRes.json()
          if (Array.isArray(cats) && cats.length) {
            setCategories(cats.map((c: any) => ({ id: c.id, name: c.name, color: c.color })))
          }
        }

        if (notesRes.ok) {
          const data = await notesRes.json()
          const mapped = data.map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content ?? '',
            category: n.category ?? '1',
            createdAt: new Date(n.createdAt),
            updatedAt: new Date(n.updatedAt),
            isFavorite: !!n.isFavorite,
            attachments: Array.isArray(n.attachments) ? n.attachments.map((a: any) => ({ filename: a.filename || a, url: a.url || a })) : [],
          }))
          setNotes(mapped)
        }
      } catch (err) {
        console.error('failed to load notes or categories', err)
      }
    }

    loadAll()
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('studyNotes', JSON.stringify(notes));
  }, [notes]);

  // categories are persisted on backend; no localStorage sync

  const createNewNote = async () => {
    // create on server (requires auth); fallback to local if fails
    try {
      const categoryToUse = selectedCategory !== 'all' ? selectedCategory : editCategory || '1'
      const payload = { title: 'Untitled Note', content: '', category: categoryToUse }
      const res = await fetch(`${BACKEND_URL}/api/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const n = await res.json()
        const newNote: Note = {
          id: n.id,
          title: n.title,
          content: n.content ?? '',
          category: n.category ?? '1',
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          isFavorite: !!n.isFavorite,
          attachments: Array.isArray(n.attachments) ? n.attachments.map((a: any) => ({ filename: a.filename || a, url: a.url || a })) : [],
        }
        setNotes([newNote, ...notes])
        setSelectedNote(newNote)
        setIsEditing(true)
        setEditTitle(newNote.title)
        setEditContent(newNote.content)
        setEditCategory(newNote.category)
        return
      }
    } catch (err) {
      console.error('create note failed', err)
    }

    // fallback local-only
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      category: selectedCategory !== 'all' ? selectedCategory : editCategory || '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
    }
    setNotes([newNote, ...notes])
    setSelectedNote(newNote)
    setIsEditing(true)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
    setEditCategory(newNote.category)
  }

  const updateNote = async () => {
    if (!selectedNote) return;

    const updatedNote: Note = {
      ...selectedNote,
      title: editTitle || 'Untitled Note',
      content: editContent,
      category: editCategory,
      updatedAt: new Date(),
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: updatedNote.title, content: updatedNote.content, category: updatedNote.category }),
      })
      if (res.ok) {
        const n = await res.json()
        const serverNote: Note = {
          id: n.id,
          title: n.title,
          content: n.content ?? '',
          category: n.category ?? updatedNote.category,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          isFavorite: typeof n.isFavorite === 'boolean' ? n.isFavorite : updatedNote.isFavorite,
          attachments: Array.isArray(n.attachments) ? n.attachments.map((a: any) => ({ filename: a.filename || a, url: a.url || a })) : [],
        }
        setNotes(notes.map((it) => (it.id === serverNote.id ? serverNote : it)))
        setSelectedNote(serverNote)
      } else {
        // fallback: update locally
        setNotes(notes.map((n) => (n.id === selectedNote.id ? updatedNote : n)))
        setSelectedNote(updatedNote)
      }
    } catch (err) {
      console.error('update note failed', err)
      setNotes(notes.map((n) => (n.id === selectedNote.id ? updatedNote : n)))
      setSelectedNote(updatedNote)
    }

    setIsEditing(false)
  };

  const deleteNote = (id: string) => {
    ; (async () => {
      try {
        await fetch(`${BACKEND_URL}/api/notes/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      } catch (err) {
        console.error('delete note failed', err)
      }
    })()

    setNotes(notes.filter((n) => n.id !== id))
    if (selectedNote?.id === id) setSelectedNote(null)
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/categories`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, color: newCategoryColor }),
      })
      if (res.ok) {
        const c = await res.json()
        const newCategory: Category = { id: c.id, name: c.name, color: c.color }
        setCategories([...categories, newCategory])
      }
    } catch (err) {
      console.error('create category failed', err)
      // fallback local-only
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName,
        color: newCategoryColor,
      }
      setCategories([...categories, newCategory])
    }

    setNewCategoryName('')
    setNewCategoryColor('bg-indigo-500')
    setShowNewCategoryForm(false)
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || note.category === selectedCategory;
    const matchesFavorite = !showFavoritesOnly || note.isFavorite;
    return matchesSearch && matchesCategory && matchesFavorite;
  });

  const favoriteNotes = notes.filter((note) => note.isFavorite);

  const toggleFavorite = (id: string) => {
    // optimistic update
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
    );
    setNotes(updatedNotes);
    const updatedNote = updatedNotes.find((n) => n.id === id);
    if (updatedNote && selectedNote?.id === id) setSelectedNote(updatedNote);

    // send to backend; revert on failure
    (async () => {
      try {
        await fetch(`${BACKEND_URL}/api/notes/${id}/favorite`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: updatedNote?.isFavorite }),
        })
      } catch (err) {
        console.error('favorite toggle failed', err)
        // revert
        setNotes((cur) => cur.map((note) => (note.id === id ? { ...note, isFavorite: !note.isFavorite } : note)))
        if (selectedNote?.id === id) setSelectedNote((s) => s ? { ...s, isFavorite: !s.isFavorite } : s)
      }
    })()
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.color || 'bg-gray-500';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  // attachment viewer state
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)
  const [viewerMime, setViewerMime] = useState<string | null>(null)
  const closeViewer = () => {
    if (viewerUrl && viewerUrl.startsWith('blob:')) URL.revokeObjectURL(viewerUrl)
    setViewerUrl(null)
    setViewerMime(null)
  }

  // upload files for a note (kept inside component so it can update state)
  const uploadFilesForNote = async (noteId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const form = new FormData()
    Array.from(files).forEach((f) => form.append('files', f))
    try {
      const res = await fetch(`${BACKEND_URL}/api/notes/${noteId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      if (!res.ok) throw new Error('upload failed')
      const data = await res.json()
      const attachments = Array.isArray(data.attachments) ? data.attachments.map((a: any) => ({ filename: a.filename || a.originalName || a, url: a.url || a, mime: a.mime || a.mimetype || '' })) : []
      // merge into note and notes list
      setNotes((cur) => cur.map((n) => n.id === noteId ? { ...n, attachments: [...(n.attachments || []), ...attachments] } : n))
      if (selectedNote?.id === noteId) setSelectedNote((s) => s ? { ...s, attachments: [...(s.attachments || []), ...attachments] } : s)
    } catch (err) {
      console.error('attachment upload failed', err)
    }
  }
  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-black">Study Notes</h1>
          <p className="text-gray-600">Create, organize, and manage your personal study notes</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories and Actions */}
          <div className="lg:col-span-1">
            <div className="bg-[rgb(188,248,238)] rounded-lg p-4 sticky top-6 text-black">
              {/* Create Note Button */}
              <button
                onClick={createNewNote}
                className="w-full bg-[#0DB19B] hover:bg-[#0a9b7f] text-white font-semibold py-3 px-4 rounded-lg mb-6 flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={20} />
                New Note
              </button>

              {/* Favorites Section */}
              <div className="mb-6 pb-6 border-b border-gray-300">
                <button
                  onClick={() => {
                    setShowFavoritesOnly(!showFavoritesOnly);
                    setSelectedCategory('all');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 ${showFavoritesOnly
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Heart size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                  <span className="flex-1">Favorites</span>
                  <span className="text-xs bg-gray-300 text-gray-800 px-2 py-1 rounded">
                    {favoriteNotes.length}
                  </span>
                </button>
              </div>

              {/* Categories Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm text-gray-700">Categories</h3>
                  <button
                    onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                    className="text-gray-600 hover:text-gray-900 transition"
                  >
                    <FolderPlus size={18} />
                  </button>
                </div>

                {/* New Category Form */}
                {showNewCategoryForm && (
                  <div className="bg-gray-200 rounded-lg p-3 mb-3">
                    <input
                      type="text"
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-white text-black px-3 py-2 rounded mb-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0DB19B]"
                    />
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewCategoryColor(color)}
                          className={`h-6 rounded ${color} ${newCategoryColor === color ? 'ring-2 ring-black' : ''
                            }`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addCategory}
                        className="flex-1 bg-[#0DB19B] hover:bg-[#0a9b7f] text-white py-1 px-2 rounded text-sm transition"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategoryForm(false);
                          setNewCategoryName('');
                        }}
                        className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-1 px-2 rounded text-sm transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Category List */}
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${selectedCategory === 'all'
                      ? 'bg-[#0DB19B] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    All Notes ({notes.length})
                  </button>

                  {categories.map((category) => {
                    const count = notes.filter((n) => n.category === category.id).length;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 ${selectedCategory === category.id
                          ? 'bg-[#0DB19B] text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${category.color}`} />
                        <span className="flex-1">{category.name}</span>
                        <span className="text-xs text-gray-500">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Notes List */}
              <div className="lg:col-span-1">
                <div className="bg-[rgb(188,248,238)] rounded-lg p-4 h-full text-black">
                  {/* Search Bar */}
                  <div className="mb-4 relative">
                    <Search size={18} className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white text-black pl-10 pr-4 py-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0DB19B]"
                    />
                  </div>

                  {/* Notes List */}
                  <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {filteredNotes.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600 text-sm">No notes found</p>
                        <button
                          onClick={createNewNote}
                          className="text-[#0DB19B] hover:text-[#0a9b7f] text-sm mt-2"
                        >
                          Create your first note
                        </button>
                      </div>
                    ) : (
                      filteredNotes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => {
                            setSelectedNote(note);
                            setIsEditing(false);
                          }}
                          className={`w-full text-left p-3 rounded-lg transition ${selectedNote?.id === note.id
                            ? 'bg-[#0DB19B] text-white ring-2 ring-[#0DB19B]'
                            : 'bg-white hover:bg-gray-100'
                            }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getCategoryColor(
                                note.category
                              )} mt-1 flex-shrink-0`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-sm truncate">{note.title}</p>
                                {note.isFavorite && (
                                  <Star size={14} className="text-amber-400 flex-shrink-0" fill="currentColor" />
                                )}
                              </div>
                              <p className={`text-xs truncate ${selectedNote?.id === note.id ? 'text-white/80' : 'text-gray-600'}`}>{note.content}</p>
                              <p className={`text-xs mt-1 ${selectedNote?.id === note.id ? 'text-white/70' : 'text-gray-500'}`}>
                                {note.updatedAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Note Editor */}
              <div className="lg:col-span-2">
                {selectedNote ? (
                  <div className="bg-[rgb(188,248,238)] rounded-lg p-6 h-full flex flex-col text-black">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full ${getCategoryColor(
                            selectedNote.category
                          )}`}
                        />
                        <span className="text-sm text-gray-600">
                          {getCategoryName(selectedNote.category)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={updateNote}
                              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition flex items-center gap-1"
                              title="Save"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(false);
                                setEditTitle(selectedNote.title);
                                setEditContent(selectedNote.content);
                                setEditCategory(selectedNote.category);
                              }}
                              className="bg-gray-400 hover:bg-gray-500 text-white p-2 rounded-lg transition flex items-center gap-1"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => toggleFavorite(selectedNote.id)}
                              className={`p-2 rounded-lg transition flex items-center gap-1 ${selectedNote.isFavorite
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-gray-400 hover:bg-gray-500 text-white'
                                }`}
                              title={selectedNote.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Heart size={18} fill={selectedNote.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setEditTitle(selectedNote.title);
                                setEditContent(selectedNote.content);
                                setEditCategory(selectedNote.category);
                              }}
                              className="bg-[#0DB19B] hover:bg-[#0a9b7f] text-white p-2 rounded-lg transition flex items-center gap-1"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => deleteNote(selectedNote.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition flex items-center gap-1"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    {isEditing ? (
                      <div className="flex-1 flex flex-col">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-white text-black text-2xl font-bold px-3 py-2 rounded-lg mb-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0DB19B]"
                          placeholder="Note title"
                        />

                        <div className="mb-4">
                          <label className="block text-sm text-gray-600 mb-2">Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full bg-white text-black px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0DB19B]"
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 w-full bg-white text-black px-3 py-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0DB19B] resize-none"
                          placeholder="Start typing your notes..."
                        />
                        <div className="mt-3">
                          <label className="block text-sm text-gray-600 mb-2">Attachments</label>
                          <input
                            type="file"
                            multiple
                            onChange={(e) => uploadFilesForNote(selectedNote.id, e.target.files)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold mb-4 text-black">{selectedNote.title}</h2>
                        <div className="prose max-w-none">
                          <p className="text-gray-700 whitespace-pre-wrap break-words">
                            {selectedNote.content || (
                              <span className="text-gray-400 italic">No content yet</span>
                            )}
                          </p>
                        </div>
                        {selectedNote.attachments && selectedNote.attachments.length > 0 && (
                          <div className="mt-4">
                            <h3 className="text-sm font-medium mb-2">Attachments</h3>
                            <ul className="space-y-2">
                              {selectedNote.attachments.map((a) => {
                                const url = `${BACKEND_URL}${a.url}`
                                const lower = (a.filename || '').toLowerCase()
                                const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp')
                                const isPdf = lower.endsWith('.pdf')
                                return (
                                  <li key={a.url}>
                                    <a
                                      href={url}
                                      target={isImage || isPdf ? undefined : '_blank'}
                                      rel={isImage || isPdf ? undefined : 'noreferrer'}
                                      onClick={async (e) => {
                                        if (isImage || isPdf) {
                                          e.preventDefault()
                                          setViewerMime(isImage ? 'image' : 'pdf')
                                          try {
                                            // fetch as blob to avoid any embedding issues and support auth if needed
                                            const res = await fetch(url, { credentials: 'include' })
                                            if (!res.ok) throw new Error('fetch failed')
                                            const blob = await res.blob()
                                            const objUrl = URL.createObjectURL(blob)
                                            // revoke previous blob if any
                                            if (viewerUrl && viewerUrl.startsWith('blob:')) URL.revokeObjectURL(viewerUrl)
                                            setViewerUrl(objUrl)
                                          } catch (err) {
                                            console.error('failed to fetch attachment for viewer', err)
                                            // fallback: open in new tab
                                            window.open(url, '_blank')
                                          }
                                        }
                                      }}
                                      className="text-[#0DB19B] hover:underline"
                                    >
                                      {a.filename}
                                    </a>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        {/* viewer modal */}
                        {viewerUrl && (
                          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={closeViewer}>
                            <div className="bg-white p-2 rounded max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end mb-2">
                                <button onClick={closeViewer} className="text-gray-700 font-semibold">Close</button>
                              </div>
                              <div className="overflow-auto">
                                {viewerMime === 'image' && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={viewerUrl} alt="attachment" className="max-w-full h-auto mx-auto" />
                                )}
                                {viewerMime === 'pdf' && (
                                  <iframe src={viewerUrl} className="w-full h-[80vh]" title="pdf-viewer" />
                                )}
                                {(!viewerMime || (viewerMime !== 'image' && viewerMime !== 'pdf')) && (
                                  <a href={viewerUrl!} target="_blank" rel="noreferrer" className="text-[#0DB19B]">Open attachment</a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mt-6">
                          Created:{' '}
                          {selectedNote.createdAt.toLocaleDateString()} -{' '}
                          {selectedNote.createdAt.toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          Updated:{' '}
                          {selectedNote.updatedAt.toLocaleDateString()} -{' '}
                          {selectedNote.updatedAt.toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[rgb(188,248,238)] rounded-lg p-6 h-full flex items-center justify-center text-black">
                    <div className="text-center">
                      <p className="text-gray-600 text-lg mb-4">No note selected</p>
                      <button
                        onClick={createNewNote}
                        className="bg-[#0DB19B] hover:bg-[#0a9b7f] text-white font-semibold py-2 px-6 rounded-lg transition flex items-center justify-center gap-2 mx-auto"
                      >
                        <Plus size={20} />
                        Create a new note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// attachments upload

