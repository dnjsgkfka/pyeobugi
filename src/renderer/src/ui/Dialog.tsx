import { Button } from './Button'

export function Dialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: {
  title: string
  /** \n 으로 줄바꿈 */
  body: string
  confirmLabel: string
  /** 있으면 Two(거부+허용), 없으면 One */
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim">
      <div
        role="dialog"
        aria-modal="true"
        className="flex flex-col gap-9 rounded-lg bg-white p-6 shadow-card"
      >
        <div className="flex w-102 flex-col gap-4">
          <h2 className="text-heading text-grey-900">{title}</h2>
          <p className="text-body whitespace-pre-line text-grey-700">{body}</p>
        </div>
        <div className="flex w-102 gap-2">
          {cancelLabel && (
            <Button variant="secondary" className="flex-1" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button className="flex-1" body={!cancelLabel} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
