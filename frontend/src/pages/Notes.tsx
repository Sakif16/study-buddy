import { useState, useEffect } from 'react';
import { Trash2, Plus, Search, FolderPlus, Edit2, Save, X, Heart, Star } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
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

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('studyNotes');
    const savedCategories = localStorage.getItem('noteCategories');

    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes);
      setNotes(
        parsedNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          updatedAt: new Date(note.updatedAt),
        }))
      );
    }

    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('studyNotes', JSON.stringify(notes));
  }, [notes]);

  // Save categories to localStorage
  useEffect(() => {
    localStorage.setItem('noteCategories', JSON.stringify(categories));
  }, [categories]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      category: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    setEditCategory(newNote.category);
  };

  const updateNote = () => {
    if (!selectedNote) return;

    const updatedNote: Note = {
      ...selectedNote,
      title: editTitle || 'Untitled Note',
      content: editContent,
      category: editCategory,
      updatedAt: new Date(),
    };

    setNotes(notes.map((n) => (n.id === selectedNote.id ? updatedNote : n)));
    setSelectedNote(updatedNote);
    setIsEditing(false);
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
    }
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      color: newCategoryColor,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setNewCategoryColor('bg-indigo-500');
    setShowNewCategoryForm(false);
  };

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
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
    );
    setNotes(updatedNotes);
    const updatedNote = updatedNotes.find((n) => n.id === id);
    if (updatedNote && selectedNote?.id === id) {
      setSelectedNote(updatedNote);
    }
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.color || 'bg-gray-500';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

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
