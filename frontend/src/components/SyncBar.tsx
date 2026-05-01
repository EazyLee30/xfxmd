/**
 * Middle divider between editor and preview — drag handle + sync hint.
 */

export type SyncBarProps = {
  onPointerDown?: (e: React.PointerEvent) => void
}

export function SyncBar({ onPointerDown }: SyncBarProps) {
  return (
    <div
      className="group relative flex w-2 shrink-0 cursor-col-resize flex-col items-center justify-center transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-900/20"
      onPointerDown={onPointerDown}
      title="拖拽调整宽度"
    >
      <div className="flex flex-col gap-1">
        <div className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-teal-400 dark:bg-slate-600 dark:group-hover:bg-teal-500" />
        <div className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-teal-400 dark:bg-slate-600 dark:group-hover:bg-teal-500" />
        <div className="h-1 w-1 rounded-full bg-slate-300 transition-colors group-hover:bg-teal-400 dark:bg-slate-600 dark:group-hover:bg-teal-500" />
      </div>
    </div>
  )
}
