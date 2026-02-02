import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return Response.json({ 
        error: 'Se requieren la contraseña actual y la nueva contraseña' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ 
        error: 'La nueva contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 });
    }

    // Use Base44 SDK to update password
    try {
      await base44.auth.updatePassword(currentPassword, newPassword);
      
      return Response.json({ 
        success: true,
        message: 'Contraseña actualizada correctamente' 
      });
    } catch (passwordError) {
      console.error('Password update error:', passwordError);
      
      // Check if it's a wrong password error
      if (passwordError.message?.includes('incorrect') || passwordError.message?.includes('wrong')) {
        return Response.json({ 
          error: 'La contraseña actual es incorrecta' 
        }, { status: 400 });
      }
      
      return Response.json({ 
        error: 'Error al actualizar la contraseña. Por favor, inténtalo de nuevo.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in changePassword:', error);
    return Response.json({ 
      error: 'Error al procesar la solicitud: ' + error.message 
    }, { status: 500 });
  }
});