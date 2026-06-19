import { useState } from 'react';

const GRAPH_NODES = [
  { id: 'c1', label: 'Thing', type: 'class', x: 380, y: 50, color: '#6366f1' },
  { id: 'c2', label: 'Person', type: 'class', x: 180, y: 150, color: '#06b6d4' },
  { id: 'c3', label: 'Organization', type: 'class', x: 580, y: 150, color: '#10b981' },
  { id: 'c4', label: 'Employee', type: 'class', x: 120, y: 280, color: '#8b5cf6' },
  { id: 'c5', label: 'Product', type: 'class', x: 580, y: 280, color: '#f59e0b' },
  { id: 'c6', label: 'Event', type: 'class', x: 380, y: 280, color: '#ec4899' },
  { id: 'e1', label: '张三', type: 'entity', x: 50, y: 390, color: '#8b5cf6' },
  { id: 'e3', label: 'Owl Inc.', type: 'entity', x: 540, y: 390, color: '#10b981' },
];
const GRAPH_EDGES = [
  { from: 'c2', to: 'c1', label: 'subClassOf' }, { from: 'c3', to: 'c1', label: 'subClassOf' },
  { from: 'c4', to: 'c2', label: 'subClassOf' }, { from: 'c5', to: 'c1', label: 'subClassOf' },
  { from: 'c6', to: 'c1', label: 'subClassOf' }, { from: 'e1', to: 'c4', label: 'instanceOf' },
  { from: 'e3', to: 'c3', label: 'instanceOf' }, { from: 'e1', to: 'e3', label: 'worksFor' },
];

export default function KnowledgeGraph() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="w-full h-full overflow-auto">
      <svg width={750} height={460} className="min-w-full">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#64748b" /></marker>
          <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" /></marker>
        </defs>
        {GRAPH_EDGES.map((e, i) => {
          const f = GRAPH_NODES.find(n => n.id === e.from)!; const t = GRAPH_NODES.find(n => n.id === e.to)!;
          const dx = t.x - f.x; const dy = t.y - f.y; const len = Math.sqrt(dx * dx + dy * dy);
          const r = 26;
          return (
            <g key={i}>
              <line x1={f.x + (dx / len) * r} y1={f.y + (dy / len) * r} x2={t.x - (dx / len) * r} y2={t.y - (dy / len) * r}
                stroke={e.label === 'instanceOf' ? '#94a3b8' : '#64748b'} strokeWidth={1.5}
                strokeDasharray={e.label === 'instanceOf' ? '4,3' : undefined} markerEnd={e.label === 'instanceOf' ? 'url(#arr2)' : 'url(#arr)'}
                opacity={hovered && hovered !== e.from && hovered !== e.to ? 0.2 : 0.7} />
              <text x={(f.x + t.x) / 2} y={(f.y + t.y) / 2 - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#94a3b8' }}>{e.label}</text>
            </g>
          );
        })}
        {GRAPH_NODES.map(node => {
          const isEnt = node.type === 'entity';
          const isHov = hovered === node.id;
          const dimmed = hovered !== null && !isHov && !GRAPH_EDGES.some(e => (e.from === hovered && e.to === node.id) || (e.to === hovered && e.from === node.id));
          return (
            <g key={node.id} transform={`translate(${node.x},${node.y})`} style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)}>
              {isEnt ? <rect x={-28} y={-16} width={56} height={32} rx={6} fill={node.color + '18'} stroke={node.color} strokeWidth={isHov ? 2 : 1.5} />
                : <circle r={26} fill={node.color + '18'} stroke={node.color} strokeWidth={isHov ? 2 : 1.5} />}
              <text textAnchor="middle" dy="0.35em" style={{ fontSize: 11, fontWeight: 600, fill: isHov ? node.color : '#cbd5e1', transition: 'fill 0.1s' }}>{node.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
