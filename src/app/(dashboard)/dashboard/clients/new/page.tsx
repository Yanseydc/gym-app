import Link from "next/link";

import { ClientForm } from "@/modules/clients/components/client-form";
import { createClient } from "@/modules/clients/services/create-client";

export default function NewClientPage() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <Link href="/dashboard/clients" style={{ color: "var(--muted)", fontWeight: 600 }}>
          Back to clients
        </Link>
      </div>

      <header>
        <h1 style={{ margin: "0 0 8px" }}>Create client</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          Register a new client in the gym system.
        </p>
      </header>

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <ClientForm action={createClient} submitLabel="Create client" />
      </section>
    </div>
  );
}
