import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { closeHtmlPreviewWindow, readHtmlPreview, saveHtmlPreviewAs } from '@/services/electron';

export function HtmlPreviewPage() {
  const { previewId = '' } = useParams();
  const [html, setHtml] = useState('');
  const [fileName, setFileName] = useState('preview.html');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let mounted = true;
    readHtmlPreview(previewId).then((result) => {
      if (!mounted) return;
      if (!result) {
        setExpired(true);
        return;
      }
      setHtml(result.html);
      setFileName(result.fileName);
    }).catch(() => setExpired(true));
    return () => {
      mounted = false;
    };
  }, [previewId]);

  const handleClose = useCallback(() => {
    void closeHtmlPreviewWindow(previewId);
  }, [previewId]);

  const handleDownload = useCallback(() => {
    if (!html) return;
    void saveHtmlPreviewAs({ html, defaultName: fileName });
  }, [fileName, html]);

  return (
    <main className="deep-space flex h-screen flex-col overflow-hidden text-foreground">
      <header className="glass-l2 flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleClose}>
          <X className="h-4 w-4" />
          关闭
        </Button>
        <div className="min-w-0 px-4 text-center text-sm font-medium text-muted-foreground">
          <span className="truncate">HTML 安全预览</span>
        </div>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleDownload} disabled={!html}>
          <Download className="h-4 w-4" />
          下载
        </Button>
      </header>

      {expired ? (
        <section className="flex flex-1 items-center justify-center p-6">
          <div className="glass-l3 max-w-md rounded-2xl p-6 text-center">
            <h1 className="mb-2 text-lg font-semibold">预览已过期</h1>
            <p className="text-sm text-muted-foreground">临时文件不存在或已被清理，请回到对话中重新执行。</p>
          </div>
        </section>
      ) : (
        <iframe title="HTML 安全预览" sandbox="allow-scripts" srcDoc={html} className="h-full w-full flex-1 bg-white" />
      )}
    </main>
  );
}
