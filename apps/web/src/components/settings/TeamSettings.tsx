/* 智能体协作页 */
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { TeamTemplate } from '@/types';
import { TemplateGrid } from './team/TemplateGrid';
import { TemplateFormDialog } from './team/TemplateFormDialog';
import { DeleteConfirm } from './team/DeleteConfirm';
import { listTeams, saveTeam, deleteTeam } from '@/services/electron';
import { toast } from 'sonner';

const TEAM_PAGE_SIZE = 6;

export default function TeamSettings() {
  const [teams, setTeams] = useState<TeamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TeamTemplate | null>(null);
  const [detailView, setDetailView] = useState<TeamTemplate | null>(null);
  const [teamPage, setTeamPage] = useState(0);
  const [teamSearch, setTeamSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTeams()
      .then((list) => {
        if (cancelled) return;
        setTeams(list);
      })
      .catch((err) => {
        console.error('加载智能体团队失败:', err);
        if (!cancelled) toast.error('加载智能体团队失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeleteTeam() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (detailView?.id === target.id) setDetailView(null);
    try {
      await deleteTeam(target.id);
      setTeams((prev) => prev.filter((t) => t.id !== target.id));
      toast.success('已删除');
    } catch (err) {
      console.error('删除团队失败:', err);
      toast.error('删除失败');
    }
  }

  async function handleCopy(t: TeamTemplate) {
    const now = new Date();
    const copy: TeamTemplate = {
      ...t,
      id: `team-${Date.now()}`,
      name: `${t.name} (副本)`,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const saved = await saveTeam(copy);
      setTeams((prev) => [...prev, saved]);
      setDetailView(saved);
      toast.success('已复制团队');
    } catch (err) {
      console.error('复制团队失败:', err);
      toast.error('复制失败');
    }
  }

  async function handleCreate() {
    const now = new Date();
    const newTeam: TeamTemplate = {
      id: `team-${Date.now()}`,
      name: '新建团队',
      description: '',
      trigger: '',
      memberIds: [],
      mode: 'parallel',
      enabled: false,
      coordinatorId: '',
      createdAt: now,
      updatedAt: now,
    };
    try {
      const saved = await saveTeam(newTeam);
      setTeams((prev) => [...prev, saved]);
      setDetailView(saved);
    } catch (err) {
      console.error('创建团队失败:', err);
      toast.error('创建失败');
    }
  }

  async function handleSave(updated: TeamTemplate) {
    try {
      const saved = await saveTeam({ ...updated, updatedAt: new Date() });
      setTeams((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      setDetailView(null);
      toast.success('已保存');
    } catch (err) {
      console.error('保存团队失败:', err);
      toast.error('保存失败');
    }
  }

  async function handleToggleEnabled(id: string) {
    const target = teams.find((t) => t.id === id);
    if (!target) return;
    const next = { ...target, enabled: !target.enabled, updatedAt: new Date() };
    setTeams((prev) => prev.map((t) => (t.id === id ? next : t)));
    try {
      await saveTeam(next);
    } catch (err) {
      console.error('更新团队启用状态失败:', err);
      toast.error('更新失败');
      setTeams((prev) => prev.map((t) => (t.id === id ? target : t)));
    }
  }

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  const filtered = teams.filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / TEAM_PAGE_SIZE));
  const safePage = Math.min(teamPage, totalPages - 1);
  const pageTeams = filtered.slice(safePage * TEAM_PAGE_SIZE, (safePage + 1) * TEAM_PAGE_SIZE);

  const enabledMap = Object.fromEntries(teams.map((t) => [t.id, t.enabled]));

  return (
    <>
      {detailView ? (
        <TemplateFormDialog
          template={detailView}
          enabled={detailView.enabled}
          onCancel={() => setDetailView(null)}
          onSave={handleSave}
        />
      ) : (
        <TemplateGrid
          teams={pageTeams}
          filteredCount={filtered.length}
          search={teamSearch}
          setSearch={setTeamSearch}
          page={teamPage}
          setPage={setTeamPage}
          totalPages={totalPages}
          safePage={safePage}
          enabledMap={enabledMap}
          onToggleEnabled={handleToggleEnabled}
          onEdit={setDetailView}
          onCopy={handleCopy}
          onDelete={setDeleteTarget}
          onCreate={handleCreate}
        />
      )}

      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirm
            name={deleteTarget.name}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDeleteTeam}
          />
        )}
      </AnimatePresence>
    </>
  );
}
