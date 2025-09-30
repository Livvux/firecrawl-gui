export default function KeysPage() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">API key handling</h2>
      <p className="mt-3 text-sm text-slate-300">
        This client never sends or stores your Firecrawl API key outside of your
        browser. The key is persisted in <code>localStorage</code> only so that your
        requests can include the <code>Authorization</code> header.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
        <li>The key is optional—leave it blank if your instance uses IP allow lists.</li>
        <li>Keys are injected client-side into request headers. There is no backend.</li>
        <li>Use the settings page to clear the key instantly from local storage.</li>
        <li>Rotate the key periodically and revoke old keys if they leak.</li>
      </ul>
      <p className="mt-4 text-sm text-slate-400">
        Requests include the header <code>Authorization: Bearer &lt;key&gt;</code> when a key
        is configured, matching the Firecrawl v2 REST API requirements.
      </p>
    </div>
  );
}
