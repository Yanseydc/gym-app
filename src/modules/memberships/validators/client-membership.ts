import { z } from "zod";

export const clientMembershipFormSchema = z.object({
  membershipPlanId: z.string().uuid("Select a valid membership plan."),
  startDate: z.string().min(1, "Start date is required."),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
