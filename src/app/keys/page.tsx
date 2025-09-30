export default function KeysPage() {
  return (
    <div className="rounded-3xl border border-subtle bg-surface p-6 shadow-subtle">
      <h2 className="text-lg font-semibold text-primary">API key handling</h2>
      <p className="mt-3 text-sm text-secondary">
        This client never sends or stores your Firecrawl API key outside of your browser. The key lives in <code>localStorage</code> so that requests can include the <code>Authorization</code> header.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-secondary">
        <li>The key is optional—leave it blank if your instance uses IP allow lists.</li>
        <li>Keys are injected client-side into request headers. There is no backend.</li>
        <li>Use the settings page to clear the key instantly from local storage.</li>
        <li>Rotate the key periodically and revoke old keys if they leak.</li>
      </ul>
      <p className="mt-4 text-sm text-secondary">
        Requests include the header <code>Authorization: Bearer &lt;key&gt;</code> when configured, matching the Firecrawl v2 REST API requirements.
      </p>
    </div>
  );
}
