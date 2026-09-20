export const SUBSYSTEMS = {
  WORSHIP: "worship",
  BIBLE: "bible",
  STORAGE: "storage",
  AUTH: "auth",
  API: "api",
  SYSTEM: "system",
  ROTA: "rota",
  RUNDOWN: "rundown",
  DESIGNS: "designs",
  NOTIFICATIONS: "notifications",
  MEETINGS: "meetings",
  TRAINING: "training",
  LIVESTREAM: "livestream",
} as const

export type Subsystem = (typeof SUBSYSTEMS)[keyof typeof SUBSYSTEMS]

export const SUBSYSTEM_LABELS: Record<string, string> = {
  worship: "Worship",
  bible: "Bible",
  storage: "Storage",
  auth: "Auth",
  api: "API",
  system: "System",
  rota: "Rota",
  rundown: "Rundown",
  designs: "Designs",
  notifications: "Notifications",
  meetings: "Meetings",
  training: "Training",
  livestream: "Livestream",
}

export const SUBSYSTEM_COLORS: Record<string, string> = {
  worship: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  bible: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  storage: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  auth: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  api: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  system: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  rota: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  rundown: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  designs: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  notifications: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  meetings: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  training: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  livestream: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
}

export const SEVERITY_COLORS: Record<string, string> = {
  debug: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  warn: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
}

export const STATUS_COLORS: Record<string, string> = {
  ok: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warn: "text-yellow-600 dark:text-yellow-400",
}
