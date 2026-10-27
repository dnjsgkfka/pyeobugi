export default function Placeholder({ title }: { title: string }): React.JSX.Element {
  return (
    <main className="p-10">
      <h1 className="text-title text-grey-900">{title}</h1>
    </main>
  )
}
