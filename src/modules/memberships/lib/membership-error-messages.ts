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
  "Membership not found.":
    "No se encontró la membresía.",
  "Cancelled memberships cannot be extended.":
    "Una membresía cancelada no se puede extender.",
  "Expired memberships cannot be extended. Renew instead.":
    "Una membresía vencida no se puede extender. Usa renovar en su lugar.",
  "This membership has not started yet.":
    "Esta membresía todavía no comienza.",
  "This membership is cancelled and cannot be renewed.":
    "Una membresía cancelada no se puede renovar.",
  "This client already has an upcoming membership.":
    "Ya existe el siguiente periodo para este cliente.",
  "This client already has an active membership.":
    "Este cliente ya tiene una membresía activa.",
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

  if (message.includes("extend_membership: idempotency_key reused with different parameters")) {
    return "Esta solicitud ya fue procesada con datos distintos de extensión. Recarga la página e inténtalo de nuevo.";
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

/**
 * Whether an extend_membership failure represents an overlap conflict -
 * either the RPC's own authoritative pre-check (a stable, authored message
 * string, safe to match verbatim - not a raw/unpredictable Postgres
 * message) or the residual-race case where the
 * client_memberships_no_overlapping_active_periods exclusion constraint
 * itself fired (SQLSTATE 23P01). The code check is duplicated here rather
 * than importing membership-service.ts's own isMembershipPeriodConflictError,
 * which would pull that file's Supabase dependency chain into this
 * otherwise dependency-free module - both must always agree that "23P01"
 * is the one relevant code, so this is documented, not accidental,
 * duplication.
 *
 * Both cases resolve to the exact same friendly message
 * (memberships.operations.feedback.extendOverlap) at the call site -
 * intentional: from the user's perspective both mean the same thing.
 */
export function isExtendOverlapConflict(error: { message: string; code?: string | null }): boolean {
  return (
    error.code === "23P01" ||
    error.message === "This extension would overlap with an upcoming membership."
  );
}

/**
 * Same shape as isExtendOverlapConflict, for renew_membership's own
 * overlap pre-check message. Kept as a separate function (rather than a
 * shared helper parameterized by message) so each RPC's exact stable
 * string stays a single, greppable literal at its call site.
 */
export function isRenewOverlapConflict(error: { message: string; code?: string | null }): boolean {
  return (
    error.code === "23P01" ||
    error.message === "This client already has a membership occupying that period."
  );
}
