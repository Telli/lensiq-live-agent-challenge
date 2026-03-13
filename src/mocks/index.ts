import { Place, Session, SavedPlace, TranscriptMessage } from '../types';

export const mockPlaces: Place[] = [
  {
    id: 'p1',
    name: 'Palace of Fine Arts',
    description: 'A monumental structure originally constructed for the 1915 Panama-Pacific Exposition in order to exhibit works of art.',
    imageUrl: 'https://picsum.photos/seed/palace/800/600',
    category: 'Historic',
    distance: '0.2 mi',
    historicalEra: '1915',
    historicalImageUrl: 'https://picsum.photos/seed/palace1915/800/600?grayscale',
    audioSummary: 'The Palace of Fine Arts is a monumental structure originally constructed for the 1915 Panama-Pacific Exposition.',
    facts: [
      'Built in 1915',
      'Designed by Bernard Maybeck',
      'Rebuilt in 1965'
    ],
    didYouKnow: 'It is one of only a few surviving structures from the Exposition.',
    coordinates: { lat: 37.8029, lng: -122.4484 }
  },
  {
    id: 'p2',
    name: 'Golden Gate Bridge',
    description: 'A suspension bridge spanning the Golden Gate, the one-mile-wide strait connecting San Francisco Bay and the Pacific Ocean.',
    imageUrl: 'https://picsum.photos/seed/goldengate/800/600',
    category: 'Landmark',
    distance: '1.5 mi',
    historicalEra: '1937',
    historicalImageUrl: 'https://picsum.photos/seed/goldengate1937/800/600?grayscale',
    audioSummary: 'The Golden Gate Bridge is a suspension bridge spanning the Golden Gate.',
    facts: [
      'Opened in 1937',
      'Total length: 1.7 miles',
      'Color: International Orange'
    ],
    didYouKnow: 'The color was originally intended as a sealant.',
    coordinates: { lat: 37.8199, lng: -122.4783 }
  },
  {
    id: 'p3',
    name: 'Alcatraz Island',
    description: 'A small island in San Francisco Bay, known for its former federal prison.',
    imageUrl: 'https://picsum.photos/seed/alcatraz/800/600',
    category: 'Historic',
    distance: '2.0 mi',
    historicalEra: '1960',
    historicalImageUrl: 'https://picsum.photos/seed/alcatraz1960/800/600?grayscale',
    audioSummary: 'Alcatraz Island is a small island in San Francisco Bay, known for its former federal prison.',
    facts: [
      'Federal prison from 1934 to 1963',
      'Also known as "The Rock"',
      'Now a popular tourist attraction'
    ],
    didYouKnow: 'No prisoner ever successfully escaped and survived, though some are still listed as missing.',
    coordinates: { lat: 37.8267, lng: -122.4230 }
  }
];

export const mockTranscript: TranscriptMessage[] = [
  { id: 't1', role: 'user', text: 'What is this building?', timestamp: '10:00 AM' },
  { id: 't2', role: 'ai', text: 'This is the Palace of Fine Arts, built in 1915 for the Panama-Pacific Exposition.', timestamp: '10:00 AM' },
  { id: 't3', role: 'user', text: 'Why is it important?', timestamp: '10:01 AM' },
  { id: 't4', role: 'ai', text: 'It is a rare surviving structure from the exposition and a beloved San Francisco landmark.', timestamp: '10:01 AM' }
];

export const mockSessions: Session[] = [
  {
    id: 's1',
    date: 'Today',
    placesExplored: [mockPlaces[0]],
    transcript: mockTranscript
  },
  {
    id: 's2',
    date: 'Yesterday',
    placesExplored: [mockPlaces[1], mockPlaces[2]],
    transcript: []
  }
];

export const mockSavedPlaces: SavedPlace[] = [
  {
    ...mockPlaces[0],
    savedAt: '2026-03-12T10:00:00Z',
    notes: 'Must visit again at sunset.'
  },
  {
    ...mockPlaces[1],
    savedAt: '2026-03-10T14:30:00Z'
  }
];
