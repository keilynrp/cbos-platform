import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  User,
  FileText,
  Database,
  Building2,
  BookOpen,
  Link2,
  X,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// --- Types ---

interface GraphNode {
  id: string;
  label: string;
  type: "author" | "article" | "dataset" | "institution" | "document" | "project";
  x: number;
  y: number;
  description?: string;
  meta?: Record<string, string>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

// --- Mock Data ---

const nodeTypeConfig: Record<GraphNode["type"], { color: string; bg: string; border: string; icon: typeof User }> = {
  author: { color: "text-primary", bg: "bg-primary/15", border: "stroke-primary", icon: User },
  article: { color: "text-accent", bg: "bg-accent/15", border: "stroke-accent", icon: BookOpen },
  dataset: { color: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/15", border: "stroke-[hsl(var(--cbs-green))]", icon: Database },
  institution: { color: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/15", border: "stroke-[hsl(var(--cbs-amber))]", icon: Building2 },
  document: { color: "text-accent", bg: "bg-accent/15", border: "stroke-accent", icon: FileText },
  project: { color: "text-primary", bg: "bg-primary/15", border: "stroke-primary", icon: Link2 },
};

const initialNodes: GraphNode[] = [
  { id: "n1", label: "Dr. Sarah Chen", type: "author", x: 420, y: 180, description: "Lead researcher in graph databases and knowledge systems.", meta: { "H-Index": "42", Papers: "87", Affiliation: "MIT" } },
  { id: "n2", label: "Dr. James Park", type: "author", x: 180, y: 320, description: "Expert in NLP and entity extraction.", meta: { "H-Index": "31", Papers: "54", Affiliation: "Stanford" } },
  { id: "n3", label: "Knowledge Graphs at Scale", type: "article", x: 620, y: 100, description: "Seminal paper on distributed knowledge graph architectures.", meta: { Year: "2024", Citations: "234", Journal: "Nature CS" } },
  { id: "n4", label: "Entity Extraction with LLMs", type: "article", x: 300, y: 80, description: "Novel approach to entity extraction using large language models.", meta: { Year: "2024", Citations: "128", Journal: "ACL" } },
  { id: "n5", label: "Graph Benchmark v3", type: "dataset", x: 720, y: 300, description: "Standardized benchmark for graph traversal performance.", meta: { Records: "2.4M", Format: "RDF/JSON-LD", License: "MIT" } },
  { id: "n6", label: "NLP Training Corpus", type: "dataset", x: 120, y: 140, description: "Multi-language training corpus for NLP models.", meta: { Records: "12M", Languages: "42", Size: "840GB" } },
  { id: "n7", label: "MIT CSAIL", type: "institution", x: 580, y: 380, description: "Computer Science and Artificial Intelligence Laboratory.", meta: { Researchers: "800+", Founded: "1963", Location: "Cambridge, MA" } },
  { id: "n8", label: "Stanford NLP Group", type: "institution", x: 100, y: 460, description: "World-leading NLP research group.", meta: { Researchers: "120+", Founded: "2002", Location: "Stanford, CA" } },
  { id: "n9", label: "Platform Architecture Doc", type: "document", x: 480, y: 480, description: "Internal architecture document for the Composable OS platform.", meta: { Version: "v2.3", "Last Updated": "Mar 6", Author: "Internal" } },
  { id: "n10", label: "Composable OS Core", type: "project", x: 760, y: 480, description: "Main project — building the composable business operating system.", meta: { Status: "Active", Sprint: "14", Team: "8 members" } },
  { id: "n11", label: "Vector Embeddings Paper", type: "article", x: 820, y: 180, description: "Research on vector embeddings for semantic search.", meta: { Year: "2023", Citations: "312", Journal: "ICML" } },
  { id: "n12", label: "Dr. Amy Liu", type: "author", x: 850, y: 380, description: "Specialist in vector databases and similarity search.", meta: { "H-Index": "28", Papers: "39", Affiliation: "NovaTech" } },
];

const initialEdges: GraphEdge[] = [
  { id: "e1", source: "n1", target: "n3", label: "authored" },
  { id: "e2", source: "n1", target: "n4", label: "co-authored" },
  { id: "e3", source: "n2", target: "n4", label: "authored" },
  { id: "e4", source: "n3", target: "n5", label: "uses dataset" },
  { id: "e5", source: "n4", target: "n6", label: "trained on" },
  { id: "e6", source: "n1", target: "n7", label: "affiliated with" },
  { id: "e7", source: "n2", target: "n8", label: "affiliated with" },
  { id: "e8", source: "n3", target: "n11", label: "references" },
  { id: "e9", source: "n7", target: "n9", label: "produced" },
  { id: "e10", source: "n9", target: "n10", label: "belongs to" },
  { id: "e11", source: "n5", target: "n10", label: "used in" },
  { id: "e12", source: "n12", target: "n11", label: "authored" },
  { id: "e13", source: "n12", target: "n7", label: "collaborates with" },
  { id: "e14", source: "n12", target: "n5", label: "contributed to" },
];

const stats = [
  { label: "Entities", value: "1,284" },
  { label: "Relationships", value: "3,412" },
  { label: "Documents", value: "246" },
  { label: "Datasets", value: "38" },
];

// --- Interactive Graph ---

function NetworkGraph({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  hoveredNode,
  onHoverNode,
  zoom,
  pan,
  onPanChange,
  onZoomChange,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
  hoveredNode: string | null;
  onHoverNode: (id: string | null) => void;
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (p: { x: number; y: number }) => void;
  onZoomChange: (z: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest(".graph-node")) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    onPanChange({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const handleMouseUp = () => { dragging.current = false; };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    onZoomChange(Math.max(0.3, Math.min(2.5, zoom + delta)));
  }, [zoom, onZoomChange]);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => { if (svg) svg.removeEventListener("wheel", handleWheel); };
  }, [handleWheel]);

  const connectedToSelected = selectedNode
    ? new Set(edges.filter(e => e.source === selectedNode || e.target === selectedNode).flatMap(e => [e.source, e.target]))
    : null;

  const connectedToHovered = hoveredNode
    ? new Set(edges.filter(e => e.source === hoveredNode || e.target === hoveredNode).flatMap(e => [e.source, e.target]))
    : null;

  const getNodeOpacity = (id: string) => {
    if (selectedNode) return connectedToSelected?.has(id) ? 1 : 0.2;
    if (hoveredNode) return connectedToHovered?.has(id) ? 1 : 0.35;
    return 1;
  };

  const getEdgeOpacity = (e: GraphEdge) => {
    if (selectedNode) return (e.source === selectedNode || e.target === selectedNode) ? 1 : 0.08;
    if (hoveredNode) return (e.source === hoveredNode || e.target === hoveredNode) ? 0.8 : 0.15;
    return 0.25;
  };

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg
      ref={svgRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={(e) => { if (!(e.target as SVGElement).closest(".graph-node")) onSelectNode(null); }}
    >
      <defs>
        <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.1" />
        </filter>
      </defs>
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
        {/* Edges */}
        {edges.map((edge) => {
          const s = nodeMap[edge.source];
          const t = nodeMap[edge.target];
          if (!s || !t) return null;
          const opacity = getEdgeOpacity(edge);
          const isHighlighted = selectedNode ? (edge.source === selectedNode || edge.target === selectedNode) : false;
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          return (
            <g key={edge.id} style={{ opacity, transition: "opacity 0.2s" }}>
              <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="hsl(var(--border))" strokeWidth={isHighlighted ? 2 : 1} />
              {(isHighlighted || (!selectedNode && !hoveredNode)) && (
                <text x={mx} y={my - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: "9px" }}>
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {nodes.map((node) => {
          const config = nodeTypeConfig[node.type];
          const isSelected = selectedNode === node.id;
          const opacity = getNodeOpacity(node.id);
          const r = isSelected ? 30 : 24;
          return (
            <g
              key={node.id}
              className="graph-node cursor-pointer"
              style={{ opacity, transition: "opacity 0.2s" }}
              onClick={(e) => { e.stopPropagation(); onSelectNode(isSelected ? null : node.id); }}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
            >
              <circle cx={node.x} cy={node.y} r={r + 4} fill="transparent" />
              <circle
                cx={node.x} cy={node.y} r={r}
                className={`fill-card ${config.border}`}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter="url(#node-shadow)"
              />
              <text
                x={node.x} y={node.y + 4}
                textAnchor="middle"
                className={`${config.color} pointer-events-none`}
                style={{ fontSize: "13px" }}
              >
                {node.type === "author" ? "👤" : node.type === "article" ? "📄" : node.type === "dataset" ? "🗄️" : node.type === "institution" ? "🏛️" : node.type === "document" ? "📝" : "📁"}
              </text>
              <text
                x={node.x} y={node.y + r + 14}
                textAnchor="middle"
                className="fill-foreground pointer-events-none"
                style={{ fontSize: "10px", fontWeight: 500 }}
              >
                {node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// --- Detail Panel ---

function NodeDetail({ node, edges, nodes, onClose }: { node: GraphNode; edges: GraphEdge[]; nodes: GraphNode[]; onClose: () => void }) {
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;
  const related = edges
    .filter(e => e.source === node.id || e.target === node.id)
    .map(e => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = nodes.find(n => n.id === otherId);
      return { edge: e, node: other };
    })
    .filter(r => r.node);

  return (
    <Card className="border border-border/60 h-full overflow-auto">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-sm">{node.label}</CardTitle>
              <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize">{node.type}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {node.description && <p className="text-xs text-muted-foreground">{node.description}</p>}
        {node.meta && (
          <div className="space-y-1.5">
            {Object.entries(node.meta).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold mb-2">Connections ({related.length})</p>
          <div className="space-y-1.5">
            {related.map(({ edge, node: other }) => {
              if (!other) return null;
              const otherConfig = nodeTypeConfig[other.type];
              const OtherIcon = otherConfig.icon;
              return (
                <div key={edge.id} className="flex items-center gap-2 text-xs p-1.5 rounded-md hover:bg-muted/50 cursor-pointer">
                  <div className={`h-5 w-5 rounded ${otherConfig.bg} flex items-center justify-center shrink-0`}>
                    <OtherIcon className={`h-3 w-3 ${otherConfig.color}`} />
                  </div>
                  <span className="truncate font-medium">{other.label}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

const KnowledgeGraph = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.95);
  const [pan, setPan] = useState({ x: 20, y: 10 });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<GraphNode["type"]>>(new Set());

  const filteredNodes = initialNodes.filter(n => {
    if (activeFilters.size > 0 && !activeFilters.has(n.type)) return false;
    if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = initialEdges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

  const selectedNodeData = selectedNode ? initialNodes.find(n => n.id === selectedNode) : null;

  const toggleFilter = (type: GraphNode["type"]) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const typeFilters: { type: GraphNode["type"]; label: string }[] = [
    { type: "author", label: "Authors" },
    { type: "article", label: "Articles" },
    { type: "dataset", label: "Datasets" },
    { type: "institution", label: "Institutions" },
    { type: "document", label: "Documents" },
    { type: "project", label: "Projects" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Explore entities, relationships, and connected data across your organization.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="border border-border/60">
            <CardContent className="p-4 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {typeFilters.map(f => {
            const config = nodeTypeConfig[f.type];
            const active = activeFilters.size === 0 || activeFilters.has(f.type);
            return (
              <Button
                key={f.type}
                variant={active && activeFilters.size > 0 ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => toggleFilter(f.type)}
              >
                {f.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setZoom(0.95); setPan({ x: 20, y: 10 }); }}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Graph + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "520px" }}>
        <div className={`${selectedNodeData ? "lg:col-span-3" : "lg:col-span-4"} rounded-xl border border-border/60 bg-card overflow-hidden`}>
          <NetworkGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            hoveredNode={hoveredNode}
            onHoverNode={setHoveredNode}
            zoom={zoom}
            pan={pan}
            onPanChange={setPan}
            onZoomChange={setZoom}
          />
        </div>
        {selectedNodeData && (
          <div className="lg:col-span-1">
            <NodeDetail
              node={selectedNodeData}
              edges={initialEdges}
              nodes={initialNodes}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">Legend:</span>
        {typeFilters.map(f => {
          const config = nodeTypeConfig[f.type];
          const Icon = config.icon;
          return (
            <span key={f.type} className="flex items-center gap-1.5">
              <div className={`h-4 w-4 rounded ${config.bg} flex items-center justify-center`}>
                <Icon className={`h-2.5 w-2.5 ${config.color}`} />
              </div>
              {f.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default KnowledgeGraph;
