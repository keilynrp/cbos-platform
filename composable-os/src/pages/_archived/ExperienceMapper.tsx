import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Database, Link2, Layout, Eye, Grid3x3, Search, Sparkles,
  MonitorPlay, Settings, ArrowRight, Code2, Type, Calendar, Image,
  Hash, ToggleLeft, List, Users, Boxes, Wand2, Filter, SortAsc,
  Check, ChevronRight, Layers, Play, Palette, BarChart3, Activity,
  TrendingUp, Zap, Target, Workflow, GripVertical, X, CheckCircle2,
  MousePointerClick, Braces, ZoomIn, ZoomOut, Maximize2, RotateCcw, Trash2
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ── UI Mapper types ──────────────────────────────────────────────
type SlotMapping = { field: string; type: string } | null;

interface ComponentSlot {
  id: string;
  label: string;
  acceptTypes: string[];
  description: string;
}

interface UIComponentDef {
  id: string;
  name: string;
  icon: React.ElementType;
  slots: ComponentSlot[];
}

const fieldTypeIcon: Record<string, React.ElementType> = {
  text: Type,
  date: Calendar,
  image: Image,
  number: Hash,
  boolean: ToggleLeft,
  relation: Link2,
  repeater: List,
};

const fieldTypeColor: Record<string, string> = {
  text: "bg-blue-500/10 text-blue-600 border-blue-200",
  date: "bg-orange-500/10 text-orange-600 border-orange-200",
  image: "bg-pink-500/10 text-pink-600 border-pink-200",
  number: "bg-green-500/10 text-green-600 border-green-200",
  boolean: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  relation: "bg-purple-500/10 text-purple-600 border-purple-200",
  repeater: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
};

// ── Node Graph types ─────────────────────────────────────────────
interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  icon: string;
  fields: string[];
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  type: string;
}

const NODE_W = 180;
const NODE_H = 56;

const initialNodes: GraphNode[] = [
  { id: "event", label: "Event", x: 120, y: 80, color: "hsl(var(--chart-2))", icon: "📅", fields: ["title", "date", "cover_image", "capacity"] },
  { id: "speaker", label: "Speaker", x: 420, y: 60, color: "hsl(var(--chart-3))", icon: "🎤", fields: ["name", "bio", "avatar", "role"] },
  { id: "product", label: "Product", x: 120, y: 260, color: "hsl(var(--chart-1))", icon: "📦", fields: ["name", "price", "image", "sku"] },
  { id: "category", label: "Category", x: 420, y: 240, color: "hsl(var(--chart-4))", icon: "🏷️", fields: ["name", "slug", "parent"] },
  { id: "course", label: "Course", x: 720, y: 80, color: "hsl(var(--chart-5))", icon: "📚", fields: ["title", "level", "duration", "price"] },
  { id: "lesson", label: "Lesson", x: 720, y: 260, color: "hsl(var(--chart-1))", icon: "📝", fields: ["title", "content", "order", "video"] },
  { id: "persona", label: "Persona", x: 420, y: 420, color: "hsl(var(--chart-2))", icon: "👤", fields: ["name", "segment", "intent"] },
  { id: "lead_magnet", label: "Lead Magnet", x: 120, y: 420, color: "hsl(var(--chart-3))", icon: "🧲", fields: ["title", "type", "asset_url"] },
];

const initialEdges: GraphEdge[] = [
  { id: "e1", from: "event", to: "speaker", label: "speakers", type: "many-to-many" },
  { id: "e2", from: "product", to: "category", label: "category", type: "many-to-one" },
  { id: "e3", from: "course", to: "lesson", label: "lessons", type: "one-to-many" },
  { id: "e4", from: "lead_magnet", to: "persona", label: "target_persona", type: "many-to-one" },
];

const ExperienceMapper = () => {
  const [activeView, setActiveView] = useState<"dashboard" | "content-types" | "relations" | "ui-mapper" | "visibility" | "listings" | "queries" | "preview">("dashboard");
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // ── UI Mapper state ──────────────────────────────────────────────
  const [selectedComponent, setSelectedComponent] = useState<string>("hero");
  const [slotMappings, setSlotMappings] = useState<Record<string, SlotMapping>>({});
  const [draggingField, setDraggingField] = useState<{ field: string; type: string } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [dropSuccess, setDropSuccess] = useState<string | null>(null);

  // ── Node Graph state ───────────────────────────────────────────
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(initialNodes);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>(initialEdges);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [connectMouse, setConnectMouse] = useState({ x: 0, y: 0 });
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Zoom & Pan state ───────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.15, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.15, 0.3)), []);
  const handleZoomReset = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  const handleFitAll = useCallback(() => {
    if (!svgRef.current || graphNodes.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const minX = Math.min(...graphNodes.map(n => n.x));
    const minY = Math.min(...graphNodes.map(n => n.y));
    const maxX = Math.max(...graphNodes.map(n => n.x + NODE_W));
    const maxY = Math.max(...graphNodes.map(n => n.y + NODE_H));
    const graphW = maxX - minX + 80;
    const graphH = maxY - minY + 80;
    const newZoom = Math.min(rect.width / graphW, rect.height / graphH, 2);
    setZoom(Math.max(newZoom, 0.3));
    setPan({ x: -(minX - 40) * newZoom + (rect.width - graphW * newZoom) / 2, y: -(minY - 40) * newZoom + (rect.height - graphH * newZoom) / 2 });
  }, [graphNodes]);

  // ── Add Node state ─────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; svgX: number; svgY: number } | null>(null);
  const [showAddNodeForm, setShowAddNodeForm] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeIcon, setNewNodeIcon] = useState("📄");
  const [newNodeColor, setNewNodeColor] = useState("hsl(var(--chart-1))");
  const [addNodePosition, setAddNodePosition] = useState({ x: 200, y: 200 });

  const entityIcons = ["📄", "📦", "📅", "🎤", "📚", "📝", "👤", "🧲", "🏷️", "💼", "🎯", "🏢", "💳", "📊", "🔔", "⭐"];
  const entityColors = [
    "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
    "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary))",
  ];

  const handleAddNode = useCallback(() => {
    if (!newNodeLabel.trim()) return;
    const id = newNodeLabel.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    setGraphNodes(prev => [...prev, {
      id,
      label: newNodeLabel.trim(),
      x: addNodePosition.x,
      y: addNodePosition.y,
      color: newNodeColor,
      icon: newNodeIcon,
      fields: ["name", "description"],
    }]);
    setNewNodeLabel("");
    setNewNodeIcon("📄");
    setNewNodeColor("hsl(var(--chart-1))");
    setShowAddNodeForm(false);
    setContextMenu(null);
  }, [newNodeLabel, newNodeIcon, newNodeColor, addNodePosition]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setGraphNodes(prev => prev.filter(n => n.id !== nodeId));
    setGraphEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    setSelectedNode(null);
  }, []);

  const handleDragStart = useCallback((field: string, type: string) => {
    setDraggingField({ field, type });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingField(null);
    setDragOverSlot(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDragOverSlot(slotId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    if (!draggingField) return;
    const key = `${selectedComponent}::${slotId}`;
    setSlotMappings(prev => ({ ...prev, [key]: { field: draggingField.field, type: draggingField.type } }));
    setDragOverSlot(null);
    setDraggingField(null);
    setDropSuccess(key);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setDropSuccess(null), 1800);
  }, [draggingField, selectedComponent]);

  const clearSlot = useCallback((slotId: string) => {
    const key = `${selectedComponent}::${slotId}`;
    setSlotMappings(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, [selectedComponent]);

  // Mock data
  const contentTypes = [
    { id: "product", name: "Product", fields: 12, relations: 3, icon: Boxes, color: "bg-purple-500" },
    { id: "event", name: "Event", fields: 15, relations: 4, icon: Calendar, color: "bg-blue-500" },
    { id: "speaker", name: "Speaker", fields: 8, relations: 2, icon: Users, color: "bg-green-500" },
    { id: "course", name: "Course", fields: 10, relations: 3, icon: Database, color: "bg-orange-500" },
    { id: "testimonial", name: "Testimonial", fields: 6, relations: 1, icon: Type, color: "bg-pink-500" },
  ];

  const mappedInterfaces = [
    { name: "Event Portal", type: "Portal", fields: 24, status: "active" },
    { name: "Product Store", type: "Store", fields: 18, status: "active" },
    { name: "Speaker Directory", type: "Landing Page", fields: 12, status: "active" },
    { name: "Course Library", type: "Dashboard", fields: 15, status: "draft" },
  ];

  const activityData = [
    { name: "Mon", mappings: 12, queries: 8 },
    { name: "Tue", mappings: 19, queries: 12 },
    { name: "Wed", mappings: 15, queries: 10 },
    { name: "Thu", mappings: 22, queries: 15 },
    { name: "Fri", mappings: 28, queries: 18 },
    { name: "Sat", mappings: 18, queries: 14 },
    { name: "Sun", mappings: 14, queries: 9 },
  ];

  const contentTypeDistribution = [
    { name: "Products", value: 35 },
    { name: "Events", value: 28 },
    { name: "Courses", value: 20 },
    { name: "Others", value: 17 },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  const fieldTypes = [
    { id: "text", name: "Text", icon: Type, description: "Single line text" },
    { id: "number", name: "Number", icon: Hash, description: "Numeric value" },
    { id: "date", name: "Date", icon: Calendar, description: "Date picker" },
    { id: "image", name: "Image", icon: Image, description: "Media upload" },
    { id: "boolean", name: "Boolean", icon: ToggleLeft, description: "True/false toggle" },
    { id: "relation", name: "Relation", icon: Link2, description: "Connect to other types" },
    { id: "repeater", name: "Repeater", icon: List, description: "Multiple entries" },
  ];

  const uiComponents: UIComponentDef[] = [
    {
      id: "hero", name: "Hero Section", icon: Palette,
      slots: [
        { id: "title", label: "Title", acceptTypes: ["text"], description: "Main headline" },
        { id: "subtitle", label: "Subtitle", acceptTypes: ["text"], description: "Supporting copy" },
        { id: "image", label: "Cover Image", acceptTypes: ["image"], description: "Background or hero image" },
        { id: "cta", label: "CTA Label", acceptTypes: ["text"], description: "Button text" },
        { id: "date", label: "Date Badge", acceptTypes: ["date"], description: "Event or publish date" },
      ],
    },
    {
      id: "card", name: "Content Card", icon: Layout,
      slots: [
        { id: "title", label: "Card Title", acceptTypes: ["text"], description: "Card headline" },
        { id: "description", label: "Description", acceptTypes: ["text"], description: "Body copy" },
        { id: "image", label: "Thumbnail", acceptTypes: ["image"], description: "Card media" },
        { id: "badge", label: "Badge / Tag", acceptTypes: ["text", "boolean"], description: "Status label" },
        { id: "meta", label: "Meta Info", acceptTypes: ["date", "number"], description: "Date, price, count…" },
      ],
    },
    {
      id: "profile", name: "Speaker Profile", icon: Users,
      slots: [
        { id: "name", label: "Full Name", acceptTypes: ["text"], description: "Person name" },
        { id: "bio", label: "Bio", acceptTypes: ["text"], description: "Short description" },
        { id: "avatar", label: "Avatar", acceptTypes: ["image"], description: "Profile photo" },
        { id: "role", label: "Role / Title", acceptTypes: ["text"], description: "Job title" },
      ],
    },
    {
      id: "pricing", name: "Pricing Card", icon: Hash,
      slots: [
        { id: "price", label: "Price", acceptTypes: ["number"], description: "Amount" },
        { id: "label", label: "Plan Name", acceptTypes: ["text"], description: "Tier label" },
        { id: "cta", label: "CTA Button", acceptTypes: ["text"], description: "Button text" },
        { id: "features", label: "Features List", acceptTypes: ["repeater"], description: "Feature items" },
      ],
    },
    {
      id: "listing", name: "Listing / Grid", icon: Grid3x3,
      slots: [
        { id: "items", label: "Data Source", acceptTypes: ["relation", "repeater"], description: "Collection to list" },
        { id: "title", label: "Item Title", acceptTypes: ["text"], description: "Per-item label" },
        { id: "image", label: "Item Image", acceptTypes: ["image"], description: "Per-item thumbnail" },
        { id: "filter", label: "Filter Field", acceptTypes: ["text", "boolean", "number"], description: "Filterable field" },
      ],
    },
  ];

  const relations = [
    { from: "Event", to: "Speaker", type: "many-to-many", label: "speakers" },
    { from: "Product", to: "Category", type: "many-to-one", label: "category" },
    { from: "Course", to: "Lesson", type: "one-to-many", label: "lessons" },
    { from: "Lead Magnet", to: "Persona", type: "many-to-one", label: "target_persona" },
  ];

  const visibilityRules = [
    { component: "Premium CTA", condition: "user.plan = 'pro'", status: "active" },
    { component: "Event Button", condition: "event.seats_available > 0", status: "active" },
    { component: "Member Content", condition: "user.logged_in = true", status: "active" },
    { component: "Sale Badge", condition: "product.discount > 0", status: "draft" },
  ];

  const queries = [
    { name: "Upcoming Events", filter: "date > today", sort: "date ASC", results: 12 },
    { name: "Featured Products", filter: "featured = true", sort: "created DESC", results: 8 },
    { name: "Expert Speakers", filter: "level = 'expert'", sort: "rating DESC", results: 15 },
    { name: "Beginner Courses", filter: "level = 'beginner'", sort: "popularity DESC", results: 24 },
  ];

  const aiSuggestions = [
    { type: "content-type", message: "Create a 'Webinar' content type with registration fields" },
    { type: "relation", message: "Link 'Testimonial' to 'Product' for social proof" },
    { type: "visibility", message: "Hide pricing for logged-out users on premium pages" },
    { type: "query", message: "Add query for 'Recently Updated Resources' in knowledge hub" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Dynamic Experience Mapping Layer
              </h1>
              <p className="text-muted-foreground mt-1">
                Map structured data to dynamic frontend experiences
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowAIPanel(!showAIPanel)}>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Assistant
              </Button>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Content Type
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {[
              { id: "dashboard", label: "Control Center", icon: BarChart3 },
              { id: "content-types", label: "Content Types", icon: Database },
              { id: "relations", label: "Relations", icon: Link2 },
              { id: "ui-mapper", label: "UI Mapper", icon: Layout },
              { id: "visibility", label: "Visibility Rules", icon: Eye },
              { id: "listings", label: "Listings", icon: Grid3x3 },
              { id: "queries", label: "Queries", icon: Search },
              { id: "preview", label: "Preview", icon: MonitorPlay },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeView === tab.id ? "default" : "ghost"}
                onClick={() => setActiveView(tab.id as any)}
                className="whitespace-nowrap"
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Dashboard View */}
            {activeView === "dashboard" && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Content Types
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">12</span>
                        <Database className="h-8 w-8 text-purple-500 opacity-50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="text-green-600">+3</span> from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Mapped Interfaces
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">28</span>
                        <Layout className="h-8 w-8 text-blue-500 opacity-50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Across portals, stores & pages
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Dynamic Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">45</span>
                        <Layers className="h-8 w-8 text-green-500 opacity-50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Reusable components
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Rules
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold">67</span>
                        <Zap className="h-8 w-8 text-orange-500 opacity-50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Visibility & conditional logic
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mapping Activity</CardTitle>
                      <CardDescription>Data bindings and queries over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={activityData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Line type="monotone" dataKey="mappings" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                          <Line type="monotone" dataKey="queries" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Content Type Distribution</CardTitle>
                      <CardDescription>Usage across the ecosystem</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={contentTypeDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="hsl(var(--primary))"
                            dataKey="value"
                          >
                            {contentTypeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Content Types */}
                <Card>
                  <CardHeader>
                    <CardTitle>Active Content Types</CardTitle>
                    <CardDescription>Structured data schemas powering your experiences</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {contentTypes.map((type) => (
                        <Card key={type.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`${type.color} p-3 rounded-lg`}>
                                <type.icon className="h-6 w-6 text-white" />
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                            <h3 className="font-semibold text-lg mb-2">{type.name}</h3>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>{type.fields} fields</span>
                              <span>{type.relations} relations</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Mapped Interfaces */}
                <Card>
                  <CardHeader>
                    <CardTitle>Mapped Interfaces</CardTitle>
                    <CardDescription>Dynamic experiences powered by content types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mappedInterfaces.map((iface, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <Layout className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium">{iface.name}</p>
                              <p className="text-sm text-muted-foreground">{iface.type} • {iface.fields} field mappings</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={iface.status === "active" ? "default" : "secondary"}>
                              {iface.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Content Types View */}
            {activeView === "content-types" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Content Type Builder</CardTitle>
                        <CardDescription>Define custom schemas for structured data</CardDescription>
                      </div>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Content Type
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="schema" className="w-full">
                      <TabsList>
                        <TabsTrigger value="schema">Schema Design</TabsTrigger>
                        <TabsTrigger value="fields">Field Settings</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>

                      <TabsContent value="schema" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold mb-4">Available Field Types</h3>
                            <div className="grid gap-3">
                              {fieldTypes.map((field) => (
                                <Card key={field.id} className="hover:shadow-md transition-shadow cursor-pointer">
                                  <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                      <div className="bg-primary/10 p-2 rounded">
                                        <field.icon className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{field.name}</p>
                                        <p className="text-sm text-muted-foreground">{field.description}</p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold mb-4">Content Type: Event</h3>
                            <Card>
                              <CardContent className="p-4 space-y-3">
                                {[
                                  { name: "title", type: "Text", required: true },
                                  { name: "description", type: "Text", required: true },
                                  { name: "start_date", type: "Date", required: true },
                                  { name: "cover_image", type: "Image", required: false },
                                  { name: "speakers", type: "Relation", required: false },
                                  { name: "capacity", type: "Number", required: true },
                                  { name: "is_featured", type: "Boolean", required: false },
                                ].map((field, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-muted p-2 rounded">
                                        <Code2 className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{field.name}</p>
                                        <p className="text-xs text-muted-foreground">{field.type}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {field.required && (
                                        <Badge variant="secondary" className="text-xs">Required</Badge>
                                      )}
                                      <Button variant="ghost" size="sm">
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <Button variant="outline" className="w-full">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Field
                                </Button>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="fields" className="mt-4">
                        <Card>
                          <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                              <Label>Field Name</Label>
                              <Input placeholder="e.g., event_title" />
                            </div>
                            <div className="space-y-2">
                              <Label>Field Type</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="image">Image</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Required Field</Label>
                              <Switch />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label>Show in Admin List</Label>
                              <Switch defaultChecked />
                            </div>
                            <Separator />
                            <Button className="w-full">Save Field</Button>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="preview" className="mt-4">
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                              <MonitorPlay className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Preview how this content type appears in forms and listings</p>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Relations View */}
            {activeView === "relations" && (() => {
              const getSvgPoint = (e: React.MouseEvent) => {
                const svg = svgRef.current;
                if (!svg) return { x: 0, y: 0 };
                const rect = svg.getBoundingClientRect();
                return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
              };

              const onCanvasWheel = (e: WheelEvent) => {
                e.preventDefault();
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                const newZoom = Math.min(Math.max(zoom + delta, 0.3), 3);
                const ratio = newZoom / zoom;
                setPan(p => ({ x: mouseX - ratio * (mouseX - p.x), y: mouseY - ratio * (mouseY - p.y) }));
                setZoom(newZoom);
              };

              // Attach wheel listener
              const svgEl = svgRef.current;
              if (svgEl) {
                svgEl.onwheel = onCanvasWheel;
              }

              const onCanvasMouseDown = (e: React.MouseEvent) => {
                // Only pan on background click (not on nodes/edges)
                if (e.target === svgRef.current || (e.target as SVGElement).tagName === 'rect' && (e.target as SVGElement).getAttribute('fill')?.includes('url(#grid')) {
                  setIsPanning(true);
                  panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
                }
              };

              const onCanvasMouseMove = (e: React.MouseEvent) => {
                if (isPanning) {
                  setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) });
                  return;
                }
                const pt = getSvgPoint(e);
                if (draggingNode) {
                  setGraphNodes(prev => prev.map(n =>
                    n.id === draggingNode ? { ...n, x: pt.x - dragOffset.x, y: pt.y - dragOffset.y } : n
                  ));
                }
                if (connectingFrom) {
                  setConnectMouse(pt);
                }
              };

              const onCanvasMouseUp = (e: React.MouseEvent) => {
                if (isPanning) {
                  setIsPanning(false);
                  return;
                }
                if (connectingFrom) {
                  const pt = getSvgPoint(e);
                  const target = graphNodes.find(n =>
                    pt.x >= n.x && pt.x <= n.x + NODE_W && pt.y >= n.y && pt.y <= n.y + NODE_H && n.id !== connectingFrom
                  );
                  if (target) {
                    const exists = graphEdges.some(edge =>
                      (edge.from === connectingFrom && edge.to === target.id) ||
                      (edge.from === target.id && edge.to === connectingFrom)
                    );
                    if (!exists) {
                      setGraphEdges(prev => [...prev, {
                        id: `e_${Date.now()}`,
                        from: connectingFrom,
                        to: target.id,
                        label: "new_relation",
                        type: "many-to-one",
                      }]);
                    }
                  }
                  setConnectingFrom(null);
                }
                setDraggingNode(null);
              };

              const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
                e.stopPropagation();
                if (e.shiftKey) {
                  setConnectingFrom(nodeId);
                  const pt = getSvgPoint(e);
                  setConnectMouse(pt);
                  return;
                }
                const node = graphNodes.find(n => n.id === nodeId)!;
                const pt = getSvgPoint(e);
                setDraggingNode(nodeId);
                setDragOffset({ x: pt.x - node.x, y: pt.y - node.y });
                setSelectedNode(nodeId);
                setSelectedEdge(null);
              };

              const deleteEdge = (edgeId: string) => {
                setGraphEdges(prev => prev.filter(e => e.id !== edgeId));
                setSelectedEdge(null);
              };

              const getEdgePath = (edge: GraphEdge) => {
                const from = graphNodes.find(n => n.id === edge.from)!;
                const to = graphNodes.find(n => n.id === edge.to)!;
                const x1 = from.x + NODE_W;
                const y1 = from.y + NODE_H / 2;
                const x2 = to.x;
                const y2 = to.y + NODE_H / 2;
                const cx = (x1 + x2) / 2;
                return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
              };

              const getEdgeMidpoint = (edge: GraphEdge) => {
                const from = graphNodes.find(n => n.id === edge.from)!;
                const to = graphNodes.find(n => n.id === edge.to)!;
                return {
                  x: (from.x + NODE_W + to.x) / 2,
                  y: (from.y + NODE_H / 2 + to.y + NODE_H / 2) / 2,
                };
              };

              return (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Relations Manager — Node Graph</CardTitle>
                        <CardDescription>Drag nodes to reposition. <strong>Shift+drag</strong> from a node to connect. Click an edge to inspect or delete.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1"><Boxes className="h-3 w-3" />{graphNodes.length} entities</Badge>
                        <Badge variant="secondary" className="gap-1"><Link2 className="h-3 w-3" />{graphEdges.length} relations</Badge>
                        <Button size="sm" className="h-7 gap-1" onClick={() => {
                          setAddNodePosition({ x: 300, y: 300 });
                          setShowAddNodeForm(true);
                        }}>
                          <Plus className="h-3.5 w-3.5" /> Add Entity
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="relative border-t bg-muted/30 overflow-hidden rounded-b-lg" style={{ height: 560 }}>
                      {/* Zoom Controls */}
                      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 bg-background/90 backdrop-blur-sm border rounded-lg p-1 shadow-md">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></Button>
                        <div className="border-t my-0.5" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFitAll} title="Fit all"><Maximize2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomReset} title="Reset"><RotateCcw className="h-3.5 w-3.5" /></Button>
                      </div>
                      {/* Zoom indicator */}
                      <div className="absolute bottom-3 left-3 z-20 bg-background/90 backdrop-blur-sm border rounded-md px-2 py-1 text-[10px] font-mono text-muted-foreground shadow-sm">
                        {Math.round(zoom * 100)}%
                      </div>
                      {/* SVG Canvas */}
                      <svg
                        ref={svgRef}
                        width="100%"
                        height="100%"
                        className={`select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onMouseDown={onCanvasMouseDown}
                        onMouseMove={onCanvasMouseMove}
                        onMouseUp={onCanvasMouseUp}
                        onMouseLeave={() => { setDraggingNode(null); setConnectingFrom(null); setIsPanning(false); }}
                        onClick={() => { if (!isPanning) { setSelectedEdge(null); setSelectedNode(null); setContextMenu(null); } }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const svg = svgRef.current;
                          if (!svg) return;
                          const rect = svg.getBoundingClientRect();
                          const svgX = (e.clientX - rect.left - pan.x) / zoom;
                          const svgY = (e.clientY - rect.top - pan.y) / zoom;
                          setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, svgX, svgY });
                        }}
                      >
                        {/* Grid pattern */}
                        <defs>
                          <pattern id="grid" width={24 * zoom} height={24 * zoom} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x}, ${pan.y})`}>
                            <circle cx={zoom} cy={zoom} r={0.8 * zoom} fill="hsl(var(--muted-foreground) / 0.15)" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

                        {/* Edges */}
                        {graphEdges.map(edge => {
                          const path = getEdgePath(edge);
                          const mid = getEdgeMidpoint(edge);
                          const isSelected = selectedEdge === edge.id;
                          return (
                            <g key={edge.id}>
                              {/* Wider hit area */}
                              <path
                                d={path}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={16}
                                className="cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(null); }}
                              />
                              <path
                                d={path}
                                fill="none"
                                stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.35)"}
                                strokeWidth={isSelected ? 2.5 : 1.5}
                                strokeDasharray={edge.type === "many-to-many" ? "6 3" : undefined}
                                className="transition-all duration-200 pointer-events-none"
                              />
                              {/* Arrowhead */}
                              <circle cx={graphNodes.find(n => n.id === edge.to)!.x} cy={graphNodes.find(n => n.id === edge.to)!.y + NODE_H / 2} r={4} fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"} className="pointer-events-none" />
                              {/* Label */}
                              <g onClick={(e) => { e.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(null); }} className="cursor-pointer">
                                <rect x={mid.x - 48} y={mid.y - 11} width={96} height={22} rx={6} fill="hsl(var(--background))" stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={1} />
                                <text x={mid.x} y={mid.y + 4} textAnchor="middle" className="text-[10px] fill-foreground font-medium pointer-events-none">{edge.label}</text>
                              </g>
                            </g>
                          );
                        })}

                        {/* Connection line while dragging */}
                        {connectingFrom && (() => {
                          const from = graphNodes.find(n => n.id === connectingFrom)!;
                          const x1 = from.x + NODE_W;
                          const y1 = from.y + NODE_H / 2;
                          return (
                            <line x1={x1} y1={y1} x2={connectMouse.x} y2={connectMouse.y} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 4" className="pointer-events-none" />
                          );
                        })()}

                        {/* Nodes */}
                        {graphNodes.map(node => {
                          const isActive = selectedNode === node.id;
                          const isConnectTarget = connectingFrom && connectingFrom !== node.id;
                          return (
                            <g key={node.id}
                              onMouseDown={(e) => onNodeMouseDown(e as any, node.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              {/* Shadow */}
                              <rect x={node.x + 2} y={node.y + 3} width={NODE_W} height={NODE_H} rx={12} fill="hsl(var(--foreground) / 0.06)" />
                              {/* Body */}
                              <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={12}
                                fill="hsl(var(--background))"
                                stroke={isActive ? "hsl(var(--primary))" : isConnectTarget ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"}
                                strokeWidth={isActive ? 2.5 : 1.5}
                                className="transition-all"
                              />
                              {/* Color accent bar */}
                              <rect x={node.x} y={node.y} width={6} height={NODE_H} rx={3} fill={node.color} />
                              {/* Icon */}
                              <text x={node.x + 20} y={node.y + NODE_H / 2 + 6} className="text-base pointer-events-none">{node.icon}</text>
                              {/* Label */}
                              <text x={node.x + 40} y={node.y + 24} className="text-[13px] fill-foreground font-semibold pointer-events-none">{node.label}</text>
                              <text x={node.x + 40} y={node.y + 40} className="text-[10px] fill-muted-foreground pointer-events-none">{node.fields.length} fields</text>
                              {/* Connect handle */}
                              <circle cx={node.x + NODE_W} cy={node.y + NODE_H / 2} r={6}
                                fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={1.5}
                                className="cursor-crosshair opacity-0 hover:opacity-100 transition-opacity"
                              />
                              {isConnectTarget && (
                                <circle cx={node.x} cy={node.y + NODE_H / 2} r={8}
                                  fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="3 2"
                                  className="pointer-events-none animate-pulse"
                                />
                              )}
                            </g>
                          );
                        })}
                        </g>
                      </svg>

                      {/* Minimap */}
                      {(() => {
                        const MINIMAP_W = 160;
                        const MINIMAP_H = 100;
                        const PAD = 20;
                        if (graphNodes.length === 0) return null;
                        const minX = Math.min(...graphNodes.map(n => n.x));
                        const minY = Math.min(...graphNodes.map(n => n.y));
                        const maxX = Math.max(...graphNodes.map(n => n.x + NODE_W));
                        const maxY = Math.max(...graphNodes.map(n => n.y + NODE_H));
                        const graphW = maxX - minX + PAD * 2;
                        const graphH = maxY - minY + PAD * 2;
                        const mmScale = Math.min(MINIMAP_W / graphW, MINIMAP_H / graphH);
                        const offsetX = (MINIMAP_W - graphW * mmScale) / 2;
                        const offsetY = (MINIMAP_H - graphH * mmScale) / 2;
                        const toMM = (x: number, y: number) => ({
                          x: (x - minX + PAD) * mmScale + offsetX,
                          y: (y - minY + PAD) * mmScale + offsetY,
                        });
                        // Viewport rect in graph coords
                        const svgEl = svgRef.current;
                        let vpRect = null;
                        if (svgEl) {
                          const r = svgEl.getBoundingClientRect();
                          const vx = (-pan.x) / zoom;
                          const vy = (-pan.y) / zoom;
                          const vw = r.width / zoom;
                          const vh = r.height / zoom;
                          const vp = toMM(vx, vy);
                          vpRect = { x: vp.x, y: vp.y, w: vw * mmScale, h: vh * mmScale };
                        }
                        return (
                          <div
                            className="absolute bottom-3 right-3 z-20 bg-background/90 backdrop-blur-sm border rounded-lg shadow-md overflow-hidden cursor-pointer"
                            style={{ width: MINIMAP_W, height: MINIMAP_H }}
                            onClick={(e) => {
                              if (!svgRef.current) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const mx = e.clientX - rect.left;
                              const my = e.clientY - rect.top;
                              // Convert minimap click to graph coords
                              const gx = (mx - offsetX) / mmScale + minX - PAD;
                              const gy = (my - offsetY) / mmScale + minY - PAD;
                              const svgRect = svgRef.current.getBoundingClientRect();
                              setPan({
                                x: -gx * zoom + svgRect.width / 2,
                                y: -gy * zoom + svgRect.height / 2,
                              });
                            }}
                          >
                            <svg width={MINIMAP_W} height={MINIMAP_H}>
                              {/* Edges */}
                              {graphEdges.map(edge => {
                                const fromNode = graphNodes.find(n => n.id === edge.from);
                                const toNode = graphNodes.find(n => n.id === edge.to);
                                if (!fromNode || !toNode) return null;
                                const f = toMM(fromNode.x + NODE_W, fromNode.y + NODE_H / 2);
                                const t = toMM(toNode.x, toNode.y + NODE_H / 2);
                                return <line key={edge.id} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="hsl(var(--muted-foreground) / 0.3)" strokeWidth={0.5} />;
                              })}
                              {/* Nodes */}
                              {graphNodes.map(node => {
                                const p = toMM(node.x, node.y);
                                return (
                                  <rect
                                    key={node.id}
                                    x={p.x}
                                    y={p.y}
                                    width={NODE_W * mmScale}
                                    height={NODE_H * mmScale}
                                    rx={2}
                                    fill={node.color}
                                    opacity={0.8}
                                  />
                                );
                              })}
                              {/* Viewport indicator */}
                              {vpRect && (
                                <rect
                                  x={vpRect.x}
                                  y={vpRect.y}
                                  width={vpRect.w}
                                  height={vpRect.h}
                                  fill="hsl(var(--primary) / 0.08)"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth={1}
                                  rx={1}
                                />
                              )}
                            </svg>
                          </div>
                        );
                      })()}

                      {/* Edge details panel */}
                      {selectedEdge && (() => {
                        const edge = graphEdges.find(e => e.id === selectedEdge);
                        if (!edge) return null;
                        return (
                          <div className="absolute top-4 right-4 w-64 bg-background border rounded-xl shadow-lg p-4 space-y-3 z-10">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Relation Details</h4>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedEdge(null)}><X className="h-3 w-3" /></Button>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Badge variant="outline">{edge.from}</Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="outline">{edge.to}</Badge>
                              </div>
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between"><span className="text-muted-foreground">Field</span><span className="font-medium">{edge.label}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="secondary" className="text-[10px] h-5">{edge.type}</Badge></div>
                              </div>
                            </div>
                            <Separator />
                            <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteEdge(edge.id)}>
                              <X className="mr-1 h-3 w-3" /> Remove Relation
                            </Button>
                          </div>
                        );
                      })()}

                      {/* Node details panel with inline field editing */}
                      {selectedNode && !draggingNode && (() => {
                        const node = graphNodes.find(n => n.id === selectedNode);
                        if (!node) return null;
                        const nodeEdges = graphEdges.filter(e => e.from === node.id || e.to === node.id);
                        return (
                          <div className="absolute bottom-4 right-4 w-72 bg-background border rounded-xl shadow-lg p-4 space-y-3 z-10 max-h-[420px] overflow-y-auto">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{node.icon}</span>
                                <h4 className="font-semibold text-sm">{node.label}</h4>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedNode(null)}><X className="h-3 w-3" /></Button>
                            </div>

                            {/* Editable Fields */}
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fields ({node.fields.length})</p>
                              <div className="space-y-1">
                                {node.fields.map((f, idx) => (
                                  <div key={idx} className="group flex items-center gap-1.5">
                                    <div className="flex-1 min-w-0">
                                      <Input
                                        value={f}
                                        className="h-7 text-xs px-2 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-colors"
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setGraphNodes(prev => prev.map(n =>
                                            n.id === node.id
                                              ? { ...n, fields: n.fields.map((field, i) => i === idx ? val : field) }
                                              : n
                                          ));
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        setGraphNodes(prev => prev.map(n =>
                                          n.id === node.id
                                            ? { ...n, fields: n.fields.filter((_, i) => i !== idx) }
                                            : n
                                        ));
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              {/* Add field inline */}
                              <form
                                className="flex items-center gap-1.5 pt-1"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const input = (e.target as HTMLFormElement).elements.namedItem('newField') as HTMLInputElement;
                                  const val = input.value.trim();
                                  if (!val) return;
                                  if (node.fields.includes(val)) return;
                                  setGraphNodes(prev => prev.map(n =>
                                    n.id === node.id ? { ...n, fields: [...n.fields, val] } : n
                                  ));
                                  input.value = '';
                                }}
                              >
                                <Input
                                  name="newField"
                                  placeholder="Add field…"
                                  className="h-7 text-xs px-2 flex-1"
                                />
                                <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </form>
                            </div>

                            {/* Relations */}
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Relations ({nodeEdges.length})</p>
                              {nodeEdges.map(e => (
                                <div key={e.id} className="flex items-center gap-1 text-xs">
                                  <span>{e.from === node.id ? "→" : "←"}</span>
                                  <span className="font-medium">{e.from === node.id ? e.to : e.from}</span>
                                  <span className="text-muted-foreground">({e.label})</span>
                                </div>
                              ))}
                            </div>
                            <Separator />
                            <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDeleteNode(node.id)}>
                              <Trash2 className="mr-1 h-3 w-3" /> Remove Entity
                            </Button>
                          </div>
                        );
                      })()}

                      {/* Right-click context menu */}
                      {contextMenu && !showAddNodeForm && (
                        <div
                          className="absolute z-30 bg-background border rounded-lg shadow-lg py-1 min-w-[160px]"
                          style={{ left: contextMenu.x, top: contextMenu.y }}
                        >
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                            onClick={() => {
                              setAddNodePosition({ x: contextMenu.svgX - NODE_W / 2, y: contextMenu.svgY - NODE_H / 2 });
                              setShowAddNodeForm(true);
                              setContextMenu(null);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Entity Here
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                            onClick={() => { handleFitAll(); setContextMenu(null); }}
                          >
                            <Maximize2 className="h-3.5 w-3.5" /> Fit All Nodes
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                            onClick={() => { handleZoomReset(); setContextMenu(null); }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset View
                          </button>
                        </div>
                      )}

                      {/* Add Node Form */}
                      {showAddNodeForm && (
                        <div className="absolute inset-0 z-30 bg-foreground/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowAddNodeForm(false)}>
                          <div className="bg-background border rounded-xl shadow-xl p-5 w-80 space-y-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Add New Entity</h4>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddNodeForm(false)}><X className="h-3 w-3" /></Button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Entity Name</label>
                                <Input
                                  placeholder="e.g. Invoice, Ticket, Partner..."
                                  value={newNodeLabel}
                                  onChange={e => setNewNodeLabel(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && handleAddNode()}
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Icon</label>
                                <div className="flex flex-wrap gap-1">
                                  {entityIcons.map(icon => (
                                    <button
                                      key={icon}
                                      className={`h-8 w-8 rounded-md text-base flex items-center justify-center border transition-colors ${newNodeIcon === icon ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
                                      onClick={() => setNewNodeIcon(icon)}
                                    >
                                      {icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                                <div className="flex gap-1.5">
                                  {entityColors.map(color => (
                                    <button
                                      key={color}
                                      className={`h-6 w-6 rounded-full border-2 transition-transform ${newNodeColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                                      style={{ backgroundColor: color }}
                                      onClick={() => setNewNodeColor(color)}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <Button className="w-full" onClick={handleAddNode} disabled={!newNodeLabel.trim()}>
                              <Plus className="mr-1 h-3.5 w-3.5" /> Create Entity
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Relation list below the graph */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">All Relations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {graphEdges.map(edge => (
                        <div key={edge.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedEdge === edge.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                          onClick={() => { setSelectedEdge(edge.id); setSelectedNode(null); }}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{edge.from}</Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline">{edge.to}</Badge>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-sm font-medium">{edge.label}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{edge.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              );
            })()}

            {/* UI Mapper View */}
            {activeView === "ui-mapper" && (() => {
              // Available data fields with their types
              const dataFields: { field: string; type: string }[] = [
                { field: "event.title", type: "text" },
                { field: "event.description", type: "text" },
                { field: "event.start_date", type: "date" },
                { field: "event.cover_image", type: "image" },
                { field: "event.speakers", type: "relation" },
                { field: "event.capacity", type: "number" },
                { field: "event.price", type: "number" },
                { field: "event.is_featured", type: "boolean" },
                { field: "event.agenda", type: "repeater" },
              ];

              const activeComp = uiComponents.find(c => c.id === selectedComponent)!;
              const mappedCount = activeComp.slots.filter(
                s => slotMappings[`${selectedComponent}::${s.id}`]
              ).length;

              return (
                <div className="space-y-6">
                  {/* Header bar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">UI Component Mapper</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Drag data fields from the left panel onto component slots
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MousePointerClick className="h-4 w-4" />
                      <span>Drag &amp; drop to bind fields</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ── Column 1: Data Fields ─────────────────────── */}
                    <div className="lg:col-span-3">
                      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                        <Database className="h-4 w-4" />
                        Data Fields
                      </h3>
                      <Card className="border-2">
                        <CardContent className="p-3 space-y-1.5">
                          <p className="text-xs text-muted-foreground pb-1 border-b mb-2">
                            event — {dataFields.length} fields
                          </p>
                          {dataFields.map(({ field, type }) => {
                            const FieldIcon = fieldTypeIcon[type] ?? Code2;
                            const colorCls = fieldTypeColor[type] ?? "bg-muted text-muted-foreground border-border";
                            const isBeingDragged = draggingField?.field === field;
                            return (
                              <div
                                key={field}
                                draggable
                                onDragStart={() => handleDragStart(field, type)}
                                onDragEnd={handleDragEnd}
                                className={`
                                  group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-grab
                                  select-none transition-all duration-150
                                  ${isBeingDragged
                                    ? "opacity-40 scale-95 border-primary"
                                    : "hover:border-primary/60 hover:shadow-sm hover:-translate-y-0.5"
                                  }
                                  ${colorCls}
                                `}
                              >
                                <GripVertical className="h-3.5 w-3.5 opacity-40 group-hover:opacity-70 shrink-0" />
                                <FieldIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-xs font-mono truncate flex-1">{field}</span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 font-normal">
                                  {type}
                                </Badge>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>

                      {/* Dragging hint */}
                      {draggingField && (
                        <div className="mt-3 p-3 rounded-lg border border-dashed border-primary bg-primary/5 text-center">
                          <Braces className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-xs text-primary font-medium">
                            Dragging: <span className="font-mono">{draggingField.field}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Drop on a slot →</p>
                        </div>
                      )}
                    </div>

                    {/* ── Column 2: Component Selector + Slots ────────── */}
                    <div className="lg:col-span-9 space-y-4">

                      {/* Component tabs */}
                      <div className="flex flex-wrap gap-2">
                        {uiComponents.map(comp => {
                          const CompIcon = comp.icon;
                          const mapped = comp.slots.filter(
                            s => slotMappings[`${comp.id}::${s.id}`]
                          ).length;
                          return (
                            <button
                              key={comp.id}
                              onClick={() => setSelectedComponent(comp.id)}
                              className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium
                                transition-all duration-150
                                ${selectedComponent === comp.id
                                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                                  : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted/50"
                                }
                              `}
                            >
                              <CompIcon className="h-4 w-4" />
                              {comp.name}
                              {mapped > 0 && (
                                <span className={`
                                  text-[10px] rounded-full px-1.5 py-0 font-bold leading-5
                                  ${selectedComponent === comp.id
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                                  }
                                `}>
                                  {mapped}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Slots grid */}
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <activeComp.icon className="h-5 w-5 text-primary" />
                              <CardTitle className="text-base">{activeComp.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {mappedCount} / {activeComp.slots.length} slots mapped
                              </span>
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${(mappedCount / activeComp.slots.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <CardDescription>
                            Drop data fields onto the slots below to create field bindings
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {activeComp.slots.map(slot => {
                              const key = `${selectedComponent}::${slot.id}`;
                              const mapped = slotMappings[key];
                              const isOver = dragOverSlot === key;
                              const justDropped = dropSuccess === key;
                              const FieldIcon = mapped ? (fieldTypeIcon[mapped.type] ?? Code2) : null;
                              const colorCls = mapped ? (fieldTypeColor[mapped.type] ?? "") : "";

                              return (
                                <div
                                  key={slot.id}
                                  onDragOver={e => handleDragOver(e, key)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={e => handleDrop(e, key)}
                                  className={`
                                    relative rounded-xl border-2 p-4 transition-all duration-150 min-h-[96px]
                                    ${justDropped
                                      ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                                      : isOver
                                        ? "border-primary bg-primary/8 scale-[1.02] shadow-lg shadow-primary/10"
                                        : mapped
                                          ? "border-primary/40 bg-primary/5"
                                          : "border-dashed border-border bg-muted/30 hover:border-primary/30"
                                    }
                                  `}
                                >
                                  {/* Slot label */}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {slot.label}
                                    </span>
                                    {mapped && !justDropped && (
                                      <button
                                        onClick={() => clearSlot(slot.id)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {justDropped && (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 animate-bounce" />
                                    )}
                                  </div>

                                  {/* Mapped field pill */}
                                  {mapped ? (
                                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${colorCls}`}>
                                      {FieldIcon && <FieldIcon className="h-3.5 w-3.5 shrink-0" />}
                                      <span className="truncate">{mapped.field}</span>
                                    </div>
                                  ) : isOver ? (
                                    <div className="flex items-center justify-center h-10 rounded-lg bg-primary/10 border border-primary border-dashed">
                                      <span className="text-xs text-primary font-medium">Release to map</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center h-10 gap-1">
                                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 rotate-90" />
                                      <span className="text-[11px] text-muted-foreground/60">{slot.description}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Live binding summary */}
                      {mappedCount > 0 && (
                        <Card className="border border-primary/20 bg-primary/5">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Braces className="h-4 w-4 text-primary" />
                              Active Bindings — {activeComp.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1.5">
                              {activeComp.slots
                                .filter(s => slotMappings[`${selectedComponent}::${s.id}`])
                                .map(s => {
                                  const m = slotMappings[`${selectedComponent}::${s.id}`]!;
                                  const FIcon = fieldTypeIcon[m.type] ?? Code2;
                                  const cls = fieldTypeColor[m.type] ?? "";
                                  return (
                                    <div key={s.id} className="flex items-center gap-2 text-xs font-mono">
                                      <span className="text-muted-foreground w-28 truncate">{s.label}</span>
                                      <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${cls}`}>
                                        <FIcon className="h-3 w-3" />
                                        {m.field}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Visibility Rules View */}
            {activeView === "visibility" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Dynamic Visibility Engine</CardTitle>
                        <CardDescription>Control component visibility with conditional logic</CardDescription>
                      </div>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Rule
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {visibilityRules.map((rule, idx) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">{rule.component}</span>
                                  <Badge variant={rule.status === "active" ? "default" : "secondary"}>
                                    {rule.status}
                                  </Badge>
                                </div>
                                <div className="bg-muted/50 p-3 rounded font-mono text-sm">
                                  IF {rule.condition}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="text-base">Rule Builder</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Component</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select component" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hero">Hero Section</SelectItem>
                              <SelectItem value="cta">CTA Button</SelectItem>
                              <SelectItem value="pricing">Pricing Card</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Condition</Label>
                          <div className="flex gap-2">
                            <Select>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user.plan">user.plan</SelectItem>
                                <SelectItem value="product.stock">product.stock</SelectItem>
                                <SelectItem value="event.seats">event.seats</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Operator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">=</SelectItem>
                                <SelectItem value="gt">&gt;</SelectItem>
                                <SelectItem value="lt">&lt;</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="Value" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Show/Hide</Label>
                          <Switch />
                        </div>
                        <Button className="w-full">Create Rule</Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Listings View */}
            {activeView === "listings" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Dynamic Listings & Grids</CardTitle>
                        <CardDescription>Create repeating content layouts</CardDescription>
                      </div>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Listing
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="templates" className="w-full">
                      <TabsList>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                        <TabsTrigger value="layouts">Layouts</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>

                      <TabsContent value="templates" className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {["Product Catalog", "Event Grid", "Speaker List", "Course Library", "Testimonials", "Resource Directory"].map((template, idx) => (
                            <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer">
                              <CardContent className="p-4">
                                <div className="bg-muted rounded mb-3 h-32 flex items-center justify-center">
                                  <Grid3x3 className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="font-semibold">{template}</h3>
                                <p className="text-sm text-muted-foreground">Repeater template</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="layouts" className="mt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="cursor-pointer hover:border-primary">
                            <CardContent className="p-6 text-center">
                              <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="font-medium">Grid Layout</p>
                            </CardContent>
                          </Card>
                          <Card className="cursor-pointer hover:border-primary">
                            <CardContent className="p-6 text-center">
                              <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                              <p className="font-medium">List Layout</p>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="preview" className="mt-4">
                        <Card>
                          <CardContent className="p-6">
                            <div className="grid grid-cols-3 gap-4">
                              {[1, 2, 3, 4, 5, 6].map((item) => (
                                <div key={item} className="border rounded-lg p-4">
                                  <div className="bg-muted h-32 rounded mb-3"></div>
                                  <div className="h-4 bg-muted rounded mb-2"></div>
                                  <div className="h-3 bg-muted/50 rounded w-2/3"></div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Queries View */}
            {activeView === "queries" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Query Builder</CardTitle>
                        <CardDescription>No-code data filtering and sorting</CardDescription>
                      </div>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        New Query
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-6">
                      {queries.map((query, idx) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <Search className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">{query.name}</span>
                                  <Badge>{query.results} results</Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    <Filter className="mr-1 h-3 w-3" />
                                    {query.filter}
                                  </Badge>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    <SortAsc className="mr-1 h-3 w-3" />
                                    {query.sort}
                                  </Badge>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Build Query</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Content Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select content type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="event">Events</SelectItem>
                              <SelectItem value="product">Products</SelectItem>
                              <SelectItem value="course">Courses</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label>Filters</Label>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="category">Category</SelectItem>
                                  <SelectItem value="featured">Featured</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select>
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">=</SelectItem>
                                  <SelectItem value="gt">&gt;</SelectItem>
                                  <SelectItem value="contains">contains</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input placeholder="Value" />
                            </div>
                            <Button variant="outline" size="sm">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Filter
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label>Sort By</Label>
                          <div className="flex gap-2">
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="title">Title</SelectItem>
                                <SelectItem value="popularity">Popularity</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Order" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="asc">ASC</SelectItem>
                                <SelectItem value="desc">DESC</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button className="w-full">
                          <Play className="mr-2 h-4 w-4" />
                          Run Query
                        </Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preview View */}
            {activeView === "preview" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Live Preview & Rendering</CardTitle>
                        <CardDescription>See how data renders across interfaces</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Desktop</Button>
                        <Button variant="outline" size="sm">Mobile</Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="portal" className="w-full">
                      <TabsList>
                        <TabsTrigger value="portal">Event Portal</TabsTrigger>
                        <TabsTrigger value="store">Product Store</TabsTrigger>
                        <TabsTrigger value="landing">Landing Page</TabsTrigger>
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                      </TabsList>

                      <TabsContent value="portal" className="mt-4">
                        <Card>
                          <CardContent className="p-6">
                            <div className="border-2 rounded-lg overflow-hidden">
                              {/* Preview Mockup */}
                              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-12 text-white">
                                <Badge className="mb-4">Upcoming Event</Badge>
                                <h1 className="text-4xl font-bold mb-4">SaaS Revenue Summit 2026</h1>
                                <p className="text-lg opacity-90 mb-6">Join industry leaders in San Francisco</p>
                                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                                  Register Now
                                </Button>
                              </div>
                              <div className="p-8 bg-background">
                                <h2 className="text-2xl font-bold mb-6">Featured Speakers</h2>
                                <div className="grid grid-cols-3 gap-4">
                                  {[1, 2, 3].map((i) => (
                                    <div key={i} className="border rounded-lg p-4">
                                      <div className="w-16 h-16 bg-muted rounded-full mb-3"></div>
                                      <div className="h-4 bg-muted rounded mb-2"></div>
                                      <div className="h-3 bg-muted/50 rounded w-3/4"></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="store" className="mt-4">
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                              <MonitorPlay className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Product store preview</p>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="landing" className="mt-4">
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                              <MonitorPlay className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Landing page preview</p>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      <TabsContent value="dashboard" className="mt-4">
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center text-muted-foreground">
                              <MonitorPlay className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Dashboard preview</p>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* AI Assistant Panel */}
      {showAIPanel && (
        <div className="w-96 border-l bg-card flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Assistant
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowAIPanel(false)}>
                ✕
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Get intelligent suggestions for content types, relations, and UI mappings
            </p>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-3">Suggestions</h3>
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Wand2 className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <Badge variant="secondary" className="mb-2 text-xs">
                              {suggestion.type}
                            </Badge>
                            <p className="text-sm">{suggestion.message}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-sm mb-3">Ask AI</h3>
                <div className="space-y-2">
                  <Input placeholder="How do I map persona data to event pages?" />
                  <Button className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Answer
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default ExperienceMapper;
