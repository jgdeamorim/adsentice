import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function App() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            adsentice · Warp Design System
          </h1>
          <p className="text-lg text-muted-foreground">
            M2 — shadcn/ui initialized · 11 components ready · Tailwind CSS v4
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Button</CardTitle>
              <CardDescription>Clickable UI element</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="default">Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Delete</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card</CardTitle>
              <CardDescription>Container component</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form</CardTitle>
              <CardDescription>react-hook-form + zod</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Form, FormField, FormItem, FormLabel, FormControl, FormMessage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dialog</CardTitle>
              <CardDescription>Modal overlay</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sheet</CardTitle>
              <CardDescription>Slide-in panel</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dropdown Menu</CardTitle>
              <CardDescription>Popover menu</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select</CardTitle>
              <CardDescription>Dropdown select</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Select, SelectTrigger, SelectContent, SelectItem, SelectValue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Table</CardTitle>
              <CardDescription>Data table</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Table, TableHeader, TableBody, TableRow, TableHead, TableCell</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tabs</CardTitle>
              <CardDescription>Tabbed interface</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tabs, TabsList, TabsTrigger, TabsContent</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

export default App
