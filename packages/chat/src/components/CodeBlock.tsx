/* 代码块（带语言徽章 + 复制 + 简易关键字着色） */
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@owl-os/core';
import type { CodeBlockData } from '../types.js';

function StreamCursor() {
  return (
    <span className="inline-block w-0.5 h-3.5 bg-cyan-400 ml-0.5 align-middle animate-pulse rounded-sm" />
  );
}

function highlight(code: string, lang: string) {
  const keywords = lang === 'python'
    ? ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'class', 'try', 'except', 'with', 'as', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'lambda', 'yield', 'async', 'await', 'pass', 'raise']
    : ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'new', 'this', 'typeof', 'instanceof', 'try', 'catch', 'throw', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'extends', 'implements'];

  const lines = code.split('\n');
  return lines.map((line, li) => {
    // 注释行
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('#')) {
      return (
        <span key={li} className="block">
          <span className="italic">{line}</span>
          {'\n'}
        </span>
      );
    }
    // 字符串匹配
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let idx = 0;
    while (remaining.length > 0) {
      // 字符串字面量
      const strMatch = remaining.match(/^(["'`])(.*?)\1/);
      if (strMatch) {
        parts.push(<span key={idx++} className="text-emerald-400">{strMatch[0]}</span>);
        remaining = remaining.slice(strMatch[0].length);
        continue;
      }
      // 关键字
      const kwMatch = keywords.find(kw => new RegExp(`^\\b${kw}\\b`).test(remaining));
      if (kwMatch) {
        parts.push(<span key={idx++} className="text-cyan-400 font-medium">{kwMatch}</span>);
        remaining = remaining.slice(kwMatch.length);
        continue;
      }
      // 数字
      const numMatch = remaining.match(/^\b\d+\.?\d*\b/);
      if (numMatch) {
        parts.push(<span key={idx++} className="text-amber-400">{numMatch[0]}</span>);
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
      parts.push(<span key={idx++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
    return <span key={li} className="block">{parts}{'\n'}</span>;
  });
}

export default function CodeBlock({ data, streaming }: { data: CodeBlockData; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(8,12,28,0.70)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 tracking-widest">
            {data.language.toUpperCase()}
          </span>
          {data.filename && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{data.filename}</span>
          )}
        </div>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-xs transition-all duration-150 btn-lift px-2 py-1 rounded-md"
          style={{ color: copied ? '#10b981' : 'var(--text-tertiary)' }}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed" style={{ color: '#cbd5e1' }}>
        {streaming
          ? <span className="italic" style={{ color: 'var(--text-tertiary)' }}>正在生成代码<StreamCursor /></span>
          : highlight(data.code, data.language)
        }
      </pre>
    </div>
  );
}
