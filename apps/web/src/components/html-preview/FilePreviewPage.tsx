import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  closeFilePreviewWindow,
  maximizeFilePreviewWindow,
  minimizeFilePreviewWindow,
  isFilePreviewWindowMaximized,
  readFilePreview,
  saveFilePreviewAs,
} from '@/services/electron';

export function FilePreviewPage() {
  const { previewId = '' } = useParams();
  const [html, setHtml] = useState('');
  const [fileName, setFileName] = useState('');
  const [expired, setExpired] = useState(false);
  const [isMaximized, setIsMaximized] = useState(true);

  useEffect(() => {
    let mounted = true;
    readFilePreview(previewId).then((result) => {
      if (!mounted) return;
      if (!result) {
        setExpired(true);
        return;
      }
      setHtml(result.html);
      setFileName(result.fileName);
    }).catch(() => setExpired(true));

    isFilePreviewWindowMaximized(previewId).then((result) => {
      if (mounted) setIsMaximized(result.isMaximized);
    }).catch(() => { /* ignore */ });

    return () => {
      mounted = false;
    };
  }, [previewId]);

  const handleClose = useCallback(() => {
    void closeFilePreviewWindow(previewId);
  }, [previewId]);

  const handleMinimize = useCallback(() => {
    void minimizeFilePreviewWindow(previewId);
  }, [previewId]);

  const handleMaximize = useCallback(() => {
    void maximizeFilePreviewWindow(previewId).then((result) => {
      if (typeof result.isMaximized === 'boolean') {
        setIsMaximized(result.isMaximized);
      } else {
        setIsMaximized((prev) => !prev);
      }
    }).catch(() => { /* ignore */ });
  }, [previewId]);

  const handleDownload = useCallback(() => {
    void saveFilePreviewAs(previewId);
  }, [previewId]);

  return (
    <main className="deep-space flex h-screen flex-col overflow-hidden text-foreground">
      <header
        className="glass-l2 flex h-12 shrink-0 select-none items-center justify-between border-b border-border/60 px-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleDownload} disabled={!fileName}>
            <Download className="h-4 w-4" />
            下载
          </Button>
        </div>
        <div className="min-w-0 px-4 text-center text-sm font-medium text-muted-foreground">
          <span className="truncate">{fileName || '文件安全预览'}</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleMinimize} title="最小化">
            <Minus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleMaximize} title={isMaximized ? '还原' : '最大化'}>
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {expired ? (
        <section className="flex flex-1 items-center justify-center p-6">
          <div className="glass-l3 max-w-md rounded-2xl p-6 text-center">
            <h1 className="mb-2 text-lg font-semibold">预览已过期</h1>
            <p className="text-sm text-muted-foreground">临时文件不存在或已被清理，请回到对话中重新预览。</p>
          </div>
        </section>
      ) : (
        <iframe title="文件安全预览" sandbox="" srcDoc={html} className="h-full w-full flex-1 bg-white" />
      )}
    </main>
  );
}
