import { supabaseAdmin } from '../_shared/supabase.ts';
import { visionExtract } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token. Must be a valid user JWT.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { image_base64, mime_type, document_type } = await req.json();

    if (!image_base64 || !mime_type || !document_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let prompt = '';
    if (document_type === 'boarding_pass') {
      prompt = `Extract the following fields from this boarding pass image. Return a JSON object with keys:
airline, flight_number, origin_airport, destination_airport, departure_date, departure_time,
arrival_time, passenger_name, seat, booking_reference, terminal, gate.
Use null for any field not visible. Return only the JSON object.`;
    } else if (document_type === 'qr_code') {
      prompt = `Decode this QR code image and extract any structured information it contains.
Return a JSON object with any identifiable fields (e.g. url, booking_reference, confirmation_number, etc.).
Return only the JSON object.`;
    } else {
      prompt = `Extract key information from this travel document image. Return a JSON object with any identifiable fields
such as: confirmation_number, provider_name, address, check_in_time, check_out_time, booking_reference,
contact_phone, contact_email. Use null for unavailable fields. Return only the JSON object.`;
    }

    const text = await visionExtract(image_base64, mime_type, prompt);

    let parsedFields: Record<string, string | null> = {};
    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedFields = JSON.parse(cleanText);
    } catch (e) {
      // Graceful degradation
      parsedFields = {};
    }

    return new Response(JSON.stringify({ fields: parsedFields }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
