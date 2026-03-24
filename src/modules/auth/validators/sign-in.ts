import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Correo inválido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});
