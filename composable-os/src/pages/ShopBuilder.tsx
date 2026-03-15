import { useState } from "react";
import {
  Package, ShoppingCart, Truck, Eye, Plus, Search, Filter, MoreHorizontal,
  Edit, Trash2, Copy, Image, Tag, ArrowUpRight, ArrowDownRight, DollarSign,
  Box, ChevronRight, Star, TrendingUp, LayoutGrid, List, ExternalLink,
  CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw, Layers,
  PanelTop, Grid3X3, Type, ImageIcon, CreditCard, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

// ── Mock Data ────────────────────────────────────────────────────
const products = [
  { id: "PRD-001", name: "Wireless Headphones Pro", price: 129.99, compareAt: 159.99, stock: 234, status: "active" as const, category: "Electronics", variants: 3, image: "🎧", rating: 4.8, sold: 1420 },
  { id: "PRD-002", name: "Organic Cotton T-Shirt", price: 34.99, compareAt: null, stock: 890, status: "active" as const, category: "Apparel", variants: 12, image: "👕", rating: 4.5, sold: 3200 },
  { id: "PRD-003", name: "Minimalist Desk Lamp", price: 79.99, compareAt: 99.99, stock: 56, status: "low_stock" as const, category: "Home", variants: 2, image: "💡", rating: 4.9, sold: 780 },
  { id: "PRD-004", name: "Premium Leather Wallet", price: 89.99, compareAt: null, stock: 0, status: "out_of_stock" as const, category: "Accessories", variants: 4, image: "👛", rating: 4.7, sold: 2100 },
  { id: "PRD-005", name: "Ceramic Coffee Mug Set", price: 44.99, compareAt: 54.99, stock: 412, status: "active" as const, category: "Home", variants: 6, image: "☕", rating: 4.6, sold: 950 },
  { id: "PRD-006", name: "Smart Fitness Tracker", price: 199.99, compareAt: 249.99, stock: 178, status: "active" as const, category: "Electronics", variants: 5, image: "⌚", rating: 4.4, sold: 1850 },
  { id: "PRD-007", name: "Handmade Soy Candle", price: 24.99, compareAt: null, stock: 15, status: "low_stock" as const, category: "Home", variants: 8, image: "🕯️", rating: 4.8, sold: 4200 },
  { id: "PRD-008", name: "Bamboo Sunglasses", price: 59.99, compareAt: 74.99, stock: 320, status: "draft" as const, category: "Accessories", variants: 3, image: "🕶️", rating: 0, sold: 0 },
];

const orders = [
  { id: "ORD-4821", customer: "Emma Wilson", email: "emma@example.com", items: 3, total: 234.97, status: "fulfilled" as const, date: "Mar 7, 2026", payment: "paid" },
  { id: "ORD-4820", customer: "James Chen", email: "james@example.com", items: 1, total: 129.99, status: "processing" as const, date: "Mar 7, 2026", payment: "paid" },
  { id: "ORD-4819", customer: "Sofia Martinez", email: "sofia@example.com", items: 5, total: 189.95, status: "shipped" as const, date: "Mar 6, 2026", payment: "paid" },
  { id: "ORD-4818", customer: "Liam O'Brien", email: "liam@example.com", items: 2, total: 164.98, status: "pending" as const, date: "Mar 6, 2026", payment: "pending" },
  { id: "ORD-4817", customer: "Aisha Patel", email: "aisha@example.com", items: 1, total: 79.99, status: "fulfilled" as const, date: "Mar 5, 2026", payment: "paid" },
  { id: "ORD-4816", customer: "Noah Kim", email: "noah@example.com", items: 4, total: 299.96, status: "cancelled" as const, date: "Mar 5, 2026", payment: "refunded" },
  { id: "ORD-4815", customer: "Olivia Brown", email: "olivia@example.com", items: 2, total: 94.98, status: "fulfilled" as const, date: "Mar 4, 2026", payment: "paid" },
];

const cartItems = [
  { product: "Wireless Headphones Pro", variant: "Black", qty: 1, price: 129.99 },
  { product: "Organic Cotton T-Shirt", variant: "Navy / L", qty: 2, price: 34.99 },
  { product: "Ceramic Coffee Mug Set", variant: "Earth Tones", qty: 1, price: 44.99 },
];

const storefrontBlocks = [
  { id: "sf-1", type: "hero-banner", label: "Hero Banner", icon: "🖼️", desc: "Full-width hero with CTA" },
  { id: "sf-2", type: "featured-products", label: "Featured Products", icon: "⭐", desc: "Showcase top products" },
  { id: "sf-3", type: "product-grid", label: "Product Grid", icon: "📦", desc: "Browsable product catalog" },
  { id: "sf-4", type: "categories", label: "Category Nav", icon: "🏷️", desc: "Shop by category" },
  { id: "sf-5", type: "testimonials", label: "Reviews", icon: "💬", desc: "Customer testimonials" },
  { id: "sf-6", type: "promo-banner", label: "Promo Banner", icon: "🎉", desc: "Sale / discount highlight" },
  { id: "sf-7", type: "newsletter", label: "Newsletter", icon: "📧", desc: "Email signup form" },
  { id: "sf-8", type: "footer", label: "Store Footer", icon: "📋", desc: "Links, policies, social" },
];

const storefrontPages = [
  { name: "Home", blocks: 6, status: "published" },
  { name: "Shop All", blocks: 4, status: "published" },
  { name: "Product Detail", blocks: 5, status: "published" },
  { name: "Cart", blocks: 3, status: "published" },
  { name: "About Us", blocks: 4, status: "draft" },
  { name: "Contact", blocks: 3, status: "draft" },
];

// ── Helpers ──────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const stockStatus = (s: string) => {
  switch (s) {
    case "active": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "low_stock": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "out_of_stock": return "bg-destructive/10 text-destructive";
    case "draft": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const orderStatus = (s: string) => {
  switch (s) {
    case "fulfilled": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "shipped": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "processing": return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "pending": return "bg-muted text-muted-foreground";
    case "cancelled": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

const statusLabel = (s: string) => s.replace("_", " ");

// ── Component ───────────────────────────────────────────────────
export default function ShopBuilder() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = orders.filter(o => o.payment === "paid").reduce((s, o) => s + o.total, 0);
  const totalProducts = products.length;
  const totalOrders = orders.length;
  const activeProducts = products.filter(p => p.status === "active").length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shop Builder</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage products, storefront, orders & checkout</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/portal-builder")}>
            <PanelTop className="h-4 w-4 mr-2" />Open Portal Builder
          </Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Product</Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{fmt(totalRevenue)}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+12.3%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Products</p>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalProducts}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeProducts} active · {products.filter(p => p.status === "draft").length} draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Orders</p>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalOrders}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">+8.1%</span>
              <span className="text-muted-foreground">this week</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversion</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">3.8%</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <ArrowDownRight className="h-3 w-3 text-destructive" />
              <span className="text-destructive font-medium">-0.4%</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="storefront">Storefront Editor</TabsTrigger>
          <TabsTrigger value="cart">Cart & Checkout</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        {/* ─── Products ────────────────────────────────────────── */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filter</Button>
            <div className="ml-auto flex items-center gap-1 border rounded-md p-0.5">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}><List className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <Card key={p.id} className="group hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-0">
                    <div className="h-40 bg-muted/50 flex items-center justify-center text-5xl rounded-t-lg">
                      {p.image}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm leading-tight">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.category} · {p.variants} variants</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{fmt(p.price)}</span>
                        {p.compareAt && <span className="text-xs text-muted-foreground line-through">{fmt(p.compareAt)}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={`text-[10px] ${stockStatus(p.status)}`}>{statusLabel(p.status)}</Badge>
                        {p.rating > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Add product card */}
              <Card className="border-dashed flex items-center justify-center min-h-[260px] cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="text-center">
                  <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Add Product</p>
                </div>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{p.image}</span>
                            <div>
                              <p className="font-medium text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.id} · {p.variants} variants</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.category}</TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{fmt(p.price)}</span>
                          {p.compareAt && <span className="text-xs text-muted-foreground ml-1 line-through">{fmt(p.compareAt)}</span>}
                        </TableCell>
                        <TableCell className="text-sm">{p.stock}</TableCell>
                        <TableCell><Badge className={`text-xs ${stockStatus(p.status)}`}>{statusLabel(p.status)}</Badge></TableCell>
                        <TableCell className="text-sm">{p.sold.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Storefront Editor ───────────────────────────────── */}
        <TabsContent value="storefront" className="space-y-4">
          {/* Portal Builder connection banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 px-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PanelTop className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Connected to Portal Builder</p>
                  <p className="text-xs text-muted-foreground">Storefront pages use Portal Builder's drag-and-drop engine for layout editing</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/portal-builder")}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />Open Editor
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Block palette */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Storefront Blocks</CardTitle>
                <CardDescription>Drag blocks to compose your store pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {storefrontBlocks.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-grab transition-colors">
                    <span className="text-xl">{b.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.label}</p>
                      <p className="text-xs text-muted-foreground">{b.desc}</p>
                    </div>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pages list */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Store Pages</CardTitle>
                    <CardDescription>Pages built with Portal Builder blocks</CardDescription>
                  </div>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Page</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {storefrontPages.map((pg) => (
                    <div key={pg.name} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{pg.name}</p>
                          <p className="text-xs text-muted-foreground">{pg.blocks} blocks</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-xs ${pg.status === "published" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{pg.status}</Badge>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate("/portal-builder")}>
                          <Edit className="h-3.5 w-3.5 mr-1" />Edit in Portal Builder
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Storefront preview mockup */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Live Preview</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-2" />Preview</Button>
                  <Button size="sm">Publish Storefront</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-8 text-center space-y-4 min-h-[300px] flex flex-col items-center justify-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <PanelTop className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Storefront Preview</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                    Your storefront is composed using Portal Builder blocks. Click "Edit in Portal Builder" on any page to visually customize it with drag-and-drop.
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate("/portal-builder")}>
                  <PanelTop className="h-4 w-4 mr-2" />Launch Portal Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Cart & Checkout ─────────────────────────────────── */}
        <TabsContent value="cart" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Shopping Cart</CardTitle>
                <CardDescription>Sample cart preview — {cartItems.length} items</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cartItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-2xl">
                      {products.find(p => p.name === item.product)?.image || "📦"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product}</p>
                      <p className="text-xs text-muted-foreground">{item.variant}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 border rounded-md">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-xs">−</Button>
                        <span className="w-6 text-center text-sm">{item.qty}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-xs">+</Button>
                      </div>
                      <span className="font-medium text-sm w-20 text-right">{fmt(item.price * item.qty)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(cartItems.reduce((s, i) => s + i.price * i.qty, 0))}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>Free</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{fmt(cartItems.reduce((s, i) => s + i.price * i.qty, 0) * 0.08)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{fmt(cartItems.reduce((s, i) => s + i.price * i.qty, 0) * 1.08)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Input placeholder="Discount code" className="flex-1" />
                  <Button variant="outline" size="sm">Apply</Button>
                </div>
                <Button className="w-full mt-2" size="lg">
                  <CreditCard className="h-4 w-4 mr-2" />Proceed to Checkout
                </Button>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1"><Truck className="h-3 w-3" />Free Shipping</span>
                  <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />30-day Returns</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checkout Configuration</CardTitle>
              <CardDescription>Settings for the checkout flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: CreditCard, title: "Payment Methods", desc: "Visa, MC, Apple Pay, PayPal" },
                  { icon: Truck, title: "Shipping Options", desc: "3 methods configured" },
                  { icon: MapPin, title: "Regions", desc: "US, EU, UK, CA enabled" },
                  { icon: Tag, title: "Discount Codes", desc: "5 active promotions" },
                ].map((cfg) => (
                  <div key={cfg.title} className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer">
                    <cfg.icon className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="font-medium text-sm">{cfg.title}</p>
                    <p className="text-xs text-muted-foreground">{cfg.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Orders ──────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search orders..." className="pl-9" />
            </div>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filter</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium text-sm">{o.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{o.customer}</p>
                          <p className="text-xs text-muted-foreground">{o.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{o.items}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(o.total)}</TableCell>
                      <TableCell><Badge className={`text-xs ${orderStatus(o.status)}`}>{o.status}</Badge></TableCell>
                      <TableCell><Badge className={`text-xs ${o.payment === "paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : o.payment === "refunded" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{o.payment}</Badge></TableCell>
                      <TableCell className="text-sm">{o.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
