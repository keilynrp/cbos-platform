import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  FileText,
  Folder,
  MoreHorizontal,
  Clock,
  Star,
  Share2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Code,
  Quote,
  Image,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  ChevronRight,
  ChevronDown,
  Tag,
  GitBranch,
  Eye,
  Pencil,
  BookOpen,
  Database,
  Building2,
  User,
  X,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";

// --- Mock Data ---

interface Doc {
  id: string;
  title: string;
  icon: string;
  folder?: string;
  lastEdited: string;
  editedBy: string;
  editedByInitials: string;
  tags: string[];
  linkedEntities: { label: string; type: "author" | "dataset" | "institution" | "article" }[];
  starred: boolean;
  status: "draft" | "published" | "archived";
  versions: { version: string; date: string; author: string; initials: string; summary: string }[];
  content: string[];
}

const folders = [
  { id: "f1", name: "Platform Architecture", icon: "🏗️", count: 4 },
  { id: "f2", name: "Product Specs", icon: "📋", count: 6 },
  { id: "f3", name: "Research Papers", icon: "🔬", count: 3 },
  { id: "f4", name: "Meeting Notes", icon: "📝", count: 8 },
  { id: "f5", name: "Onboarding", icon: "🚀", count: 2 },
];

const documents: Doc[] = [
  {
    id: "doc1",
    title: "Platform Architecture Overview",
    icon: "🏗️",
    folder: "Platform Architecture",
    lastEdited: "2 hours ago",
    editedBy: "Sarah Chen",
    editedByInitials: "SC",
    tags: ["architecture", "microservices"],
    linkedEntities: [
      { label: "MIT CSAIL", type: "institution" },
      { label: "Graph Benchmark v3", type: "dataset" },
    ],
    starred: true,
    status: "published",
    versions: [
      { version: "v2.3", date: "Mar 6, 2026", author: "Sarah Chen", initials: "SC", summary: "Updated event bus architecture diagram" },
      { version: "v2.2", date: "Mar 3, 2026", author: "James Park", initials: "JP", summary: "Added vector database section" },
      { version: "v2.1", date: "Feb 28, 2026", author: "Sarah Chen", initials: "SC", summary: "Revised microservices topology" },
      { version: "v2.0", date: "Feb 20, 2026", author: "Alex Kim", initials: "AK", summary: "Major rewrite — modular architecture" },
      { version: "v1.0", date: "Jan 15, 2026", author: "Sarah Chen", initials: "SC", summary: "Initial draft" },
    ],
    content: [
      "The Composable Business OS is built on a modular microservices architecture designed for extensibility and real-time data flow between applications.",
      "Each module operates as an independent service communicating through a unified Event Bus, with shared state managed via PostgreSQL and a Graph Database for relationship queries.",
      "The API Gateway handles authentication, rate limiting, and request routing to individual services. All inter-service communication is asynchronous by default, with synchronous fallbacks for critical paths.",
      "Vector Database integration enables semantic search across all documents, entities, and knowledge assets, powering the AI recommendation engine.",
    ],
  },
  {
    id: "doc2",
    title: "CRM Module Specification",
    icon: "📋",
    folder: "Product Specs",
    lastEdited: "5 hours ago",
    editedBy: "Tom Baker",
    editedByInitials: "TB",
    tags: ["crm", "specification"],
    linkedEntities: [
      { label: "Dr. James Park", type: "author" },
    ],
    starred: false,
    status: "draft",
    versions: [
      { version: "v1.2", date: "Mar 5, 2026", author: "Tom Baker", initials: "TB", summary: "Added deal-to-project automation flow" },
      { version: "v1.1", date: "Mar 1, 2026", author: "Tom Baker", initials: "TB", summary: "Pipeline stage definitions" },
      { version: "v1.0", date: "Feb 25, 2026", author: "Amy Liu", initials: "AL", summary: "Initial spec" },
    ],
    content: [
      "The CRM module provides a complete customer relationship management solution integrated with the Composable OS knowledge graph.",
      "Key features include pipeline management, contact and organization tracking, activity timelines, and automated project creation when deals close.",
    ],
  },
  {
    id: "doc3",
    title: "Knowledge Graph Design Patterns",
    icon: "🔬",
    folder: "Research Papers",
    lastEdited: "1 day ago",
    editedBy: "Amy Liu",
    editedByInitials: "AL",
    tags: ["knowledge-graph", "research"],
    linkedEntities: [
      { label: "Dr. Sarah Chen", type: "author" },
      { label: "Knowledge Graphs at Scale", type: "article" },
      { label: "NLP Training Corpus", type: "dataset" },
    ],
    starred: true,
    status: "published",
    versions: [
      { version: "v3.1", date: "Mar 4, 2026", author: "Amy Liu", initials: "AL", summary: "Added traversal optimization section" },
      { version: "v3.0", date: "Feb 15, 2026", author: "Sarah Chen", initials: "SC", summary: "Complete rewrite with benchmarks" },
    ],
    content: [
      "This document explores design patterns for implementing knowledge graphs at enterprise scale, focusing on entity resolution, relationship inference, and query optimization.",
    ],
  },
  {
    id: "doc4",
    title: "Sprint 14 Retro Notes",
    icon: "📝",
    folder: "Meeting Notes",
    lastEdited: "3 hours ago",
    editedBy: "Alex Kim",
    editedByInitials: "AK",
    tags: ["sprint", "retro"],
    linkedEntities: [],
    starred: false,
    status: "published",
    versions: [
      { version: "v1.0", date: "Mar 6, 2026", author: "Alex Kim", initials: "AK", summary: "Retro notes from sprint 14" },
    ],
    content: [
      "Sprint 14 retrospective. What went well: knowledge graph module shipped ahead of schedule. What to improve: CRM pipeline drag-and-drop needs polish.",
    ],
  },
  {
    id: "doc5",
    title: "AI Agent Framework Spec",
    icon: "🤖",
    folder: "Product Specs",
    lastEdited: "4 hours ago",
    editedBy: "James Park",
    editedByInitials: "JP",
    tags: ["ai", "agents", "specification"],
    linkedEntities: [
      { label: "Dr. Amy Liu", type: "author" },
      { label: "Vector Embeddings Paper", type: "article" },
    ],
    starred: false,
    status: "draft",
    versions: [
      { version: "v0.3", date: "Mar 6, 2026", author: "James Park", initials: "JP", summary: "Agent tool-use architecture" },
      { version: "v0.2", date: "Mar 2, 2026", author: "Amy Liu", initials: "AL", summary: "Added RAG pipeline design" },
      { version: "v0.1", date: "Feb 27, 2026", author: "James Park", initials: "JP", summary: "Initial framework outline" },
    ],
    content: [
      "The AI Agent framework enables specialized agents (Research, Marketing, Project Assistant, Data Analyst) to operate on company data with tool-use capabilities and RAG-powered context retrieval.",
    ],
  },
  {
    id: "doc6",
    title: "New Employee Onboarding Guide",
    icon: "🚀",
    folder: "Onboarding",
    lastEdited: "2 days ago",
    editedBy: "Rachel Kim",
    editedByInitials: "RK",
    tags: ["onboarding", "hr"],
    linkedEntities: [],
    starred: false,
    status: "published",
    versions: [
      { version: "v4.0", date: "Mar 1, 2026", author: "Rachel Kim", initials: "RK", summary: "Updated for 2026 Q1" },
    ],
    content: [
      "Welcome to Composable OS! This guide covers everything you need to get started — from setting up your workspace to understanding our modular platform architecture.",
    ],
  },
];

const entityIconMap: Record<string, typeof User> = {
  author: User,
  dataset: Database,
  institution: Building2,
  article: BookOpen,
};

const entityColorMap: Record<string, { text: string; bg: string; border: string }> = {
  author: { text: "text-primary", bg: "bg-[hsl(var(--cbs-purple-light))]", border: "border-primary/20" },
  dataset: { text: "text-[hsl(var(--cbs-green))]", bg: "bg-[hsl(var(--cbs-green))]/10", border: "border-[hsl(var(--cbs-green))]/20" },
  institution: { text: "text-[hsl(var(--cbs-amber))]", bg: "bg-[hsl(var(--cbs-amber))]/10", border: "border-[hsl(var(--cbs-amber))]/20" },
  article: { text: "text-accent", bg: "bg-[hsl(var(--cbs-blue-light))]", border: "border-accent/20" },
};

const statusConfig: Record<string, { label: string; class: string }> = {
  draft: { label: "Draft", class: "bg-[hsl(var(--cbs-amber))]/15 text-[hsl(var(--cbs-amber))] border-[hsl(var(--cbs-amber))]/20" },
  published: { label: "Published", class: "bg-[hsl(var(--cbs-green))]/15 text-[hsl(var(--cbs-green))] border-[hsl(var(--cbs-green))]/20" },
  archived: { label: "Archived", class: "bg-muted text-muted-foreground border-border" },
};

// --- Sub-Components ---

function DocumentList({ docs, onSelect, selectedId }: { docs: Doc[]; onSelect: (id: string) => void; selectedId: string | null }) {
  return (
    <div className="space-y-1">
      {docs.map(doc => {
        const status = statusConfig[doc.status];
        return (
          <div
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              selectedId === doc.id ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
            }`}
          >
            <span className="text-lg shrink-0">{doc.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                {doc.starred && <Star className="h-3 w-3 text-[hsl(var(--cbs-amber))] fill-[hsl(var(--cbs-amber))]" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">{doc.folder}</span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-[11px] text-muted-foreground">{doc.lastEdited}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.class}`}>{status.label}</Badge>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary/10 text-primary text-[9px]">{doc.editedByInitials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditorToolbar() {
  const groups = [
    [
      { icon: Undo, label: "Undo" },
      { icon: Redo, label: "Redo" },
    ],
    [
      { icon: Heading1, label: "Heading 1" },
      { icon: Heading2, label: "Heading 2" },
    ],
    [
      { icon: Bold, label: "Bold" },
      { icon: Italic, label: "Italic" },
      { icon: Underline, label: "Underline" },
      { icon: Strikethrough, label: "Strikethrough" },
      { icon: Code, label: "Code" },
    ],
    [
      { icon: List, label: "Bullet List" },
      { icon: ListOrdered, label: "Numbered List" },
      { icon: Quote, label: "Blockquote" },
    ],
    [
      { icon: AlignLeft, label: "Left" },
      { icon: AlignCenter, label: "Center" },
      { icon: AlignRight, label: "Right" },
    ],
    [
      { icon: Link2, label: "Link" },
      { icon: Image, label: "Image" },
      { icon: Tag, label: "Link Entity" },
    ],
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap p-2 border-b border-border bg-muted/30 rounded-t-lg">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <Separator orientation="vertical" className="h-5 mx-1" />}
          {group.map(item => {
            const Icon = item.icon;
            return (
              <Button key={item.label} variant="ghost" size="icon" className="h-7 w-7" title={item.label}>
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DocumentEditor({ doc }: { doc: Doc }) {
  const status = statusConfig[doc.status];

  return (
    <div className="space-y-4">
      {/* Doc Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{doc.icon}</span>
            <h2 className="text-xl font-bold">{doc.title}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Edited {doc.lastEdited} by {doc.editedBy}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.class}`}>{status.label}</Badge>
            <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> {doc.versions[0]?.version}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Eye className="h-3.5 w-3.5" /> Preview</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Share2 className="h-3.5 w-3.5" /> Share</Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        </div>
      </div>

      {/* Linked Entities */}
      {doc.linkedEntities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Linked:</span>
          {doc.linkedEntities.map(entity => {
            const colors = entityColorMap[entity.type];
            const Icon = entityIconMap[entity.type];
            return (
              <span
                key={entity.label}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
              >
                <Icon className="h-3 w-3" />
                {entity.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {doc.tags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">{tag}</Badge>
        ))}
      </div>

      {/* Editor */}
      <Card className="border border-border/60 overflow-hidden">
        <EditorToolbar />
        <CardContent className="p-6 min-h-[300px] space-y-4">
          {doc.content.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/90">{para}</p>
          ))}
          <p className="text-sm text-muted-foreground/50 italic">Continue writing...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function VersionHistory({ doc }: { doc: Doc }) {
  return (
    <Card className="border border-border/60 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4" /> Version History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {doc.versions.map((v, i) => (
          <div key={v.version} className={`flex gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${i === 0 ? "bg-primary/5" : "hover:bg-muted/40"}`}>
            <div className="relative">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {v.version.replace("v", "")}
              </div>
              {i < doc.versions.length - 1 && (
                <div className="absolute left-1/2 top-7 w-px h-[calc(100%+4px)] bg-border -translate-x-1/2" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{v.version}</span>
                {i === 0 && <Badge variant="default" className="text-[9px] px-1.5 py-0">Current</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{v.summary}</p>
              <div className="flex items-center gap-2 mt-1">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="bg-primary/10 text-primary text-[8px]">{v.initials}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground">{v.author} · {v.date}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

const Documents = () => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["f1", "f2"]));

  const selectedDoc = selectedDocId ? documents.find(d => d.id === selectedDocId) : null;
  const filtered = documents.filter(d =>
    !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.tags.some(t => t.includes(searchQuery.toLowerCase()))
  );

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // List view
  if (!selectedDoc) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground text-sm mt-1">Collaborative documents with version control and linked knowledge entities.</p>
          </div>
          <Button className="gap-2"><Plus className="h-4 w-4" /> New Document</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar — Folders */}
          <div className="space-y-1">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search docs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">FOLDERS</p>
            {folders.map(f => (
              <div
                key={f.id}
                onClick={() => toggleFolder(f.id)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
              >
                {expandedFolders.has(f.id) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <span>{f.icon}</span>
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.count}</span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="px-2 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">QUICK STATS</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total", value: "23" },
                  { label: "Drafts", value: "7" },
                  { label: "Published", value: "14" },
                  { label: "Linked", value: "18" },
                ].map(s => (
                  <div key={s.label} className="rounded-md bg-muted/50 p-2 text-center">
                    <p className="text-sm font-semibold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document List */}
          <div className="lg:col-span-3">
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">All Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentList docs={filtered} onSelect={setSelectedDocId} selectedId={selectedDocId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Editor view
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1.5 text-xs -ml-2" onClick={() => setSelectedDocId(null)}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Documents
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DocumentEditor doc={selectedDoc} />
        </div>
        <div>
          <VersionHistory doc={selectedDoc} />
        </div>
      </div>
    </div>
  );
};

export default Documents;
