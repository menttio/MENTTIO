// Fábrica de entidades compatible con el SDK de Base44 (Entity.filter/get/list/create/update/delete)
// pero respaldada por Supabase. Recibe el cliente supabase por parámetro para poder testearla.
import { toDbField, toDbRow, fromDbRow } from "./fieldMap";

// Aplica el sort estilo Base44 ("-campo" = desc, "campo" = asc) a una query supabase.
export function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith("-");
  const field = toDbField(desc ? sort.slice(1) : sort);
  return query.order(field, { ascending: !desc });
}

export function makeEntity(supabase, table) {
  const select = () => supabase.from(table).select("*");

  return {
    // Base44: Entity.list(sort?, limit?) -> todas las filas.
    async list(sort = "-created_date", limit) {
      let q = applySort(select(), sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(fromDbRow);
    },

    // Base44: Entity.filter(queryObj, sort?, limit?) -> filtro por igualdad.
    async filter(queryObj = {}, sort = "-created_date", limit) {
      let q = select();
      for (const [k, v] of Object.entries(queryObj)) q = q.eq(toDbField(k), v);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(fromDbRow);
    },

    // Base44: Entity.get(id) -> una fila.
    async get(id) {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) throw error;
      return fromDbRow(data);
    },

    // Base44: Entity.create(obj) -> fila creada.
    async create(obj) {
      const { data, error } = await supabase.from(table).insert(toDbRow(obj)).select().single();
      if (error) throw error;
      return fromDbRow(data);
    },

    // Base44: Entity.update(id, obj) -> fila actualizada.
    async update(id, obj) {
      const { data, error } = await supabase.from(table).update(toDbRow(obj)).eq("id", id).select().single();
      if (error) throw error;
      return fromDbRow(data);
    },

    // Base44: Entity.delete(id).
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return { success: true };
    },
  };
}

// Mapa entidad Base44 -> tabla Supabase.
export const ENTITY_TABLES = {
  Teacher: "teachers",
  Booking: "bookings",
  Student: "students",
  Notification: "notifications",
  Conversation: "conversations",
  Availability: "availability",
  Subject: "subjects",
  Review: "reviews",
  TrialUsed: "trial_used",
  Message: "messages",
  PushSubscription: "push_subscriptions",
};

export function makeEntities(supabase) {
  const entities = {};
  for (const [name, table] of Object.entries(ENTITY_TABLES)) {
    entities[name] = makeEntity(supabase, table);
  }
  return entities;
}
