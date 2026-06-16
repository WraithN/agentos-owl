/* 图片消息 */
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@owl-os/core';

export default function ImageMessage({ url, caption, streaming }: { url: string; caption?: string; streaming?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  if (streaming) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden flex items-center justify-center h-32 gap-2 text-xs"
        style={{
          background: 'rgba(0,0,0,0.20)',
          border: '1px solid var(--border-l2)',
          color: 'var(--text-tertiary)',
        }}>
        <ImageIcon className="w-4 h-4 animate-pulse" />
        <span>图片生成中<span className="inline-block w-0.5 h-3.5 bg-cyan-400 ml-0.5 align-middle animate-pulse rounded-sm" /></span>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      <div className="rounded-xl overflow-hidden relative"
        style={{
          background: 'rgba(0,0,0,0.20)',
          border: '1px solid var(--border-l2)',
          boxShadow: 'var(--shadow-sm)',
        }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={url}
          alt={caption ?? '生成图片'}
          onLoad={() => setLoaded(true)}
          className={cn('w-full max-h-72 object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      </div>
      {caption && (
        <p className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>{caption}</p>
      )}
    </div>
  );
}
