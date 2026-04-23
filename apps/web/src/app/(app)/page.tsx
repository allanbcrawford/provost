export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="font-semibold text-2xl text-neutral-900">Welcome to Provost.</h1>
      <p className="mt-2 text-neutral-600">
        Start by exploring{" "}
        <a className="underline" href="/family">
          /family
        </a>
        .
      </p>
    </div>
  );
}
