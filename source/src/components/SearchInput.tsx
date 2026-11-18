'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useTransition } from 'react';

export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(term: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set('query', term);
      } else {
        params.delete('query');
      }

      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    }, 300); // wait 300ms after typing stops
  }

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        placeholder="Search announcements"
        defaultValue={searchParams.get('query') || ''}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
      />
      {isPending && <span className="absolute right-3 top-2.5 text-sm text-gray-400">Loading...</span>}
    </div>
  );
}