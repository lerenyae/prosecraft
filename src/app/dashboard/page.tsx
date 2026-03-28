'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Plus, BookOpen, Calendar, PenTool } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const GENRE_OPTIONS = [
  'Mystery/Thriller',
  'Romance',
  'Fantasy/Sci-Fi',
  'Literary Fiction',
  'Memoir/Nonfiction',
  'Other',
];

export default function Dashboard() {
  const { projects, createProject } = useStore();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState(GENRE_OPTIONS[0]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      const newProject = createProject(title.trim(), genre);
      setTitle('');
      setGenre(GENRE_OPTIONS[0]);
      setShowModal(false);
      router.push(`/project/${newProject.id}`);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getGenreBadgeColor = (g: string) => {
    const colors: Record<string, string> = {
      'Mystery/Thriller': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      'Romance': 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
      'Fantasy/Sci-Fi': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
      'Literary Fiction': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      'Memoir/Nonfiction': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[g] || colors['Other'];
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[var(--color-accent)]" />
            <h1 className="text-xl font-bold tracking-tight">ProseCraft</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {projects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <BookOpen className="w-16 h-16 text-[var(--color-accent-light)] mb-6" strokeWidth={1.5} />
            <h2 className="text-3xl font-semibold mb-3 text-center">Create your first manuscript</h2>
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-md text-center">
              Start writing your next great work. Whether fiction or nonfiction, ProseCraft helps you organize,
              develop, and refine your writing.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        ) : (
          <>
            {/* Header with CTA */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-semibold mb-1">Your Manuscripts</h2>
                <p className="text-[var(--color-text-secondary)]">
                  {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:bg-[var(--color-accent-dark)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="group cursor-pointer bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent-light)] hover:shadow-lg transition-all duration-300"
                >
                  {/* Genre Badge */}
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getGenreBadgeColor(project.genre)}`}>
                      {project.genre}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--color-accent)] transition-colors line-clamp-2">
                    {project.title}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p className="text-[var(--color-text-secondary)] text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="space-y-3 border-t border-[var(--color-border-light)] pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold text-[var(--color-accent)]">0</span>
                      <span className="text-sm text-[var(--color-text-secondary)]">words</span>
                    </div>

                    {/* Updated Date */}
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Hover arrow indicator */}
                  <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}

              {/* New Project Card */}
              <div
                onClick={() => setShowModal(true)}
                className="group cursor-pointer bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent-light)] hover:bg-[var(--color-surface-alt)] transition-all duration-300 flex flex-col items-center justify-center min-h-[300px]"
              >
                <Plus className="w-12 h-12 text-[var(--color-accent-light)] mb-3 group-hover:text-[var(--color-accent)] transition-colors" />
                <h3 className="text-lg font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] transition-colors">
                  New Project
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 text-center">
                  Start a new manuscript
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-xl max-w-md w-full border border-[var(--color-border)]">
            <form onSubmit={handleCreateProject}>
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">New Manuscript</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Start a new writing project
                  </p>
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., The Last Raven"
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
                    autoFocus
                  />
                </div>

                {/* Genre Select */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Genre
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent text-[var(--color-text-primary)]"
                  >
                    {GENRE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-bg-primary)] rounded-lg hover:bg-[var(--color-accent-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
