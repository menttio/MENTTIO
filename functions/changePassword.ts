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

    // Verify current password by trying to sign in
    const signInUrl = 'https://api.base44.com/auth/signin';
    const verifyResponse = await fetch(signInUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': Deno.env.get('BASE44_APP_ID')
      },
      body: JSON.stringify({
        email: user.email,
        password: currentPassword
      })
    });

    if (!verifyResponse.ok) {
      return Response.json({ 
        error: 'La contraseña actual es incorrecta' 
      }, { status: 400 });
    }

    // Update password using Base44 Admin API with service role
    const updateUrl = 'https://api.base44.com/admin/users/update-password';
    const updateResponse = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': Deno.env.get('BASE44_APP_ID'),
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        email: user.email,
        password: newPassword
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Error updating password:', errorText);
      return Response.json({ 
        error: 'Error al actualizar la contraseña. Por favor, inténtalo de nuevo.' 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true,
      message: 'Contraseña actualizada correctamente' 
    });

  } catch (error) {
    console.error('Error in changePassword:', error);
    return Response.json({ 
      error: 'Error al procesar la solicitud: ' + error.message 
    }, { status: 500 });
  }
});