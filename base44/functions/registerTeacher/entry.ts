// RETIRADA (09/11/2026). Creaba profesores premium con permisos de servicio sin comprobar quien
// llamaba. No la usa ninguna pagina: el alta de profesor va por TeacherSignup y
// subscriptionCheckout, y las cuentas corporativas se retiraron en septiembre.
// La version anterior esta en git (origin/main, base44/functions/registerTeacher/entry.ts).
Deno.serve(() => Response.json({ error: 'Esta funcion ya no esta disponible' }, { status: 410 }));
