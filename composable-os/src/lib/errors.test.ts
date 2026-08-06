import { describe, it, expect } from "vitest";

import { ApiError } from "@/lib/api";
import { translateApiError } from "@/lib/errors";

/**
 * El contrato del ADR 0010 no es solo "hay traducciones": es la escalera de
 * reserva. Un codigo mapeado da espanol; uno sin mapear cae al mensaje del
 * backend; sin codigo, al mensaje pelado. Lo que nunca debe pasar es que al
 * usuario le llegue el identificador crudo.
 */
describe("translateApiError", () => {
  it("renders Spanish from a mapped code and its detail", () => {
    const error = new ApiError("Cannot delete a project in 'active' status.", "PROJECT_DELETE_NOT_PLANNING", { status: "active" }, 409);

    const text = translateApiError(error);

    expect(text).toContain("active");
    expect(text).toContain("planificacion");
    expect(text).not.toContain("PROJECT_DELETE_NOT_PLANNING");
  });

  it("builds the sentence from detail parts rather than the backend message", () => {
    const error = new ApiError("Invalid transition: cancelled -> active.", "PROJECT_INVALID_TRANSITION", { from: "cancelled", to: "active", allowed: [] }, 422);

    const text = translateApiError(error);

    expect(text).toContain("'cancelled'");
    expect(text).toContain("'active'");
    expect(text).toContain("ninguno (estado final)");
  });

  it("joins list details instead of printing an array", () => {
    const error = new ApiError("Invalid stage.", "CRM_OPPORTUNITY_INVALID_STAGE", { stage: "bogus", allowed: ["lost", "new", "qualified"] }, 422);

    const text = translateApiError(error);

    expect(text).toContain("lost, new, qualified");
    expect(text).not.toContain("[");
  });

  it("falls back to the backend message for an unmapped code", () => {
    // Un modulo sin migrar: ingles es peor que espanol, pero mucho mejor que
    // un identificador crudo.
    const error = new ApiError("Only draft invoices can be voided", "ACCOUNTING_NOT_YET_MIGRATED", undefined, 409);

    expect(translateApiError(error)).toBe("Only draft invoices can be voided");
  });

  it("falls back to the message when there is no code at all", () => {
    expect(translateApiError(new Error("Network request failed"))).toBe("Network request failed");
  });

  it("uses the caller's fallback when there is nothing to show", () => {
    expect(translateApiError(undefined, "Transición no permitida")).toBe("Transición no permitida");
    expect(translateApiError(new Error(""), "Transición no permitida")).toBe("Transición no permitida");
  });

  it("keeps the two login failure causes indistinguishable", () => {
    // El backend manda un solo codigo para "correo desconocido" y "contrasena
    // incorrecta" a proposito. El cliente tampoco puede inventarse la
    // diferencia: una sola entrada, un solo texto.
    const error = new ApiError("Invalid email or password.", "IDENTITY_INVALID_CREDENTIALS", undefined, 401);

    const text = translateApiError(error);

    expect(text).toBe("Correo o contrasena incorrectos.");
    expect(text).not.toMatch(/correo.*no existe|no registrado/i);
  });

  it("tells an expired session apart from a rejected login", () => {
    const expired = new ApiError("Invalid or expired token.", "AUTH_TOKEN_INVALID", undefined, 401);
    const rejected = new ApiError("Invalid email or password.", "IDENTITY_INVALID_CREDENTIALS", undefined, 401);

    expect(translateApiError(expired)).not.toBe(translateApiError(rejected));
    expect(translateApiError(expired)).toContain("sesion");
  });

  it("never leaks the raw code as user-facing text", () => {
    const error = new ApiError("", "PORTAL_LINK_EXPIRED", undefined, 410);

    const text = translateApiError(error);

    expect(text).not.toContain("PORTAL_LINK_EXPIRED");
    expect(text).toContain("caducado");
  });
});
