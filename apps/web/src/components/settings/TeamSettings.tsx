/* 智能体协作页 */
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TEAM_TEMPLATES } from '@/data/mockData';
import type { TeamTemplate } from '@/types';
import { TemplateGrid } from './team/TemplateGrid';
import { TemplateFormDialog } from './team/TemplateFormDialog';
import { DeleteConfirm } from './team/DeleteConfirm';

const TEAM_PAGE_SIZE = 6;

export default function TeamSettings() {
  const [teams, setTeams] = useState<TeamTemplate[]>(TEAM_TEMPLATES);
  const [deleteTarget, setDeleteTarget] = useState<TeamTemplate | null>(null);
  const [detailView, setDetailView] = useState<TeamTemplate | null>(null);
  const [teamPage, setTeamPage] = useState(0);
  const [teamSearch, setTeamSearch] = useState('');
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(Object.fromEntries(TEAM_TEMPLATES.map(t => [t.id, t.enabled])));

  function handleDeleteTeam() {
    if (!deleteTarget) return;
    const remaining = teams.filter(t => t.id !== deleteTarget.id);
    setTeams(remaining);
    if (detailView?.id === deleteTarget.id) setDetailView(null);
    setDeleteTarget(null);
  }

  function handleCopy(t: TeamTemplate) {
    const now = new Date();
    const copy: TeamTemplate = {
      ...t,
      id: `team-${Date.now()}`,
      name: `${t.name} (副本)`,
      enabled: false,
      createdAt: now,
      updatedAt: now,
    };
    setTeams(prev => [...prev, copy]);
    setEnabledMap(prev => ({ ...prev, [copy.id]: false }));
    setDetailView(copy);
  }

  function handleCreate() {
    const now = new Date();
    const newTeam: TeamTemplate = {
      id: `team-${Date.now()}`, name: '新建团队', description: '', trigger: '',
      memberIds: [], mode: 'parallel', enabled: false, coordinatorId: '',
      createdAt: now, updatedAt: now,
    };
    setTeams(prev => [...prev, newTeam]);
    setEnabledMap(prev => ({ ...prev, [newTeam.id]: false }));
    setDetailView(newTeam);
  }

  function handleSave(updated: TeamTemplate) {
    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
    setDetailView(null);
  }

  const filtered = teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / TEAM_PAGE_SIZE));
  const safePage = Math.min(teamPage, totalPages - 1);
  const pageTeams = filtered.slice(safePage * TEAM_PAGE_SIZE, (safePage + 1) * TEAM_PAGE_SIZE);

  return (
    <>
      {detailView ? (
        <TemplateFormDialog
          template={detailView}
          enabled={enabledMap[detailView.id] ?? detailView.enabled}
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
          onToggleEnabled={id => setEnabledMap(prev => ({ ...prev, [id]: !prev[id] }))}
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
