import { useState } from 'react';

export function useConfirmDelete<T extends string = string>() {
  const [pendingId, setPendingId] = useState<T | null>(null);
  return {
    pendingId,
    setPending: (id: T) => setPendingId(id),
    clearPending: () => setPendingId(null),
  };
}
