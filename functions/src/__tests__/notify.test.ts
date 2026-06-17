import { describe, it, expect } from "vitest";
import { splitName, madridIso, bookingPayload } from "../functions/notify";

describe("splitName", () => {
  it("separa nombre y apellidos", () => {
    expect(splitName("Raul Navamuel")).toEqual({ first: "Raul", last: "Navamuel" });
    expect(splitName("Gorka Pascual Landa")).toEqual({ first: "Gorka", last: "Pascual Landa" });
    expect(splitName("Solo")).toEqual({ first: "Solo", last: "" });
    expect(splitName("")).toEqual({ first: "", last: "" });
  });
});

describe("madridIso", () => {
  it("verano -> +02:00 (CEST)", () => {
    expect(madridIso("2026-06-25", "19:30")).toBe("2026-06-25T19:30:00.000+02:00");
  });
  it("invierno -> +01:00 (CET)", () => {
    expect(madridIso("2026-01-15", "18:00")).toBe("2026-01-15T18:00:00.000+01:00");
  });
});

describe("bookingPayload", () => {
  it("mapea el booking al payload del webhook", () => {
    const p = bookingPayload({
      student_name: "ramses Payo", teacher_name: "Raul Navamuel",
      student_id: "s1", student_email: "a@b.com", subject_name: "Matemáticas",
      price: 20, teacher_email: "t@menttio.com", date: "2026-06-25", start_time: "18:30",
      booking_id: "bk1",
    });
    expect(p.student_first_name).toBe("ramses");
    expect(p.student_last_name).toBe("Payo");
    expect(p.teacher_first_name).toBe("Raul");
    expect(p.subject).toBe("Matemáticas");
    expect(p.class_start_datetime).toBe("2026-06-25T18:30:00.000+02:00");
    expect(p.booking_id).toBe("bk1");
  });
});
