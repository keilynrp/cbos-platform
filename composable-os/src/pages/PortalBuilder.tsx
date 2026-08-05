/* eslint-disable @typescript-eslint/no-explicit-any --
 * Las props de los bloques del constructor son dinamicas por diseño: cada tipo
 * de bloque define las suyas y se vuelcan directo a atributos de estilo y a
 * children de JSX. Tiparlas como unknown obliga a estrechar en 46 sitios de
 * uso, o a inventar una union que habria que ampliar con cada bloque nuevo.
 * Se deja any acotado a este archivo en lugar de refactorizar a ciegas una
 * pantalla que funciona; el dia que los bloques tengan un contrato explicito,
 * este disable sobra.
 */
import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portalService, CreateSessionDto } from "@/services/portal";
import { salesService } from "@/services/sales";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Send, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutGrid,
  Type,
  Image,
  Square,
  Columns,
  Minus,
  BarChart3,
  Table,
  FormInput,
  CreditCard,
  Navigation,
  PanelTop,
  PanelBottom,
  Columns3 as TabsIcon,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  Eye,
  Pencil,
  Smartphone,
  Monitor,
  Tablet,
  GripVertical,
  Plus,
  MousePointer,
  Heading,
  AlignLeft,
  CircleDot,
  ListOrdered,
  ChevronRight,
  X,
  ShoppingBag,
  ShoppingCart,
  ClipboardList,
  MessageSquare,
  Bot,
} from "lucide-react";

// --- Block Type Definitions ---

type BlockType =
  | "section" | "columns-2" | "columns-3" | "spacer" | "divider"
  | "heading" | "text" | "image" | "button" | "card" | "list"
  | "table" | "chart" | "kpi" | "form"
  | "navbar" | "sidebar-nav" | "footer" | "breadcrumb" | "tabs-nav"
  | "product-grid" | "cart-widget" | "checkout-form" | "chatbot-widget";

interface BlockDef {
  type: BlockType;
  label: string;
  icon: typeof Square;
  category: "layout" | "content" | "data" | "navigation" | "shop";
  defaultProps: Record<string, any>;
}

interface CanvasBlock {
  id: string;
  type: BlockType;
  props: Record<string, any>;
  children?: CanvasBlock[];
}

const blockDefs: BlockDef[] = [
  // Layout
  { type: "section", label: "Section", icon: Square, category: "layout", defaultProps: { padding: "32px", background: "transparent" } },
  { type: "columns-2", label: "2 Columns", icon: Columns, category: "layout", defaultProps: { gap: "16px" } },
  { type: "columns-3", label: "3 Columns", icon: LayoutGrid, category: "layout", defaultProps: { gap: "16px" } },
  { type: "spacer", label: "Spacer", icon: Minus, category: "layout", defaultProps: { height: "40px" } },
  { type: "divider", label: "Divider", icon: Minus, category: "layout", defaultProps: { color: "border" } },
  // Content
  { type: "heading", label: "Heading", icon: Heading, category: "content", defaultProps: { text: "Heading Text", level: "h2", align: "left" } },
  { type: "text", label: "Text Block", icon: AlignLeft, category: "content", defaultProps: { text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.", align: "left" } },
  { type: "image", label: "Image", icon: Image, category: "content", defaultProps: { src: "/placeholder.svg", alt: "Image", width: "100%", height: "200px" } },
  { type: "button", label: "Button", icon: CircleDot, category: "content", defaultProps: { text: "Click Me", variant: "primary", size: "md", align: "left" } },
  { type: "card", label: "Card", icon: CreditCard, category: "content", defaultProps: { title: "Card Title", description: "Card description goes here.", showImage: true } },
  { type: "list", label: "List", icon: ListOrdered, category: "content", defaultProps: { items: ["Item one", "Item two", "Item three"], style: "bullet" } },
  // Data
  { type: "table", label: "Data Table", icon: Table, category: "data", defaultProps: { columns: ["Name", "Status", "Value"], rows: 4 } },
  { type: "chart", label: "Chart", icon: BarChart3, category: "data", defaultProps: { chartType: "bar", title: "Revenue Overview" } },
  { type: "kpi", label: "KPI Card", icon: CreditCard, category: "data", defaultProps: { label: "Total Revenue", value: "$84,200", change: "+12.5%" } },
  { type: "form", label: "Form", icon: FormInput, category: "data", defaultProps: { fields: ["Name", "Email", "Message"], submitText: "Submit" } },
  // Navigation
  { type: "navbar", label: "Navbar", icon: PanelTop, category: "navigation", defaultProps: { brand: "My Portal", links: ["Home", "About", "Contact"] } },
  { type: "breadcrumb", label: "Breadcrumb", icon: ChevronRight, category: "navigation", defaultProps: { items: ["Home", "Dashboard", "Settings"] } },
  { type: "tabs-nav", label: "Tabs", icon: TabsIcon, category: "navigation", defaultProps: { tabs: ["Overview", "Details", "Settings"] } },
  { type: "footer", label: "Footer", icon: PanelBottom, category: "navigation", defaultProps: { text: "© 2026 Composable OS. All rights reserved.", links: ["Privacy", "Terms"] } },
  // Shop
  { type: "product-grid", label: "Product Grid", icon: ShoppingBag, category: "shop", defaultProps: { columns: 3, productsCount: 6, showPrice: true, showRating: true, showAddToCart: true } },
  { type: "cart-widget", label: "Cart Widget", icon: ShoppingCart, category: "shop", defaultProps: { style: "sidebar", showThumbnails: true, showQuantity: true, showSubtotal: true } },
  { type: "checkout-form", label: "Checkout Form", icon: ClipboardList, category: "shop", defaultProps: { steps: ["Shipping", "Payment", "Review"], showOrderSummary: true, submitText: "Place Order" } },
  { type: "chatbot-widget", label: "Chatbot Widget", icon: MessageSquare, category: "shop", defaultProps: { botName: "Support Bot", greeting: "Hi! 👋 How can I help you today?", position: "bottom-right", showAvatar: true, accentColor: "primary", placeholder: "Type a message..." } },
];

const categoryLabels: Record<string, string> = { layout: "Layout", content: "Content", data: "Data", navigation: "Navigation", shop: "Shop" };
const categoryIcons: Record<string, typeof LayoutGrid> = { layout: LayoutGrid, content: Type, data: BarChart3, navigation: Navigation, shop: ShoppingBag };

let idCounter = 0;
const genId = () => `block-${++idCounter}`;

// --- Block Renderers ---

function RenderBlock({ block, isSelected, onClick }: { block: CanvasBlock; isSelected: boolean; onClick: () => void }) {
  const cls = `relative group cursor-pointer transition-all rounded-lg border-2 ${
    isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/30"
  }`;

  switch (block.type) {
    case "section":
      return (
        <div className={cls} style={{ padding: block.props.padding, background: block.props.background }} onClick={onClick}>
          <div className="min-h-[60px] rounded-md border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
            Section Block
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "columns-2":
      return (
        <div className={cls} onClick={onClick}>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className="min-h-[80px] rounded-md border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">Column 1</div>
            <div className="min-h-[80px] rounded-md border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">Column 2</div>
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "columns-3":
      return (
        <div className={cls} onClick={onClick}>
          <div className="grid grid-cols-3 gap-4 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-h-[80px] rounded-md border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">Col {i}</div>
            ))}
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "spacer":
      return (
        <div className={`${cls} flex items-center justify-center`} style={{ height: block.props.height }} onClick={onClick}>
          <span className="text-[10px] text-muted-foreground/40">Spacer ({block.props.height})</span>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "divider":
      return (
        <div className={`${cls} py-2`} onClick={onClick}>
          <Separator />
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "heading":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          {block.props.level === "h1" && <h1 className="text-3xl font-bold" style={{ textAlign: block.props.align }}>{block.props.text}</h1>}
          {block.props.level === "h2" && <h2 className="text-2xl font-bold" style={{ textAlign: block.props.align }}>{block.props.text}</h2>}
          {block.props.level === "h3" && <h3 className="text-xl font-semibold" style={{ textAlign: block.props.align }}>{block.props.text}</h3>}
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "text":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <p className="text-sm text-muted-foreground leading-relaxed" style={{ textAlign: block.props.align }}>{block.props.text}</p>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "image":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <div className="rounded-lg overflow-hidden bg-muted flex items-center justify-center" style={{ width: block.props.width, height: block.props.height }}>
            <Image className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "button":
      return (
        <div className={`${cls} p-4`} style={{ textAlign: block.props.align }} onClick={onClick}>
          <button className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors ${
            block.props.variant === "primary" ? "bg-primary text-primary-foreground px-6 py-2.5" :
            block.props.variant === "outline" ? "border border-primary text-primary px-6 py-2.5" :
            "bg-secondary text-secondary-foreground px-6 py-2.5"
          } ${block.props.size === "lg" ? "text-base px-8 py-3" : block.props.size === "sm" ? "text-xs px-4 py-1.5" : "text-sm"}`}>
            {block.props.text}
          </button>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "card":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60">
            {block.props.showImage && (
              <div className="h-32 bg-muted rounded-t-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            <CardContent className="p-4">
              <p className="text-sm font-semibold">{block.props.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{block.props.description}</p>
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "list":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <ul className={block.props.style === "bullet" ? "list-disc pl-5 space-y-1" : "list-decimal pl-5 space-y-1"}>
            {block.props.items.map((item: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground">{item}</li>
            ))}
          </ul>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "table":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted/50">{block.props.columns.map((col: string) => <th key={col} className="p-2 text-left font-semibold">{col}</th>)}</tr></thead>
              <tbody>
                {Array.from({ length: block.props.rows }).map((_, ri) => (
                  <tr key={ri} className="border-t border-border/40">
                    {block.props.columns.map((col: string, ci: number) => <td key={ci} className="p-2 text-muted-foreground">Sample data</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "chart":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60">
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">{block.props.title}</p>
              <div className="flex items-end gap-2 h-24">
                {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
                  <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${h}%` }}>
                    <div className="w-full bg-primary rounded-t" style={{ height: `${h * 0.7}%` }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "kpi":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{block.props.label}</p>
              <p className="text-2xl font-bold mt-1">{block.props.value}</p>
              <p className="text-xs text-[hsl(var(--cbs-green))] font-medium mt-1">{block.props.change}</p>
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "form":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60">
            <CardContent className="p-4 space-y-3">
              {block.props.fields.map((f: string) => (
                <div key={f} className="space-y-1">
                  <Label className="text-xs">{f}</Label>
                  <Input className="h-8 text-sm" placeholder={`Enter ${f.toLowerCase()}...`} />
                </div>
              ))}
              <Button size="sm" className="w-full">{block.props.submitText}</Button>
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "navbar":
      return (
        <div className={`${cls}`} onClick={onClick}>
          <div className="flex items-center justify-between px-5 py-3 bg-card border-b border-border/60 rounded-lg">
            <span className="text-sm font-bold">{block.props.brand}</span>
            <div className="flex gap-4">
              {block.props.links.map((l: string) => <span key={l} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">{l}</span>)}
            </div>
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "breadcrumb":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {block.props.items.map((item: string, i: number) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === block.props.items.length - 1 ? "text-foreground font-medium" : ""}>{item}</span>
              </span>
            ))}
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "tabs-nav":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {block.props.tabs.map((tab: string, i: number) => (
              <span key={tab} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${i === 0 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{tab}</span>
            ))}
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "footer":
      return (
        <div className={cls} onClick={onClick}>
          <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-t border-border/60 rounded-lg">
            <span className="text-[11px] text-muted-foreground">{block.props.text}</span>
            <div className="flex gap-3">
              {block.props.links.map((l: string) => <span key={l} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">{l}</span>)}
            </div>
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "product-grid": {
      const cols = block.props.columns || 3;
      const mockProducts = Array.from({ length: block.props.productsCount || 6 }, (_, i) => ({
        name: `Product ${i + 1}`,
        price: `$${(19.99 + i * 10).toFixed(2)}`,
        rating: (4 + Math.random()).toFixed(1),
      }));
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Product Grid</span>
            <Badge variant="outline" className="text-[9px]">Shop</Badge>
          </div>
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {mockProducts.map((p, i) => (
              <Card key={i} className="border border-border/60 overflow-hidden">
                <div className="h-20 bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <CardContent className="p-2.5 space-y-1">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  {block.props.showPrice && <p className="text-xs font-bold text-primary">{p.price}</p>}
                  {block.props.showRating && <p className="text-[10px] text-muted-foreground">★ {p.rating}</p>}
                  {block.props.showAddToCart && (
                    <button className="w-full mt-1 text-[10px] bg-primary text-primary-foreground rounded py-1 font-medium">Add to Cart</button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    }
    case "cart-widget":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Shopping Cart</span>
                <Badge variant="outline" className="text-[9px]">Shop</Badge>
                <span className="ml-auto text-xs text-muted-foreground">3 items</span>
              </div>
              <Separator />
              {["Wireless Headphones", "USB-C Hub", "Phone Case"].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {block.props.showThumbnails && (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item}</p>
                    <p className="text-[10px] text-muted-foreground">${(19.99 + i * 15).toFixed(2)}</p>
                  </div>
                  {block.props.showQuantity && (
                    <div className="flex items-center gap-1 text-[10px] border border-border rounded px-1.5 py-0.5">
                      <span>−</span><span className="px-1 font-medium">{i + 1}</span><span>+</span>
                    </div>
                  )}
                </div>
              ))}
              {block.props.showSubtotal && (
                <>
                  <Separator />
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Subtotal</span><span>$84.96</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "checkout-form":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Checkout</span>
                <Badge variant="outline" className="text-[9px]">Shop</Badge>
              </div>
              {/* Step indicators */}
              <div className="flex gap-1">
                {(block.props.steps || []).map((step: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 flex-1">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                    {i < (block.props.steps || []).length - 1 && <div className="flex-1 h-px bg-border ml-1" />}
                  </div>
                ))}
              </div>
              <Separator />
              {/* Shipping fields */}
              <div className="grid grid-cols-2 gap-2">
                {["Full Name", "Address", "City", "Zip Code"].map(f => (
                  <div key={f} className="space-y-1">
                    <Label className="text-[10px]">{f}</Label>
                    <Input className="h-7 text-xs" placeholder={f} />
                  </div>
                ))}
              </div>
              {block.props.showOrderSummary && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold">Order Summary</p>
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>Items (3)</span><span>$84.96</span></div>
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>Shipping</span><span>$5.99</span></div>
                  <div className="flex justify-between text-[10px] text-muted-foreground"><span>Tax</span><span>$7.65</span></div>
                  <Separator />
                  <div className="flex justify-between text-xs font-bold"><span>Total</span><span>$98.60</span></div>
                </div>
              )}
              <Button size="sm" className="w-full">{block.props.submitText || "Place Order"}</Button>
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    case "chatbot-widget":
      return (
        <div className={`${cls} p-4`} onClick={onClick}>
          <Card className="border border-border/60 max-w-[320px] ml-auto">
            <CardContent className="p-0 overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-primary text-primary-foreground rounded-t-lg">
                {block.props.showAvatar && (
                  <div className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold">{block.props.botName}</p>
                  <p className="text-[9px] opacity-80">Online · Typically replies instantly</p>
                </div>
                <X className="h-3.5 w-3.5 opacity-60 cursor-pointer" />
              </div>
              {/* Chat Body */}
              <div className="p-3 space-y-2.5 bg-card min-h-[140px]">
                {/* Bot message */}
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <div className="bg-muted/60 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                    <p className="text-[10px] leading-relaxed">{block.props.greeting}</p>
                  </div>
                </div>
                {/* Quick replies */}
                <div className="flex flex-wrap gap-1 pl-7">
                  {["Product info", "Pricing", "Support"].map(q => (
                    <span key={q} className="text-[9px] px-2 py-1 rounded-full border border-primary/30 text-primary cursor-pointer hover:bg-primary/5">{q}</span>
                  ))}
                </div>
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                    <p className="text-[10px]">I'd like to know about pricing</p>
                  </div>
                </div>
                {/* Bot reply */}
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-2.5 w-2.5 text-primary" />
                  </div>
                  <div className="bg-muted/60 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                    <p className="text-[10px] leading-relaxed">Great question! We have 3 plans starting at <strong>$29/mo</strong>. Want me to help you find the best fit?</p>
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="flex items-center gap-2 px-3 py-2 border-t border-border/60">
                <input className="flex-1 text-[10px] bg-transparent outline-none placeholder:text-muted-foreground/50" placeholder={block.props.placeholder} />
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center cursor-pointer">
                  <MessageSquare className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          <BlockOverlay block={block} isSelected={isSelected} />
        </div>
      );
    default:
      return <div className={cls} onClick={onClick}><p className="text-xs text-muted-foreground p-4">Unknown block</p></div>;
  }
}

function BlockOverlay({ block, isSelected }: { block: CanvasBlock; isSelected: boolean }) {
  const def = blockDefs.find(d => d.type === block.type);
  return (
    <div className={`absolute top-0 right-0 flex items-center gap-0.5 p-1 rounded-bl-lg rounded-tr-lg transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} bg-primary text-primary-foreground`}>
      <span className="text-[9px] font-medium px-1.5">{def?.label}</span>
    </div>
  );
}

// --- Property Editor ---

function PropertyEditor({ block, onChange }: { block: CanvasBlock; onChange: (props: Record<string, any>) => void }) {
  const def = blockDefs.find(d => d.type === block.type);
  if (!def) return null;

  const update = (key: string, value: any) => onChange({ ...block.props, [key]: value });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <def.icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{def.label}</span>
      </div>
      <Separator />
      {Object.entries(block.props).map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1.5">
              <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
              {value.map((item: string, i: number) => (
                <div key={i} className="flex gap-1">
                  <Input
                    className="h-7 text-xs"
                    value={item}
                    onChange={e => {
                      const arr = [...value];
                      arr[i] = e.target.value;
                      update(key, arr);
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => update(key, value.filter((_: any, j: number) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="h-6 text-[10px] w-full" onClick={() => update(key, [...value, "New item"])}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          );
        }
        if (typeof value === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
              <Button variant={value ? "default" : "outline"} size="sm" className="h-6 text-[10px]" onClick={() => update(key, !value)}>
                {value ? "On" : "Off"}
              </Button>
            </div>
          );
        }
        if (typeof value === "number") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
              <Input type="number" className="h-7 text-xs" value={value} onChange={e => update(key, parseInt(e.target.value) || 0)} />
            </div>
          );
        }
        if (key === "variant") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Variant</Label>
              <Select value={value as string} onValueChange={v => update(key, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["primary", "outline", "secondary"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (key === "level") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={value as string} onValueChange={v => update(key, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["h1", "h2", "h3"].map(v => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (key === "align") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Align</Label>
              <Select value={value as string} onValueChange={v => update(key, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["left", "center", "right"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (key === "size") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Size</Label>
              <Select value={value as string} onValueChange={v => update(key, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["sm", "md", "lg"].map(v => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (key === "chartType") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Chart Type</Label>
              <Select value={value as string} onValueChange={v => update(key, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["bar", "line", "area"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (key === "style") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Style</Label>
              <Select value={value as string} onValueChange={v => update(key, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["bullet", "numbered"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        // Default: text input
        return (
          <div key={key} className="space-y-1">
            <Label className="text-xs capitalize">{key.replace(/([A-Z])/g, " $1")}</Label>
            <Input className="h-7 text-xs" value={value as string} onChange={e => update(key, e.target.value)} />
          </div>
        );
      })}
    </div>
  );
}

// --- Main Page ---

const PortalBuilder = () => {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([
    { id: genId(), type: "navbar", props: { brand: "Client Portal", links: ["Dashboard", "Documents", "Support"] } },
    { id: genId(), type: "heading", props: { text: "Welcome to Your Portal", level: "h1", align: "left" } },
    { id: genId(), type: "columns-3", props: { gap: "16px" } },
    { id: genId(), type: "kpi", props: { label: "Active Projects", value: "12", change: "+3 this month" } },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [paletteCategory, setPaletteCategory] = useState<string>("all");
  const [draggedType, setDraggedType] = useState<BlockType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedBlock = blocks.find(b => b.id === selectedId);

  const addBlock = useCallback((type: BlockType, index?: number) => {
    const def = blockDefs.find(d => d.type === type);
    if (!def) return;
    const newBlock: CanvasBlock = { id: genId(), type, props: { ...def.defaultProps } };
    setBlocks(prev => {
      const i = index !== undefined ? index : prev.length;
      const next = [...prev];
      next.splice(i, 0, newBlock);
      return next;
    });
    setSelectedId(newBlock.id);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const dup: CanvasBlock = { ...prev[idx], id: genId(), props: { ...prev[idx].props } };
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const updateBlockProps = useCallback((id: string, props: Record<string, any>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, props } : b));
  }, []);

  const filteredDefs = paletteCategory === "all" ? blockDefs : blockDefs.filter(d => d.category === paletteCategory);
  const viewportWidth = viewport === "desktop" ? "100%" : viewport === "tablet" ? "768px" : "375px";

  // Drag handlers
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedType) {
      addBlock(draggedType, index);
      setDraggedType(null);
    }
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portal Builder</h1>
        <p className="text-muted-foreground text-sm mt-1">Diseña portales de cliente y gestiona accesos por cotización.</p>
      </div>

      <Tabs defaultValue="sessions">
      <TabsList className="mb-2">
        <TabsTrigger value="sessions">Sesiones activas</TabsTrigger>
        <TabsTrigger value="builder">Page Builder</TabsTrigger>
      </TabsList>

      {/* ── Sessions tab ───────────────────────────────────────── */}
      <TabsContent value="sessions" className="m-0">
        <PortalSessions />
      </TabsContent>

      {/* ── Builder tab ────────────────────────────────────────── */}
      <TabsContent value="builder" className="m-0">
      <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Arrastra bloques para construir la página del portal cliente.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Viewport toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 gap-0.5">
            {[
              { v: "desktop" as const, icon: Monitor },
              { v: "tablet" as const, icon: Tablet },
              { v: "mobile" as const, icon: Smartphone },
            ].map(({ v, icon: Icon }) => (
              <Button key={v} variant={viewport === v ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewport(v)}>
                <Icon className="h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
          {/* Mode toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 gap-0.5">
            <Button variant={mode === "edit" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setMode("edit")}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
            <Button variant={mode === "preview" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setMode("preview")}>
              <Eye className="h-3 w-3" /> Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Builder Layout */}
      <div className="flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
        {/* Left Panel — Block Palette */}
        {mode === "edit" && (
          <div className="w-56 shrink-0 overflow-y-auto space-y-3">
            <div className="flex flex-wrap gap-1">
              <Button variant={paletteCategory === "all" ? "default" : "outline"} size="sm" className="h-6 text-[10px]" onClick={() => setPaletteCategory("all")}>All</Button>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <Button key={key} variant={paletteCategory === key ? "default" : "outline"} size="sm" className="h-6 text-[10px]" onClick={() => setPaletteCategory(key)}>{label}</Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredDefs.map(def => (
                <div
                  key={def.type}
                  draggable
                  onDragStart={() => setDraggedType(def.type)}
                  onDragEnd={() => setDraggedType(null)}
                  onClick={() => addBlock(def.type)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all text-center"
                >
                  <def.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] font-medium leading-tight">{def.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center — Canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/30 rounded-xl border border-border/60 p-4 flex justify-center">
          <div className="w-full transition-all" style={{ maxWidth: viewportWidth }}>
            {blocks.length === 0 ? (
              <div
                className="min-h-[300px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2"
                onDragOver={e => handleDragOver(e, 0)}
                onDrop={e => handleDrop(e, 0)}
              >
                <MousePointer className="h-8 w-8 opacity-30" />
                <p className="text-sm">Drag blocks here or click from the palette</p>
              </div>
            ) : (
              <div className="space-y-0">
                {blocks.map((block, i) => (
                  <div key={block.id}>
                    {/* Drop zone */}
                    <div
                      className={`h-1 rounded transition-all ${dragOverIndex === i ? "h-8 bg-primary/10 border-2 border-dashed border-primary/40" : ""}`}
                      onDragOver={e => handleDragOver(e, i)}
                      onDrop={e => handleDrop(e, i)}
                    />
                    <div className="relative">
                      <RenderBlock
                        block={block}
                        isSelected={mode === "edit" && selectedId === block.id}
                        onClick={() => mode === "edit" && setSelectedId(block.id)}
                      />
                      {/* Block toolbar */}
                      {mode === "edit" && selectedId === block.id && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-md p-0.5 z-10">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBlock(block.id, -1)}><MoveUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBlock(block.id, 1)}><MoveDown className="h-3 w-3" /></Button>
                          <Separator orientation="vertical" className="h-4" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateBlock(block.id)}><Copy className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeBlock(block.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Final drop zone */}
                <div
                  className={`h-1 rounded transition-all ${dragOverIndex === blocks.length ? "h-8 bg-primary/10 border-2 border-dashed border-primary/40" : ""}`}
                  onDragOver={e => handleDragOver(e, blocks.length)}
                  onDrop={e => handleDrop(e, blocks.length)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Properties */}
        {mode === "edit" && (
          <div className="w-60 shrink-0 overflow-y-auto">
            {selectedBlock ? (
              <Card className="border border-border/60">
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-semibold">Properties</CardTitle>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <PropertyEditor block={selectedBlock} onChange={props => updateBlockProps(selectedBlock.id, props)} />
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <MousePointer className="h-6 w-6 opacity-30 mb-2" />
                <p className="text-xs">Select a block to edit</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
      </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Portal Sessions component ─────────────────────────────────────────────────

function PortalSessions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateSessionDto>({ quote_id: "", client_name: "", client_email: "", expire_hours: 72 });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["portal-sessions"],
    queryFn: () => portalService.getSessions(),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ["sales-quotes"],
    queryFn: () => salesService.getQuotes(),
  });

  const createMutation = useMutation({
    mutationFn: portalService.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-sessions"] });
      setOpen(false);
      setForm({ quote_id: "", client_name: "", client_email: "", expire_hours: 72 });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: portalService.sendEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal-sessions"] }),
  });

  const statusIcon = (action: string | null, completed_at: string | null) => {
    if (action === "accepted") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (action === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    if (completed_at) return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const statusLabel = (action: string | null, accessed_at: string | null) => {
    if (action === "accepted") return <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Aceptado</Badge>;
    if (action === "rejected") return <Badge className="bg-red-100 text-red-800 text-[10px]">Rechazado</Badge>;
    if (accessed_at) return <Badge className="bg-blue-100 text-blue-800 text-[10px]">Visto</Badge>;
    return <Badge variant="outline" className="text-[10px]">Pendiente</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sessions.length} sesiones de portal</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Link2 className="h-4 w-4" /> Crear enlace de portal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear sesión de portal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Cotización *</Label>
                <Select value={form.quote_id} onValueChange={(v) => setForm(f => ({ ...f, quote_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una cotización" /></SelectTrigger>
                  <SelectContent>
                    {quotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.quote_number} — {q.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre del cliente</Label>
                <Input placeholder="Ej: Juan Pérez" value={form.client_name ?? ""} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email del cliente</Label>
                <Input type="email" placeholder="cliente@empresa.com" value={form.client_email ?? ""} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expira en (horas)</Label>
                <Input type="number" min={1} value={form.expire_hours} onChange={e => setForm(f => ({ ...f, expire_hours: Number(e.target.value) }))} />
              </div>
              <Button className="w-full" disabled={!form.quote_id || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}>
                {createMutation.isPending ? "Creando..." : "Crear enlace"}
              </Button>
              {createMutation.isError && (
                <p className="text-xs text-destructive">{String(createMutation.error)}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl">
          <Link2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin sesiones de portal aún.</p>
          <p className="text-xs mt-1">Crea un enlace para que tu cliente vea y acepte su cotización.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">{statusIcon(s.action, s.completed_at)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{s.client_name ?? "Cliente sin nombre"}</span>
                      {statusLabel(s.action, s.accessed_at)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {s.client_email ?? "sin email"} · expira {new Date(s.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => navigator.clipboard.writeText(s.portal_url)}>
                      <Link2 className="h-3 w-3" /> Copiar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                      asChild>
                      <a href={s.portal_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" /> Ver
                      </a>
                    </Button>
                    {s.client_email && !s.action && (
                      <Button size="sm" className="h-7 text-xs gap-1"
                        disabled={sendEmailMutation.isPending}
                        onClick={() => sendEmailMutation.mutate(s.id)}>
                        <Send className="h-3 w-3" /> Email
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default PortalBuilder;
