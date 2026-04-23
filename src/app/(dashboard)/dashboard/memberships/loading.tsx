import { getText } from "@/lib/i18n";

export default async function MembershipsLoading() {
  const t = await getText("memberships");
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 24,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      {`${t.title}...`}
    </div>
  );
}
