/**
 * Maps a known, expected Postgres/RPC error message to a safe, user-facing
 * Spanish message. Returns null when the message isn't recognized, so each
 * call site decides its own fallback:
 *   - assign-membership.ts (existing, unchanged behavior) falls back to the
 *     raw message, same as before this module existed.
 *   - registerMembershipPayment (membership-operations.ts) must never leak
 *     a raw Postgres message, so it falls back to a generic safe string
 *     instead.
 *
 * Pure and dependency-free (no Supabase) so the mapping itself is
 * unit-testable without a live database.
 */

const KNOWN_MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  "This client already has a membership occupying that period.":
    "Este cliente ya tiene una membresía que ocupa ese período. Elige otra fecha de inicio o revisa la membresía actual.",
  "Payment amount exceeds the plan price.":
    "El monto del pago supera el precio del plan. Verifica el monto ingresado.",
  "Selected membership plan is not available.":
    "El plan de membresía seleccionado no está disponible.",
  "Client not found or not accessible.":
    "El cliente no fue encontrado o no está disponible.",
  "Client and membership plan belong to different gyms.":
    "El cliente y el plan de membresía pertenecen a gimnasios distintos.",
  "Selected membership is not available.":
    "La membresía seleccionada no está disponible.",
  "Selected membership does not belong to the selected client.":
    "La membresía seleccionada no pertenece al cliente seleccionado.",
};

export function mapKnownMembershipError(message: string): string | null {
  if (message in KNOWN_MEMBERSHIP_ERROR_MESSAGES) {
    return KNOWN_MEMBERSHIP_ERROR_MESSAGES[message];
  }

  if (message.includes("idempotency_key reused with different membership parameters")) {
    return "Esta solicitud ya fue procesada con datos de membresía distintos. Recarga la página e inténtalo de nuevo.";
  }

  if (message.includes("idempotency_key reused with different payment parameters")) {
    return "Esta solicitud ya fue procesada con datos de pago distintos. Recarga la página e inténtalo de nuevo.";
  }

  if (message.startsWith("payments: amount") && message.includes("exceeds remaining balance")) {
    return "El monto ingresado supera el saldo pendiente de esta membresía. Actualiza la página para ver el saldo actual.";
  }

  if (message.startsWith("payments: client and client_membership belong to different gyms")) {
    return "La membresía seleccionada no pertenece al mismo gimnasio que el cliente.";
  }

  if (message.startsWith("payments: client_membership_id") || message.startsWith("payments: client_id")) {
    return "No se pudo verificar el cliente o la membresía. Recarga la página e inténtalo de nuevo.";
  }

  return null;
}
