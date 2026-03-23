import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Parse request body
        const body = await req.json();
        const { booking_id, meet_link } = body;

        // Validate required fields
        if (!booking_id || !meet_link) {
            return Response.json({
                error: 'Faltan campos requeridos: booking_id y meet_link'
            }, { status: 400 });
        }

        // Update booking with meet link
        await base44.asServiceRole.entities.Booking.update(booking_id, {
            meet_link: meet_link
        });

        return Response.json({
            success: true,
            message: 'Link de Meet actualizado correctamente',
            booking_id: booking_id
        });

    } catch (error) {
        console.error('Error en setMeetLink:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});