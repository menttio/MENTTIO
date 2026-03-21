import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response('Missing url', { status: 400 });
    }

    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      return new Response('Failed to fetch file', { status: 502 });
    }

    const buffer = await fileRes.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('proxyFile error:', error);
    return new Response(error.message, { status: 500 });
  }
});