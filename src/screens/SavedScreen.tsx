import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Clock, ExternalLink, FolderOpen, Search } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { useSavedPlaces } from '@/src/hooks/useSavedPlaces';
import { LoadingOverlay } from '@/src/components/ui/LoadingOverlay';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { useAppShell } from '@/src/hooks/useAppShell';
import type { SavedPlace } from '@/src/types';

const ALL_COLLECTIONS = 'All';
const UNSORTED_COLLECTION = 'Unsorted';

function normalizeCollection(collection?: string) {
  return collection?.trim() || UNSORTED_COLLECTION;
}

export function SavedScreen() {
  const { authSession } = useAppShell();
  const { savedPlaces, isLoading, error, unsavePlace, updateSavedPlace, refresh } = useSavedPlaces(authSession.authenticated);
  const [query, setQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState(ALL_COLLECTIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCollection, setDraftCollection] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [isSavingId, setIsSavingId] = useState<string | null>(null);

  const collections = useMemo(() => {
    const collectionSet = new Set<string>([ALL_COLLECTIONS]);
    for (const place of savedPlaces) {
      collectionSet.add(normalizeCollection(place.collection));
    }
    return Array.from(collectionSet);
  }, [savedPlaces]);

  const filteredPlaces = useMemo(() => {
    const lower = query.toLowerCase();
    return savedPlaces.filter((place) => {
      const matchesQuery = [place.name, place.category, place.summary, place.address, place.collection, place.notes].some((value) =>
        value?.toLowerCase().includes(lower),
      );
      const matchesCollection =
        collectionFilter === ALL_COLLECTIONS || normalizeCollection(place.collection) === collectionFilter;
      return matchesQuery && matchesCollection;
    });
  }, [collectionFilter, query, savedPlaces]);

  const groupedPlaces = useMemo(() => {
    const groups = new Map<string, SavedPlace[]>();
    for (const place of filteredPlaces) {
      const collection = normalizeCollection(place.collection);
      const existing = groups.get(collection) || [];
      existing.push(place);
      groups.set(collection, existing);
    }
    return Array.from(groups.entries());
  }, [filteredPlaces]);

  const beginEditing = (place: SavedPlace) => {
    setEditingId(place.id);
    setDraftCollection(place.collection || '');
    setDraftNotes(place.notes || '');
  };

  const stopEditing = () => {
    setEditingId(null);
    setDraftCollection('');
    setDraftNotes('');
  };

  const handleSave = async (savedId: string) => {
    try {
      setIsSavingId(savedId);
      await updateSavedPlace(savedId, {
        collection: draftCollection.trim() || undefined,
        notes: draftNotes.trim() || undefined,
      });
      stopEditing();
    } finally {
      setIsSavingId(null);
    }
  };

  if (!authSession.authenticated) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Sign in to save places"
        description="Saved places and collections are tied to your account."
        action={
          <Button onClick={() => (window.location.href = '/api/auth/google/start?returnTo=/saved')}>
            Continue with Google
          </Button>
        }
      />
    );
  }

  if (isLoading) return <LoadingOverlay message="Loading saved places..." />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (savedPlaces.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved places yet"
        description="Save real places from Explore to build your LensIQ collection."
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 pb-24 text-zinc-50">
      <div className="z-10 shrink-0 border-b border-zinc-800 bg-zinc-900/50 px-6 pt-12 pb-6 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved</h1>
            <p className="mt-2 text-sm text-zinc-400">Group places into collections, add notes, and revisit them later.</p>
          </div>
          <Badge variant="secondary">{savedPlaces.length}</Badge>
        </div>

        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved places..."
            className="w-full rounded-full border border-zinc-700 bg-zinc-800/50 py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {collections.map((collection) => (
            <button
              key={collection}
              type="button"
              onClick={() => setCollectionFilter(collection)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                collectionFilter === collection
                  ? 'border-white/20 bg-white text-black'
                  : 'border-zinc-700 bg-zinc-900/70 text-zinc-300'
              }`}
            >
              {collection}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto p-6">
        {groupedPlaces.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No matches found"
            description="Try another query or switch collections."
          />
        ) : (
          groupedPlaces.map(([collection, places], groupIndex) => (
            <section key={collection} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{collection}</h2>
                  <p className="text-sm text-zinc-500">{places.length} saved place{places.length === 1 ? '' : 's'}</p>
                </div>
                <Badge variant="outline">{collection === UNSORTED_COLLECTION ? 'Needs grouping' : 'Collection'}</Badge>
              </div>

              <div className="space-y-4">
                {places.map((place, index) => {
                  const isEditing = editingId === place.id;

                  return (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.04 + index * 0.03 }}
                      className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900/80 shadow-lg"
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="relative h-56 bg-zinc-800 md:h-auto md:w-72 shrink-0">
                          {place.imageUrl ? (
                            <img
                              src={place.imageUrl}
                              alt={place.name}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                            <Badge variant="secondary" className="bg-black/60 text-[10px] backdrop-blur-md">
                              {place.category}
                            </Badge>
                            <Badge variant="outline" className="border-white/20 bg-black/40 text-[10px]">
                              {normalizeCollection(place.collection)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-2xl font-bold leading-tight text-white">{place.name}</h3>
                                <p className="mt-2 text-sm text-zinc-400">
                                  {place.summary || place.address || 'No provider summary available.'}
                                </p>
                              </div>
                              {place.guide?.deepLinkUrl || place.mapsUrl ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => window.open(place.guide?.deepLinkUrl || place.mapsUrl, '_blank', 'noopener,noreferrer')}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                              ) : null}
                            </div>

                            {isEditing ? (
                              <div className="space-y-3 rounded-3xl border border-zinc-800 bg-black/20 p-4">
                                <div className="space-y-2">
                                  <label htmlFor={`collection-${place.id}`} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                    Collection
                                  </label>
                                  <input
                                    id={`collection-${place.id}`}
                                    type="text"
                                    value={draftCollection}
                                    onChange={(event) => setDraftCollection(event.target.value)}
                                    placeholder="Architecture tour"
                                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label htmlFor={`notes-${place.id}`} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                                    Notes
                                  </label>
                                  <textarea
                                    id={`notes-${place.id}`}
                                    value={draftNotes}
                                    onChange={(event) => setDraftNotes(event.target.value)}
                                    rows={4}
                                    placeholder="Why you saved it, what to revisit, or who to bring."
                                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                                  />
                                </div>
                              </div>
                            ) : place.notes ? (
                              <div className="rounded-3xl border border-zinc-800 bg-black/20 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Notes</p>
                                <p className="mt-2 text-sm italic text-zinc-300">"{place.notes}"</p>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{new Date(place.savedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {isEditing ? (
                                <>
                                  <Button variant="secondary" size="sm" onClick={stopEditing}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" onClick={() => handleSave(place.id)} disabled={isSavingId === place.id}>
                                    {isSavingId === place.id ? 'Saving...' : 'Save changes'}
                                  </Button>
                                </>
                              ) : (
                                <Button variant="secondary" size="sm" onClick={() => beginEditing(place)}>
                                  Edit collection
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="text-rose-300" onClick={() => unsavePlace(place.id)}>
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
