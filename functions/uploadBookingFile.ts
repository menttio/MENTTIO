import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileBase64, fileName, fileType } = await req.json();

    if (!fileBase64) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'menttio_bookings';

    // String to sign sorted alphabetically
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const msgBuffer = new TextEncoder().encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Determine resource type
    let resourceType = 'raw';
    if (fileType?.startsWith('image/')) resourceType = 'image';
    if (fileType?.startsWith('video/')) resourceType = 'video';

    // Use base64 data URI for upload
    const dataUri = `data:${fileType || 'application/octet-stream'};base64,${fileBase64}`;

    const uploadForm = new FormData();
    uploadForm.append('file', dataUri);
    uploadForm.append('api_key', apiKey);
    uploadForm.append('timestamp', timestamp.toString());
    uploadForm.append('signature', signature);
    uploadForm.append('folder', folder);
    uploadForm.append('public_id', `${Date.now()}_${fileName?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file'}`);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: uploadForm }
    );

    const result = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error('Cloudinary error:', result);
      return Response.json({ error: result.error?.message || 'Upload failed' }, { status: 500 });
    }

    return Response.json({ file_url: result.secure_url });
  } catch (error) {
    console.error('uploadBookingFile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});