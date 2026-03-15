import { 
  BarChart3, 
  PackageSearch, 
  Warehouse, 
  ShoppingCart, 
  Truck, 
  Tags, 
  Users, 
  TrendingUp, 
  GitMerge, 
  BrainCircuit, 
  PieChart
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const InventoryOrders = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commerce Operations Center</h1>
        <p className="text-muted-foreground mt-2">
          Unified inventory, order, and fulfillment management across all channels.
        </p>
      </div>

      {/* Main Dashboard Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (All Channels)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$48,294.00</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory Health</CardTitle>
            <Warehouse className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Optimal levels across 3 locations</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <PackageSearch className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">SKUs require immediate restock</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="catalog" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/30 dark:data-[state=active]:text-purple-300">
            <PackageSearch className="h-4 w-4 mr-2" /> Catalog
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">
            <Warehouse className="h-4 w-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/30 dark:data-[state=active]:text-purple-300">
            <ShoppingCart className="h-4 w-4 mr-2" /> Orders
          </TabsTrigger>
          <TabsTrigger value="fulfillment" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">
            <Truck className="h-4 w-4 mr-2" /> Fulfillment
          </TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/30 dark:data-[state=active]:text-purple-300">
            <Tags className="h-4 w-4 mr-2" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="crm" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">
            <Users className="h-4 w-4 mr-2" /> CRM Sync
          </TabsTrigger>
          <TabsTrigger value="revpath" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/30 dark:data-[state=active]:text-purple-300">
            <TrendingUp className="h-4 w-4 mr-2" /> RevPath
          </TabsTrigger>
          <TabsTrigger value="omnichannel" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">
            <GitMerge className="h-4 w-4 mr-2" /> Channels
          </TabsTrigger>
          <TabsTrigger value="ai-supply" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 dark:data-[state=active]:bg-purple-900/30 dark:data-[state=active]:text-purple-300">
            <BrainCircuit className="h-4 w-4 mr-2" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 dark:data-[state=active]:bg-blue-900/30 dark:data-[state=active]:text-blue-300">
            <PieChart className="h-4 w-4 mr-2" /> Analytics
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 bg-card rounded-xl border shadow-sm p-6 min-h-[400px]">
          <TabsContent value="catalog" className="m-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Product Catalog Builder</h2>
            </div>
            <p className="text-muted-foreground mb-4">Manage products, variants, categories, bundles, and services.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               <Card className="bg-muted/50 border-dashed">
                 <CardContent className="flex flex-col items-center justify-center h-32 text-center p-6">
                    <p className="text-sm font-medium mb-1">Add Product</p>
                    <p className="text-xs text-muted-foreground">SKU, price, cost, barcode</p>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="inventory" className="m-0">
            <h2 className="text-xl font-semibold mb-4">Inventory Management</h2>
            <p className="text-muted-foreground mb-4">Track stock across warehouses, store locations, and manage transfers.</p>
            {/* Placeholder for inventory lists */}
            <div className="space-y-4 mt-6">
               <div className="h-12 bg-muted/30 rounded-md border flex items-center px-4"><span className="text-sm">Main Warehouse</span><Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge></div>
               <div className="h-12 bg-muted/30 rounded-md border flex items-center px-4"><span className="text-sm">Downtown Store</span><Badge className="ml-auto bg-orange-100 text-orange-800 hover:bg-orange-100">Low Stock</Badge></div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="m-0">
            <h2 className="text-xl font-semibold mb-4">Unified Order Management</h2>
            <p className="text-muted-foreground mb-4">Orders from POS, online store, B2B portal, and events.</p>
             <div className="space-y-4 mt-6">
               <div className="h-16 bg-muted/30 rounded-md border flex items-center justify-between px-4">
                  <div>
                    <p className="text-sm font-medium">ORD-2023-492</p>
                    <p className="text-xs text-muted-foreground">via Online Store • Sarah Jenkins</p>
                  </div>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Processing</Badge>
               </div>
               <div className="h-16 bg-muted/30 rounded-md border flex items-center justify-between px-4">
                  <div>
                    <p className="text-sm font-medium">ORD-2023-491</p>
                    <p className="text-xs text-muted-foreground">via POS Terminal • Walk-in</p>
                  </div>
                  <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Completed</Badge>
               </div>
            </div>
          </TabsContent>

          <TabsContent value="fulfillment" className="m-0">
            <h2 className="text-xl font-semibold mb-4">Fulfillment Engine</h2>
            <p className="text-muted-foreground">Workflows for picking, packing, shipping, and pickup.</p>
          </TabsContent>

          <TabsContent value="pricing" className="m-0">
            <h2 className="text-xl font-semibold mb-4">Pricing & Promotions</h2>
            <p className="text-muted-foreground">Manage discounts, bundle pricing, promo codes, and campaigns.</p>
          </TabsContent>

          <TabsContent value="crm" className="m-0">
            <h2 className="text-xl font-semibold mb-4">CRM Integration</h2>
            <p className="text-muted-foreground">Connect orders to CRM profiles to view lifetime value and purchase behavior.</p>
          </TabsContent>

          <TabsContent value="revpath" className="m-0">
            <h2 className="text-xl font-semibold mb-4">RevPath Integration</h2>
            <p className="text-muted-foreground">Visualize how orders contribute to your revenue flow.</p>
            <div className="mt-8 flex items-center justify-center gap-4 text-sm font-medium text-muted-foreground overflow-x-auto pb-4">
               <span>Lead</span> <TrendingUp className="h-4 w-4" /> 
               <span>Opportunity</span> <TrendingUp className="h-4 w-4" /> 
               <span className="text-foreground border-b-2 border-purple-500 pb-1">Order</span> <TrendingUp className="h-4 w-4" /> 
               <span>Revenue</span> <TrendingUp className="h-4 w-4" /> 
               <span>Repeat</span>
            </div>
          </TabsContent>

          <TabsContent value="omnichannel" className="m-0">
            <h2 className="text-xl font-semibold mb-4">Omnichannel Commerce</h2>
            <p className="text-muted-foreground">Synchronization across POS, ecommerce storefronts, and customer portals.</p>
          </TabsContent>

          <TabsContent value="ai-supply" className="m-0">
             <div className="flex items-center gap-3 mb-4">
              <BrainCircuit className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold">AI Supply Assistant</h2>
            </div>
            <p className="text-muted-foreground">Predict demand, get restocking recommendations, and detect unusual sales patterns.</p>
            <Card className="mt-6 border-purple-100 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-900/10 shadow-none">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-200">Insight: High demand predicted for "Enterprise Bundles" next week based on historical B2B trends.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="m-0">
            <h2 className="text-xl font-semibold mb-4">Commerce Analytics</h2>
            <p className="text-muted-foreground">Dashboards for sales performance, profit margins, and inventory turnover.</p>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
};

export default InventoryOrders;