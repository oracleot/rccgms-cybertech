"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import type { UserRole } from "@/lib/constants"

interface TestModeChange {
  id: string
  userId: string
  userName: string
  action: "role_change" | "department_change" | "delete"
  previousValue: string
  newValue: string
  timestamp: Date
}

interface TestModeContextType {
  isTestMode: boolean
  toggleTestMode: () => void
  testChanges: TestModeChange[]
  simulateRoleChange: (userId: string, userName: string, oldRole: UserRole, newRole: UserRole) => void
  simulateDepartmentChange: (userId: string, userName: string, oldDept: string, newDept: string) => void
  simulateUserDelete: (userId: string, userName: string) => void
  clearTestChanges: () => void
  isUserModifiedInTest: (userId: string) => boolean
  getUserTestState: (userId: string) => TestModeChange | undefined
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined)

export function TestModeProvider({ children }: { children: ReactNode }) {
  const [isTestMode, setIsTestMode] = useState(false)
  const [testChanges, setTestChanges] = useState<TestModeChange[]>([])

  const toggleTestMode = useCallback(() => {
    setIsTestMode((prev) => {
      if (prev) {
        // Exiting test mode - clear all changes
        setTestChanges([])
      }
      return !prev
    })
  }, [])

  const simulateRoleChange = useCallback(
    (userId: string, userName: string, oldRole: UserRole, newRole: UserRole) => {
      if (!isTestMode) return

      setTestChanges((prev) => {
        // Remove any existing changes for this user
        const filtered = prev.filter((change) => change.userId !== userId)
        
        return [
          ...filtered,
          {
            id: `${userId}-${Date.now()}`,
            userId,
            userName,
            action: "role_change",
            previousValue: oldRole,
            newValue: newRole,
            timestamp: new Date(),
          },
        ]
      })
    },
    [isTestMode]
  )

  const simulateDepartmentChange = useCallback(
    (userId: string, userName: string, oldDept: string, newDept: string) => {
      if (!isTestMode) return

      setTestChanges((prev) => {
        const filtered = prev.filter(
          (change) => !(change.userId === userId && change.action === "department_change")
        )
        
        return [
          ...filtered,
          {
            id: `${userId}-dept-${Date.now()}`,
            userId,
            userName,
            action: "department_change",
            previousValue: oldDept,
            newValue: newDept,
            timestamp: new Date(),
          },
        ]
      })
    },
    [isTestMode]
  )

  const simulateUserDelete = useCallback(
    (userId: string, userName: string) => {
      if (!isTestMode) return

      setTestChanges((prev) => {
        const filtered = prev.filter((change) => change.userId !== userId)
        
        return [
          ...filtered,
          {
            id: `${userId}-delete-${Date.now()}`,
            userId,
            userName,
            action: "delete",
            previousValue: "active",
            newValue: "deleted",
            timestamp: new Date(),
          },
        ]
      })
    },
    [isTestMode]
  )

  const clearTestChanges = useCallback(() => {
    setTestChanges([])
  }, [])

  const isUserModifiedInTest = useCallback(
    (userId: string) => {
      return testChanges.some((change) => change.userId === userId)
    },
    [testChanges]
  )

  const getUserTestState = useCallback(
    (userId: string) => {
      return testChanges.find((change) => change.userId === userId)
    },
    [testChanges]
  )

  return (
    <TestModeContext.Provider
      value={{
        isTestMode,
        toggleTestMode,
        testChanges,
        simulateRoleChange,
        simulateDepartmentChange,
        simulateUserDelete,
        clearTestChanges,
        isUserModifiedInTest,
        getUserTestState,
      }}
    >
      {children}
    </TestModeContext.Provider>
  )
}

export function useTestMode() {
  const context = useContext(TestModeContext)
  if (context === undefined) {
    throw new Error("useTestMode must be used within a TestModeProvider")
  }
  return context
}
