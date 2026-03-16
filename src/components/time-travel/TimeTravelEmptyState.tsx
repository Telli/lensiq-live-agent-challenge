import React from 'react';

export function TimeTravelEmptyState({
  message,
}: {
  message?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/60 p-6 text-center backdrop-blur-xl">
      <p className="text-zinc-200">
        {message ||
          'Point the camera at a landmark, room, object, or setup. LensIQ will reconstruct how this scene looked in the past.'}
      </p>
    </div>
  );
}
