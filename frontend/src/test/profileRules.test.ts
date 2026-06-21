import { describe, it, expect } from "vitest";
import { ClientProfile } from "@/types/shop";
import { generateWelcomeContext } from "@/utils/profileRules";

describe("Profile Rules - Generación medible de mensajes y chips", () => {
  it("Caso concreto 1: Piel grasa, clima frío extremo, 30 años", () => {
    const profile: ClientProfile = {
      skin_type: "grasa",
      climate: "frio",
      age: 30,
    };

    const result = generateWelcomeContext(profile);

    // En clima frío extremo, la piel grasa suele deshidratarse. 
    // No deberíamos recomendar SOLO "Control de brillo".
    expect(result.chips).toContain("Hidratación sin pesadez");
    expect(result.chips).toContain("Protección barrera cutánea");
    expect(result.chips).not.toContain("Control de brillo"); // En frío extremo no es la prioridad
    expect(result.chips).toContain("Cuidado antiedad"); // Por los 30 años
  });

  it("Caso concreto 2: Piel seca, clima húmedo, 20 años", () => {
    const profile: ClientProfile = {
      skin_type: "seca",
      climate: "humedo",
      age: 20,
    };

    const result = generateWelcomeContext(profile);

    // En clima húmedo la piel seca retiene algo de humedad, priorizamos texturas ligeras
    expect(result.chips).toContain("Hidratación ligera");
    expect(result.chips).toContain("Protección solar"); // Por la edad < 28
  });

  it("Caso básico: Sin perfil definido", () => {
    const result = generateWelcomeContext(null);

    expect(result.message).toContain("Para darte mejores recomendaciones, te sugiero completar tu perfil");
    expect(result.chips).toBeUndefined(); // Sin perfil no damos chips de personalización específicos de piel
  });

  it("Caso no tan concreto: Solo edad sin clima ni piel", () => {
    const profile: ClientProfile = { age: 45 };
    const result = generateWelcomeContext(profile);

    expect(result.message).toContain("45 años");
    expect(result.chips).toContain("Cuidado antiedad");
    expect(result.chips).toContain("Skincare básico");
  });
});
