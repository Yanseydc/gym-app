const portalMessages = {
  shell: {
    brandSubtitle: "Portal del cliente",
    linkedAccount: "Cuenta vinculada",
    nav: {
      home: "Inicio",
      routine: "Mi rutina",
      progress: "Mi progreso",
      profile: "Mi perfil",
    },
  },
  layout: {
    unavailableTitle: "Portal del cliente no disponible",
    unavailableFallback:
      "Tu cuenta todavía no está vinculada a un cliente. Por favor contacta al staff del gimnasio.",
  },
  home: {
    welcome: "Bienvenido, {firstName}",
    description:
      "Aquí puedes ver tu rutina actual, tus check-ins de progreso y el contexto de tu perfil.",
    routineTitle: "Mi rutina",
    routineEmptyValue: "Sin rutina activa",
    routineEmptyHelper: "Pide a tu coach tu plan más reciente",
    routineDayBlocks: "{count} bloques de día",
    progressTitle: "Mi progreso",
    progressEmptyValue: "Sin check-ins todavía",
    progressEmptyHelper: "Tus actualizaciones de progreso aparecerán aquí",
    progressPhotosAttached: "{count} fotos adjuntas",
    profileTitle: "Mi perfil",
    profileEmptyValue: "Sin onboarding todavía",
    profileEmptyHelper: "Tu contexto de coaching aparecerá aquí",
    profileTrainingDays: "{count} días de entrenamiento por semana",
  },
  routine: {
    title: "Mi rutina",
    description: "Este es tu plan de entrenamiento activo actual.",
    empty: "Todavía no tienes una rutina activa asignada.",
    dayTitle: "Día {index}: {title}",
    dayLabel: "Día {index}",
    exerciseCountOne: "{count} ejercicio",
    exerciseCountOther: "{count} ejercicios",
    noExercises: "Todavía no hay ejercicios agregados.",
    sets: "Series",
    reps: "Repeticiones",
    weight: "Peso",
    rest: "Descanso",
    activeBadge: "Rutina activa",
    today: "Hoy",
    startWorkout: "Iniciar entrenamiento",
    completed: "Completado",
    markComplete: "Marcar ejercicio como completado",
    markIncomplete: "Marcar ejercicio como pendiente",
    progress: "{completed}/{total} ejercicios completados",
    noDayNotes: "Sigue este bloque tal como aparece en tu plan.",
    exerciseNotes: "Indicaciones",
    viewVideo: "Ver video",
    details: "Ver detalle",
    closeDetails: "Cerrar",
    mediaGallery: "Galería",
    instructions: "Instrucciones",
    coachTips: "Tips del coach",
    commonMistakes: "Errores comunes",
    noExtraDetails: "Todavía no hay detalles adicionales para este ejercicio.",
    notAvailable: "N/D",
    secondsShort: "seg",
  },
  progress: {
    title: "Mi progreso",
    description: "Revisa tus check-ins de progreso, notas y fotos.",
    empty: "Todavía no hay check-ins de progreso.",
    weight: "Peso",
    clientNotes: "Notas del cliente",
    coachNotes: "Notas del coach",
    photoTypes: {
      front: "Frente",
      side: "Lado",
      back: "Espalda",
    },
    photoAlt: "{photoType} de progreso",
    noPhoto: "Sin foto",
    notAvailable: "N/D",
  },
  profile: {
    title: "Mi perfil",
    description: "Este es el contexto de coaching registrado actualmente para tu cuenta.",
    empty: "Todavía no hay información de onboarding disponible.",
    labels: {
      weight: "Peso",
      height: "Estatura",
      goal: "Objetivo",
      availableDays: "Días disponibles",
      availableSchedule: "Horario disponible",
      experienceLevel: "Nivel de experiencia",
      injuriesNotes: "Notas de lesiones",
      notes: "Notas",
    },
    perWeek: "/ semana",
    noInjuries: "Sin lesiones registradas",
    noNotes: "Sin notas",
    experienceLevels: {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
    },
  },
} as const;

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function getPortalText() {
  return {
    ...portalMessages,
    home: {
      ...portalMessages.home,
      welcome: (firstName: string) => interpolate(portalMessages.home.welcome, { firstName }),
      routineDayBlocks: (count: number) =>
        interpolate(portalMessages.home.routineDayBlocks, { count }),
      progressPhotosAttached: (count: number) =>
        interpolate(portalMessages.home.progressPhotosAttached, { count }),
      profileTrainingDays: (count: number) =>
        interpolate(portalMessages.home.profileTrainingDays, { count }),
    },
    routine: {
      ...portalMessages.routine,
      dayTitle: (index: number, title: string) =>
        interpolate(portalMessages.routine.dayTitle, { index, title }),
      dayLabel: (index: number) =>
        interpolate(portalMessages.routine.dayLabel, { index }),
      exerciseCount: (count: number) =>
        interpolate(
          count === 1
            ? portalMessages.routine.exerciseCountOne
            : portalMessages.routine.exerciseCountOther,
          { count },
        ),
      progress: (completed: number, total: number) =>
        interpolate(portalMessages.routine.progress, { completed, total }),
    },
    progress: {
      ...portalMessages.progress,
      photoAlt: (photoType: string) => interpolate(portalMessages.progress.photoAlt, { photoType }),
    },
  };
}
