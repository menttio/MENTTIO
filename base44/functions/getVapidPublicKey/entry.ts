import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // No authentication required for public key
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    
    return new Response(publicKey, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});