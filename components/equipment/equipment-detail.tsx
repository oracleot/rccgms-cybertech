"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle, ChevronRight, RotateCcw, Trash2, Wrench } from "lucide-react"

import { CheckoutModal } from "@/components/equipment/checkout-modal"
import { type CheckoutEntry, CheckoutHistory } from "@/components/equipment/checkout-history"
import { CompleteMaintenanceModal } from "@/components/equipment/complete-maintenance-modal"
import { DeleteEquipmentModal } from "@/components/equipment/delete-equipment-modal"
import { IssueReportModal } from "@/components/equipment/issue-report-modal"
import { MaintenanceHistory, type MaintenanceEntry } from "@/components/equipment/maintenance-history"
import { ReturnBorrowedModal } from "@/components/equipment/return-borrowed-modal"
import { ReturnModal } from "@/components/equipment/return-modal"
import { EquipmentStatusBadge } from "@/components/equipment/status-badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from "@/lib/constants"

interface EquipmentDetailProps {
  equipment: {
    id: string
    name: string
    status: EquipmentStatus
    category?: string | null
    location?: string | null
    serialNumber?: string | null
    model?: string | null
    manufacturer?: string | null
    purchaseDate?: string | null
    purchasePrice?: number | null
    warrantyExpires?: string | null
    isBorrowed?: boolean
  }
  checkouts: CheckoutEntry[]
  maintenance: MaintenanceEntry[]
}

export function EquipmentDetail({ equipment, checkouts, maintenance }: EquipmentDetailProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnBorrowedOpen, setReturnBorrowedOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [maintenanceCompleteOpen, setMaintenanceCompleteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const activeCheckout = useMemo(
    () => checkouts.find((c) => !c.returnedAt) || null,
    [checkouts]
  )

  // Show "Return item" button only for borrowed equipment that is available
  const canReturnBorrowed = equipment.isBorrowed && equipment.status === "available"
  // Only show return button when item is currently in use (checked out by a member)
  const canReturn = equipment.status === "in_use" && !!activeCheckout
  // Show complete maintenance button when item is in maintenance
  const canCompleteMaintenance = equipment.status === "maintenance"

  const handleRefresh = () => {
    window.location.reload()
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/equipment">Equipment</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>{equipment.name || "Details"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold leading-tight">{equipment.name}</h1>
            <EquipmentStatusBadge status={equipment.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {equipment.category && <span>{equipment.category}</span>}
            {equipment.location && <span>• {equipment.location}</span>}
            {equipment.serialNumber && <span>• Serial: {equipment.serialNumber}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIssueOpen(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Report issue
          </Button>
          {canReturnBorrowed && (
            <Button onClick={() => setReturnBorrowedOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return to owner
            </Button>
          )}
          {canReturn && activeCheckout && (
            <Button variant="secondary" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return item
            </Button>
          )}
          {canCompleteMaintenance && (
            <Button variant="default" onClick={() => setMaintenanceCompleteOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Maintenance complete
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Status" value={EQUIPMENT_STATUS_LABELS[equipment.status]} />
          <DetailRow label="Category" value={equipment.category} />
          <DetailRow label="Location" value={equipment.location} />
          <DetailRow label="Model" value={equipment.model} />
          <DetailRow label="Manufacturer" value={equipment.manufacturer} />
          <DetailRow label="Ownership" value={equipment.isBorrowed ? "Borrowed" : "Owned"} />
          <DetailRow label="Purchase date" value={equipment.purchaseDate} />
          <DetailRow
            label="Purchase price"
            value={equipment.purchasePrice ? formatCurrency(equipment.purchasePrice) : null}
          />
          <DetailRow label="Warranty expires" value={equipment.warrantyExpires} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <CheckoutHistory items={checkouts} />
        <MaintenanceHistory items={maintenance} />
      </div>

      <CheckoutModal
        equipmentId={equipment.id}
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        onSuccess={handleRefresh}
      />
      {activeCheckout && (
        <ReturnModal
          checkoutId={activeCheckout.id}
          open={returnOpen}
          onOpenChange={setReturnOpen}
          onSuccess={handleRefresh}
        />
      )}
      <ReturnBorrowedModal
        equipmentId={equipment.id}
        equipmentName={equipment.name}
        open={returnBorrowedOpen}
        onOpenChange={setReturnBorrowedOpen}
      />
      <IssueReportModal
        equipmentId={equipment.id}
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onSuccess={handleRefresh}
      />
      <CompleteMaintenanceModal
        equipmentId={equipment.id}
        open={maintenanceCompleteOpen}
        onOpenChange={setMaintenanceCompleteOpen}
        onSuccess={handleRefresh}
      />
      <DeleteEquipmentModal
        equipmentId={equipment.id}
        equipmentName={equipment.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string | null | undefined
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="space-y-1 rounded-lg border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  )
}
