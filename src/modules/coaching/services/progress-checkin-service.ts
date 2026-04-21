import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/types/supabase";
import type {
  ProgressCheckIn,
  ProgressCheckInFormValues,
  ProgressCheckInPhoto,
  ProgressCheckInPhotoRecord,
  ProgressCheckInRecord,
  ProgressCheckInSummary,
  ProgressPhotoType,
} from "@/modules/coaching/types";

const CHECKIN_PHOTOS_BUCKET = "checkins";
const photoTypes: ProgressPhotoType[] = ["front", "side", "back"];
const ALLOWED_CHECKIN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_CHECKIN_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

function mapProgressCheckInSummary(
  record: ProgressCheckInRecord,
  photoTypeList: ProgressPhotoType[],
): ProgressCheckInSummary {
  return {
    id: record.id,
    checkinDate: record.checkin_date,
    weightKg: record.weight_kg ? Number(record.weight_kg) : null,
    clientNotes: record.client_notes,
    coachNotes: record.coach_notes,
    photoTypes: photoTypeList,
    updatedAt: record.updated_at,
  };
}

function mapProgressCheckIn(
  record: ProgressCheckInRecord,
  photos: ProgressCheckInPhoto[],
): ProgressCheckIn {
  return {
    id: record.id,
    clientId: record.client_id,
    checkinDate: record.checkin_date,
    weightKg: record.weight_kg ? Number(record.weight_kg) : null,
    clientNotes: record.client_notes,
    coachNotes: record.coach_notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    photos,
  };
}

function normalizeProgressCheckInPayload(values: ProgressCheckInFormValues) {
  return {
    checkin_date: values.checkinDate,
    weight_kg: values.weightKg ? Number(values.weightKg) : null,
    client_notes: values.clientNotes.trim() || null,
    coach_notes: values.coachNotes.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

function getFileExtension(file: File) {
  const nameParts = file.name.split(".");
  const extension = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : "";

  if (extension) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function buildCheckinImagePath(params: {
  checkinId: string;
  clientId: string;
  file: File;
  photoType: ProgressPhotoType;
}) {
  const extension = getFileExtension(params.file);
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();

  return `${params.clientId}/${params.checkinId}/${params.photoType}-${timestamp}-${uuid}.${extension}`;
}

async function uploadOrReplacePhoto(params: {
  checkinId: string;
  clientId: string;
  file: File | null;
  photoType: ProgressPhotoType;
  supabase: AppSupabaseClient;
}) {
  if (!params.file || params.file.size === 0) {
    return { error: null };
  }

  console.info("[progress-checkin] processing photo upload", {
    fileName: params.file.name,
    fileSize: params.file.size,
    fileType: params.file.type,
    photoType: params.photoType,
  });

  if (!ALLOWED_CHECKIN_IMAGE_TYPES.includes(params.file.type as (typeof ALLOWED_CHECKIN_IMAGE_TYPES)[number])) {
    return {
      error: `${params.photoType} photo must be JPG, PNG, or WEBP.`,
    };
  }

  if (params.file.size > MAX_CHECKIN_IMAGE_SIZE_BYTES) {
    return {
      error: `${params.photoType} photo must be 10 MB or smaller.`,
    };
  }

  const storagePath = buildCheckinImagePath({
    checkinId: params.checkinId,
    clientId: params.clientId,
    file: params.file,
    photoType: params.photoType,
  });

  console.info("[progress-checkin] generated storage path", {
    path: storagePath,
    photoType: params.photoType,
  });

  const { error: uploadError } = await params.supabase.storage
    .from(CHECKIN_PHOTOS_BUCKET)
    .upload(storagePath, params.file, {
      upsert: false,
      contentType: params.file.type || undefined,
    });

  if (uploadError) {
    console.error("[progress-checkin] storage upload failed", {
      error: uploadError.message,
      fileName: params.file.name,
      fileSize: params.file.size,
      fileType: params.file.type,
      path: storagePath,
      photoType: params.photoType,
    });

    return {
      error: `Storage upload failed for ${params.photoType} photo: ${uploadError.message}`,
    };
  }

  const { data: existingPhoto, error: photoLookupError } = await params.supabase
    .from("client_checkin_photos")
    .select("id, storage_path")
    .eq("client_checkin_id", params.checkinId)
    .eq("photo_type", params.photoType)
    .maybeSingle();

  if (photoLookupError) {
    await params.supabase.storage.from(CHECKIN_PHOTOS_BUCKET).remove([storagePath]);

    console.error("[progress-checkin] photo lookup failed after upload", {
      error: photoLookupError.message,
      path: storagePath,
      photoType: params.photoType,
    });

    return {
      error: `Database lookup failed after uploading ${params.photoType} photo: ${photoLookupError.message}`,
    };
  }

  if (existingPhoto) {
    const { error: updateError } = await params.supabase
      .from("client_checkin_photos")
      .update({
        storage_path: storagePath,
      })
      .eq("id", String(existingPhoto.id));

    if (updateError) {
      await params.supabase.storage.from(CHECKIN_PHOTOS_BUCKET).remove([storagePath]);

      console.error("[progress-checkin] photo record update failed", {
        error: updateError.message,
        path: storagePath,
        photoType: params.photoType,
      });

      return {
        error: `Database update failed for ${params.photoType} photo: ${updateError.message}`,
      };
    }

    if (existingPhoto.storage_path && existingPhoto.storage_path !== storagePath) {
      await params.supabase.storage.from(CHECKIN_PHOTOS_BUCKET).remove([String(existingPhoto.storage_path)]);
    }
  } else {
    const { error: insertError } = await params.supabase
      .from("client_checkin_photos")
      .insert({
        client_checkin_id: params.checkinId,
        photo_type: params.photoType,
        storage_path: storagePath,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      await params.supabase.storage.from(CHECKIN_PHOTOS_BUCKET).remove([storagePath]);

      console.error("[progress-checkin] photo record insert failed", {
        error: insertError.message,
        path: storagePath,
        photoType: params.photoType,
      });

      return {
        error: `Database insert failed for ${params.photoType} photo: ${insertError.message}`,
      };
    }
  }

  return { error: null };
}

async function getSignedUrlMap(
  supabase: AppSupabaseClient,
  photos: ProgressCheckInPhotoRecord[],
) {
  const signedEntries = await Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from(CHECKIN_PHOTOS_BUCKET)
        .createSignedUrl(photo.storage_path, 60 * 60);

      return [
        photo.id,
        error ? null : data.signedUrl,
      ] as const;
    }),
  );

  return new Map<string, string | null>(signedEntries);
}

export async function listProgressCheckInsByClient(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<{ data: ProgressCheckInSummary[]; error: string | null }> {
  const { data, error } = await supabase
    .from("client_checkins")
    .select("*")
    .eq("client_id", clientId)
    .order("checkin_date", { ascending: false });

  if (error) {
    return {
      data: [],
      error: error.message,
    };
  }

  const records = (data ?? []) as ProgressCheckInRecord[];

  if (records.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const { data: photoRows, error: photosError } = await supabase
    .from("client_checkin_photos")
    .select("*")
    .in(
      "client_checkin_id",
      records.map((record) => record.id),
    );

  if (photosError) {
    return {
      data: [],
      error: photosError.message,
    };
  }

  const photoTypesByCheckIn = (photoRows ?? []).reduce((map, photo) => {
    const checkinId = String(photo.client_checkin_id);
    const list = map.get(checkinId) ?? [];
    list.push(photo.photo_type as ProgressPhotoType);
    map.set(checkinId, list);
    return map;
  }, new Map<string, ProgressPhotoType[]>());

  return {
    data: records.map((record) =>
      mapProgressCheckInSummary(record, photoTypesByCheckIn.get(record.id) ?? []),
    ),
    error: null,
  };
}

export async function getProgressCheckInById(
  supabase: AppSupabaseClient,
  checkinId: string,
): Promise<{ data: ProgressCheckIn | null; error: string | null }> {
  const { data, error } = await supabase
    .from("client_checkins")
    .select("*")
    .eq("id", checkinId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      data: null,
      error: null,
    };
  }

  const record = data as ProgressCheckInRecord;
  const { data: photoRows, error: photosError } = await supabase
    .from("client_checkin_photos")
    .select("*")
    .eq("client_checkin_id", checkinId);

  if (photosError) {
    return {
      data: null,
      error: photosError.message,
    };
  }

  const photos = (photoRows ?? []) as ProgressCheckInPhotoRecord[];
  const signedUrlMap = await getSignedUrlMap(supabase, photos);

  const mappedPhotos: ProgressCheckInPhoto[] = photos
    .sort((a, b) => photoTypes.indexOf(a.photo_type as ProgressPhotoType) - photoTypes.indexOf(b.photo_type as ProgressPhotoType))
    .map((photo) => ({
      id: photo.id,
      photoType: photo.photo_type,
      storagePath: photo.storage_path,
      signedUrl: signedUrlMap.get(photo.id) ?? null,
      createdAt: photo.created_at,
    }));

  return {
    data: mapProgressCheckIn(record, mappedPhotos),
    error: null,
  };
}

export async function createProgressCheckInRecord(
  supabase: AppSupabaseClient,
  clientId: string,
  values: ProgressCheckInFormValues,
) {
  return supabase
    .from("client_checkins")
    .insert({
      client_id: clientId,
      ...normalizeProgressCheckInPayload(values),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();
}

export async function updateProgressCheckInRecord(
  supabase: AppSupabaseClient,
  checkinId: string,
  values: ProgressCheckInFormValues,
) {
  return supabase
    .from("client_checkins")
    .update(normalizeProgressCheckInPayload(values))
    .eq("id", checkinId)
    .select("id, client_id")
    .single();
}

export async function saveProgressCheckInPhotos(params: {
  checkinId: string;
  clientId: string;
  files: Record<ProgressPhotoType, File | null>;
  supabase: AppSupabaseClient;
}) {
  for (const photoType of photoTypes) {
    const result = await uploadOrReplacePhoto({
      checkinId: params.checkinId,
      clientId: params.clientId,
      file: params.files[photoType],
      photoType,
      supabase: params.supabase,
    });

    if (result.error) {
      return {
        error: result.error,
      };
    }
  }

  return { error: null };
}

export const getProgressCheckInsForPage = cache(async (clientId: string) => {
  const supabase = await createClient();
  return listProgressCheckInsByClient(supabase, clientId);
});

export const getProgressCheckInForPage = cache(async (checkinId: string) => {
  const supabase = await createClient();
  return getProgressCheckInById(supabase, checkinId);
});
