import { Spinner } from '@renderer/ui/Spinner'

export default function Loading(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner />
    </div>
  )
}
