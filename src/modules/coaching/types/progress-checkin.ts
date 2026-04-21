import type { Database } from "@/types/database";

export type ProgressCheckInRecord = Database["public"]["Tables"]["client_checkins"]["Row"];
export type ProgressCheckInPhotoRecord = Database["public"]["Tables"]["client_checkin_photos"]["Row"];
export type ProgressPhotoType = ProgressCheckInPhotoRecord["photo_type"];

export type ProgressCheckInPhoto = {
  id: string;
  photoType: ProgressPhotoType;
  storagePath: string;
  signedUrl: string | null;
  createdAt: string;
};

export type ProgressCheckInSummary = {
  id: string;
  checkinDate: string;
  weightKg: number | null;
  clientNotes: string | null;
  coachNotes: string | null;
  photoTypes: ProgressPhotoType[];
  updatedAt: string;
};

export type ProgressCheckIn = {
  id: string;
  clientId: string;
  checkinDate: string;
  weightKg: number | null;
  clientNotes: string | null;
  coachNotes: string | null;
  createdAt: string;
  updatedAt: string;
  photos: ProgressCheckInPhoto[];
};

export type ProgressCheckInFormValues = {
  checkinDate: string;
  weightKg: string;
  clientNotes: string;
  coachNotes: string;
};

export type ProgressCheckInMutationState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ProgressCheckInFormValues, string>>;
};
