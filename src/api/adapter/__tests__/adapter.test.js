import { describe, it, expect } from "vitest";
import { toDbField, toDbRow, fromDbRow } from "../fieldMap";
import { makeEntity, applySort, makeEntities, ENTITY_TABLES } from "../entities";

// Cliente Supabase simulado: encadenable y "thenable" (para await de list/filter) + single().
function makeFake(rows = []) {
  const calls = [];
  let lastTable = null;
  const builder = {
    select(a) { calls.push(["select", a]); return builder; },
    eq(c, v) { calls.push(["eq", c, v]); return builder; },
    order(c, o) { calls.push(["order", c, o]); return builder; },
    limit(n) { calls.push(["limit", n]); return builder; },
    insert(r) { calls.push(["insert", r]); return builder; },
    update(r) { calls.push(["update", r]); return builder; },
    delete() { calls.push(["delete"]); return builder; },
    single() { calls.push(["single"]); return Promise.resolve({ data: rows[0] ?? null, error: null }); },
    then(res, rej) { return Promise.resolve({ data: rows, error: null }).then(res, rej); },
  };
  return {
    calls,
    get lastTable() { return lastTable; },
    from(t) { lastTable = t; calls.push(["from", t]); return builder; },
  };
}

describe("fieldMap", () => {
  it("traduce nombres Base44 -> Supabase", () => {
    expect(toDbField("created_date")).toBe("created_at");
    expect(toDbField("updated_date")).toBe("updated_at");
    expect(toDbField("created_by_id")).toBe("created_by");
    expect(toDbField("teacher_id")).toBe("teacher_id");
  });
  it("toDbRow renombra claves", () => {
    expect(toDbRow({ created_date: 1, name: "x" })).toEqual({ created_at: 1, name: "x" });
  });
  it("fromDbRow revierte", () => {
    expect(fromDbRow({ created_at: 1, name: "x" })).toEqual({ created_date: 1, name: "x" });
  });
});

describe("applySort", () => {
  const fakeQ = { order: (c, o) => ({ c, o }) };
  it("'-campo' = descendente y mapea el campo", () => {
    expect(applySort(fakeQ, "-created_date")).toEqual({ c: "created_at", o: { ascending: false } });
  });
  it("'campo' = ascendente", () => {
    expect(applySort(fakeQ, "name")).toEqual({ c: "name", o: { ascending: true } });
  });
  it("sin sort devuelve la query intacta", () => {
    expect(applySort("Q", null)).toBe("Q");
  });
});

describe("makeEntity.filter", () => {
  it("traduce filtro por igualdad, sort y limit, y mapea resultados", async () => {
    const supa = makeFake([{ id: "1", created_at: "2026-01-01", teacher_id: "t1" }]);
    const e = makeEntity(supa, "teachers");
    const res = await e.filter({ teacher_id: "t1" }, "-created_date", 5);
    expect(supa.calls).toContainEqual(["from", "teachers"]);
    expect(supa.calls).toContainEqual(["eq", "teacher_id", "t1"]);
    expect(supa.calls).toContainEqual(["order", "created_at", { ascending: false }]);
    expect(supa.calls).toContainEqual(["limit", 5]);
    expect(res[0].created_date).toBe("2026-01-01");
    expect(res[0].created_at).toBeUndefined();
  });
});

describe("makeEntity.create / get / update / delete", () => {
  it("create envía la fila con claves traducidas y devuelve mapeado", async () => {
    const supa = makeFake([{ id: "1", created_at: "x", name: "n" }]);
    const res = await makeEntity(supa, "subjects").create({ created_date: "x", name: "n" });
    expect(supa.calls).toContainEqual(["insert", { created_at: "x", name: "n" }]);
    expect(res.created_date).toBe("x");
  });
  it("get busca por id y devuelve uno mapeado", async () => {
    const supa = makeFake([{ id: "9", created_at: "d" }]);
    const r = await makeEntity(supa, "bookings").get("9");
    expect(supa.calls).toContainEqual(["eq", "id", "9"]);
    expect(supa.calls).toContainEqual(["single"]);
    expect(r.created_date).toBe("d");
  });
  it("update aplica patch por id", async () => {
    const supa = makeFake([{ id: "9", status: "paid" }]);
    await makeEntity(supa, "bookings").update("9", { status: "paid" });
    expect(supa.calls).toContainEqual(["update", { status: "paid" }]);
    expect(supa.calls).toContainEqual(["eq", "id", "9"]);
  });
  it("delete borra por id", async () => {
    const supa = makeFake([]);
    const r = await makeEntity(supa, "reviews").delete("7");
    expect(supa.calls).toContainEqual(["delete"]);
    expect(supa.calls).toContainEqual(["eq", "id", "7"]);
    expect(r).toEqual({ success: true });
  });
});

describe("ENTITY_TABLES / makeEntities", () => {
  it("mapea las 11 entidades a sus tablas", () => {
    expect(ENTITY_TABLES.Teacher).toBe("teachers");
    expect(ENTITY_TABLES.Booking).toBe("bookings");
    expect(ENTITY_TABLES.PushSubscription).toBe("push_subscriptions");
    expect(Object.keys(ENTITY_TABLES)).toHaveLength(11);
  });
  it("makeEntities expone cada entidad con sus métodos", () => {
    const ents = makeEntities(makeFake([]));
    expect(typeof ents.Teacher.filter).toBe("function");
    expect(typeof ents.Booking.create).toBe("function");
  });
});
