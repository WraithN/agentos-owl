/* AI 生成文件结果卡片 */
import { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadLocalFile, getLocalFileInfo, openLocalFilePreview, type LocalFileInfo } from '@/services/electron';
import { toast } from 'sonner';

interface FileResultCardsProps {
  sessionId: string;
  filePaths: string[];
}

function formatFileTime(timestamp?: number): string {
  if (!timestamp) return '未知时间';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FileResultCard({ sessionId, info }: { sessionId: string; info: LocalFileInfo }) {
  const handlePreview = () => {
    if (!info.exists) {
      toast.error('文件不存在，请确认路径正确');
      return;
    }
    void openLocalFilePreview(sessionId, info.filePath).catch((error: unknown) => {
      const detail = error as { code?: string; message?: string };
      toast.error(`预览失败：${detail.message ?? '未知错误'}`);
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!info.exists) {
      toast.error('文件不存在，请确认路径正确');
      return;
    }
    void downloadLocalFile(info.filePath)
      .then((result) => {
        if (!result.canceled && result.filePath) toast.success('文件已保存');
      })
      .catch((error: unknown) => {
        toast.error(`下载失败：${error instanceof Error ? error.message : String(error)}`);
      });
  };

  return (
    <div
      role="button"
      tabIndex={info.exists ? 0 : -1}
      onClick={info.exists ? handlePreview : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePreview(); }}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${info.exists ? 'cursor-pointer border-border/50 bg-background/50 hover:bg-background/70' : 'border-destructive/30 bg-destructive/5'}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${info.exists ? 'bg-cyan-500/10 text-cyan-400' : 'bg-muted text-muted-foreground'}`}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{info.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {info.exists ? `创建时间：${formatFileTime(info.createdAt)}` : '文件尚未生成或路径无效'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!info.exists} onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function FileResultCards({ sessionId, filePaths }: FileResultCardsProps) {
  const [infos, setInfos] = useState<LocalFileInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all(filePaths.map((filePath) => getLocalFileInfo(filePath)))
      .then((results) => {
        if (!mounted) return;
        setInfos(results);
      })
      .catch((error: unknown) => {
        console.error('获取生成文件信息失败:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [filePaths]);

  if (loading) {
    return <div className="text-xs text-muted-foreground">正在读取生成文件…</div>;
  }

  if (infos.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">生成文件</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {infos.map((info) => (
          <FileResultCard key={info.filePath} sessionId={sessionId} info={info} />
        ))}
      </div>
    </div>
  );
}
