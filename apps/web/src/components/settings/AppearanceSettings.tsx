/* 外观与主题设置 */
import { useApp } from '@/contexts/AppContext';
import type { FontSize, Language } from '@/contexts/AppContext';
import { Sun, Moon, Globe, Type, Zap, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const AURORA_COLORS = [
  { hex: '#00b89a', label: '极光绿' },
  { hex: '#0ea5e9', label: '天蓝' },
  { hex: '#7c3aed', label: '紫罗兰' },
  { hex: '#f59e0b', label: '琥珀' },
  { hex: '#f43f5e', label: '玫瑰' },
  { hex: '#10b981', label: '翡翠' },
  { hex: '#6366f1', label: '靛紫' },
  { hex: '#ec4899', label: '粉红' },
];

const FONT_SIZES: { key: FontSize; label: string; preview: string }[] = [
  { key: 'sm', label: '小',       preview: 'Aa' },
  { key: 'md', label: '中（推荐）', preview: 'Aa' },
  { key: 'lg', label: '大',       preview: 'Aa' },
];

const LANGUAGES: { key: Language; label: string; native: string }[] = [
  { key: 'zh', label: '简体中文', native: '中文' },
  { key: 'en', label: 'English', native: 'EN' },
  { key: 'ja', label: '日本語',   native: '日語' },
  { key: 'ko', label: '한국어',   native: '한국어' },
];

export default function AppearanceSettings() {
  const {
    darkMode, toggleDarkMode,
    primaryColor, setPrimaryColor,
    fontSize, setFontSize,
    animationLevel, setAnimationLevel,
    language, setLanguage,
  } = useApp();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">外观与主题</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">自定义 OwlOS 的视觉风格</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden divide-y divide-black/6 dark:divide-white/6">

        {/* 颜色模式 */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">颜色模式</label>
          </div>
          <div className="flex gap-3">
            {[
              { id: 'dark',  icon: Moon, label: '深色' },
              { id: 'light', icon: Sun,  label: '浅色' },
            ].map(m => {
              const Icon = m.icon;
              const active = darkMode ? m.id === 'dark' : m.id === 'light';
              return (
                <button key={m.id}
                  onClick={() => { if ((m.id === 'dark') !== darkMode) toggleDarkMode(); }}
                  className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all',
                    active
                      ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                      : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5')}>
                  <Icon className="w-4 h-4" />{m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 极光主色 */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">极光主色</label>
            <span className="ml-auto text-[11px] text-slate-400 font-mono">{primaryColor}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AURORA_COLORS.map(c => (
              <button key={c.hex} onClick={() => setPrimaryColor(c.hex)}
                title={c.label}
                className={cn('w-9 h-9 rounded-xl transition-all hover:scale-110',
                  primaryColor === c.hex
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110'
                    : 'opacity-80 hover:opacity-100')}
                style={{ background: c.hex }}
              >
                {primaryColor === c.hex && (
                  <span className="text-white text-xs font-bold flex items-center justify-center w-full h-full">✓</span>
                )}
              </button>
            ))}
            {/* 自定义色 */}
            <label className="w-9 h-9 rounded-xl border-2 border-dashed border-black/20 dark:border-white/20 flex items-center justify-center cursor-pointer hover:border-black/40 dark:hover:border-white/40 transition-colors" title="自定义颜色">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="opacity-0 absolute w-0 h-0" />
              <span className="text-slate-400 text-lg leading-none">+</span>
            </label>
          </div>
          {/* 实时预览条 */}
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88)` }} />
        </div>

        {/* 界面字号 */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">界面字号</label>
          </div>
          <div className="flex gap-2">
            {FONT_SIZES.map(s => (
              <button key={s.key} onClick={() => setFontSize(s.key)}
                className={cn('flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all',
                  fontSize === s.key
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                    : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5')}>
                <span className={cn('font-bold',
                  s.key === 'sm' ? 'text-sm' : s.key === 'md' ? 'text-base' : 'text-lg')}>{s.preview}</span>
                <span className="text-[10px]">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 动效强度 */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">动效强度</label>
            <span className="ml-auto text-[11px] text-slate-400 font-mono">{animationLevel}%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 shrink-0">关</span>
            <input type="range" min={0} max={100} value={animationLevel}
              onChange={e => setAnimationLevel(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-[10px] text-slate-400 shrink-0">强</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[0, 33, 66, 100].map(v => (
              <button key={v} onClick={() => setAnimationLevel(v)}
                className={cn('text-[10px] px-2 py-0.5 rounded border transition-all',
                  animationLevel === v
                    ? 'border-cyan-500/50 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                    : 'border-black/10 dark:border-white/10 text-slate-400 hover:bg-black/5 dark:hover:bg-white/5')}>
                {v === 0 ? '关闭' : v === 33 ? '低' : v === 66 ? '中' : '高'}
              </button>
            ))}
          </div>
        </div>

        {/* 多语言 */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">界面语言</label>
          </div>
          <div className="relative">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              className="w-full appearance-none bg-white/6 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500/50 transition-colors cursor-pointer pr-8"
            >
              {LANGUAGES.map(l => (
                <option key={l.key} value={l.key}>{l.native} — {l.label}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">※ 语言切换后部分内容需刷新页面生效</p>
        </div>
      </div>
    </div>
  );
}
