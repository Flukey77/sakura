'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-red-600 mt-2">{error.message}</p>
      <button onClick={() => reset()} className="mt-4 rounded bg-black text-white px-3 py-1.5">
        Try again
      </button>
    </div>
  );
}
