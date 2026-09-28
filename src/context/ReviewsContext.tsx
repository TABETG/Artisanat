import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listApprovedReviews } from '../lib/api';
import { Review } from '../types';

interface Summary { average: number; count: number }
interface ReviewsValue { reviews: Review[]; summary: (productId: string) => Summary | null; reload: () => void }
const ReviewsContext = createContext<ReviewsValue>({ reviews: [], summary: () => null, reload: () => {} });

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const reload = useCallback(() => { listApprovedReviews().then(setReviews).catch(() => setReviews([])); }, []);
  useEffect(reload, [reload]);
  const value = useMemo<ReviewsValue>(() => {
    const map = new Map<string, Summary>();
    reviews.forEach((r) => {
      const cur = map.get(r.product_id) ?? { average: 0, count: 0 };
      map.set(r.product_id, { average: (cur.average * cur.count + r.rating) / (cur.count + 1), count: cur.count + 1 });
    });
    return { reviews, summary: (id) => map.get(id) ?? null, reload };
  }, [reviews, reload]);
  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export const useReviews = () => useContext(ReviewsContext);
