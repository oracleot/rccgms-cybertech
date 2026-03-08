"use client"

import { useState } from "react"
import { Beaker, RotateCcw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { useTestMode } from "@/contexts/test-mode-context"
import { ROLE_LABELS } from "@/lib/constants"

export function TestModePanel() {
  const {
    isTestMode,
    toggleTestMode,
    testChanges,
    clearTestChanges,
  } = useTestMode()
  
  const [showChanges, setShowChanges] = useState(false)

  const handleToggle = () => {
    if (isTestMode && testChanges.length > 0) {
      // Show confirmation dialog
      setShowChanges(true)
    } else {
      toggleTestMode()
    }
  }

  const handleConfirmExit = () => {
    toggleTestMode()
    setShowChanges(false)
  }

  const formatActionLabel = (action: string) => {
    switch (action) {
      case "role_change":
        return "Role Change"
      case "department_change":
        return "Department Change"
      case "delete":
        return "User Deletion"
      default:
        return action
    }
  }

  const formatValue = (value: string, action: string) => {
    if (action === "role_change") {
      return ROLE_LABELS[value as keyof typeof ROLE_LABELS] || value
    }
    return value
  }

  return (
    <>
      <Card className={`border-2 ${isTestMode ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30" : "border-muted"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Beaker className={`h-5 w-5 ${isTestMode ? "text-orange-500" : "text-muted-foreground"}`} />
              <CardTitle className="text-sm font-medium">Test Mode</CardTitle>
            </div>
            <Switch
              checked={isTestMode}
              onCheckedChange={handleToggle}
              aria-label="Toggle test mode"
            />
          </div>
          <CardDescription className="text-xs">
            {isTestMode 
              ? "Simulate changes without affecting production data" 
              : "Enable to test user management actions"}
          </CardDescription>
        </CardHeader>
        {isTestMode && (
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-md bg-orange-100 dark:bg-orange-900/20 p-3 text-xs">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Test Mode Active
                </p>
                <p className="text-orange-700 dark:text-orange-300 mt-1">
                  All changes are simulated and will not be saved to the database. 
                  Perfect for testing workflows without affecting real data.
                </p>
              </div>
            </div>

            {testChanges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Simulated Changes ({testChanges.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTestChanges}
                    className="h-7 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                </div>
                
                <ScrollArea className="h-32 rounded-md border bg-white dark:bg-slate-950 p-2">
                  <div className="space-y-2">
                    {testChanges.map((change) => (
                      <div
                        key={change.id}
                        className="flex items-start justify-between gap-2 rounded p-2 bg-slate-50 dark:bg-slate-900 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {formatActionLabel(change.action)}
                            </Badge>
                            <span className="font-medium truncate">{change.userName}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {formatValue(change.previousValue, change.action)}
                            {change.action !== "delete" && (
                              <>
                                {" → "}
                                <span className="text-foreground font-medium">
                                  {formatValue(change.newValue, change.action)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {testChanges.length === 0 && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No simulated changes yet. Try editing user roles or departments.
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showChanges} onOpenChange={setShowChanges}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exit Test Mode?</DialogTitle>
            <DialogDescription>
              You have {testChanges.length} simulated change{testChanges.length !== 1 ? "s" : ""}.
              These changes are NOT saved to the database and will be discarded when you exit test mode.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="space-y-2">
                {testChanges.map((change) => (
                  <div
                    key={change.id}
                    className="rounded border p-2 bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <div className="font-medium">{change.userName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatActionLabel(change.action)}:{" "}
                      {formatValue(change.previousValue, change.action)}
                      {change.action !== "delete" && (
                        <>
                          {" → "}
                          {formatValue(change.newValue, change.action)}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChanges(false)}>
              Stay in Test Mode
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              Exit & Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
