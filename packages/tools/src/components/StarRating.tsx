import { Star } from 'lucide-react';
import { cn } from '@owl-os/core';

export default function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={cn('w-3 h-3', i < Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
      ))}
    </div>
  );
}
