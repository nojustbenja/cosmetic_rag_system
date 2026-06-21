import { ClientProfile } from "@/types/shop";

export function generateWelcomeContext(profile: ClientProfile | null) {
  if (!profile) {
    return {
      message: "¡Hola! Soy Lumi, tu asesora de belleza. Para darte mejores recomendaciones, te sugiero completar tu perfil aquí arriba. ¿Qué producto estás buscando hoy?",
      chips: undefined
    };
  }

  const skin = profile.skin_type ? `piel ${profile.skin_type}` : "";
  const age = profile.age ? ` (${profile.age} años)` : "";
  const text = `¡Hola! Ya tengo configurado tu perfil${age}${skin ? ' con ' + skin : ''}. ¿En qué te puedo ayudar hoy?`;
  
  const chips: string[] = [];
  
  if (profile.skin_type === "seca") {
    if (profile.climate === "humedo") {
      chips.push("Hidratación ligera", "Sérum luminoso");
    } else {
      chips.push("Rutina súper hidratante", "Sérum luminoso");
    }
  } else if (profile.skin_type === "grasa" || profile.skin_type === "mixta") {
    if (profile.climate === "frio") {
      chips.push("Hidratación sin pesadez", "Protección barrera cutánea");
    } else {
      chips.push("Control de brillo", "Limpieza profunda");
    }
  } else {
    chips.push("Skincare básico", "Rutina de día");
  }
  
  if (profile.age && Number(profile.age) > 28) {
    chips.push("Cuidado antiedad", "Contorno de ojos");
  } else {
    chips.push("Protección solar");
  }

  return {
    message: text,
    chips: chips.slice(0, 4)
  };
}
