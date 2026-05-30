import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODIGI_API  = 'https://api.prodigi.com/v4.0';
const PRODIGI_KEY  = process.env.PRODIGI_API_KEY!;

// Map our bundle types to Prodigi SKUs
const PRODIGI_SKUS: Record<string, string> = {
  'essential':  'GLOBAL-PHO-4X6-PRO',
  'classic':    'GLOBAL-PHO-4X6-PRO',
  'bundle':     'GLOBAL-PHO-4X6-PRO',
  'signature':  'GLOBAL-PHO-4X6-PRO',
  'photo_4x6':  'GLOBAL-PHO-4X6-PRO',
};

interface ProdigiOrderPayload {
  order_id:         string;
  print_url:        string;
  recipient_name:   string;
  recipient_email:  string;
  recipient_phone?: string;
  address_line1:    string;
  address_line2?:   string;
  city:             string;
  state:            string;
  zip:              string;
  country:          string;
  bundle_id:        string;
  orientation:      'portrait' | 'landscape';
}

export async function POST(request: Request) {
  try {
    const body: ProdigiOrderPayload = await request.json();
    const {
      order_id, print_url, recipient_name, recipient_email,
      recipient_phone, address_line1, address_line2,
      city, state, zip, country = 'US',
      bundle_id = 'essential', orientation = 'landscape',
    } = body;

    if (!order_id || !print_url || !recipient_name || !address_line1) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sku = PRODIGI_SKUS[bundle_id] || 'GLOBAL-PHO-4X6-PRO';

    // Build Prodigi order
    const prodigiPayload = {
      merchantReference: order_id,
      shippingMethod:    'Standard',
      recipient: {
        name:    recipient_name,
        email:   recipient_email,
        phoneNumber: recipient_phone || '',
        address: {
          line1:       address_line1,
          line2:       address_line2 || '',
          postalOrZipCode: zip,
          countryCode: country,
          townOrCity:  city,
          stateOrCounty: state,
        },
      },
      items: [
        {
          merchantReference: `${order_id}-print`,
          sku,
          copies:     1,
          sizing:     'fillPrintArea',
          attributes: {
            finish: 'Gloss',
          },
          assets: [
            {
              printArea: 'default',
              url:       print_url,
            },
          ],
        },
      ],
    };

    // Submit to Prodigi
    const prodigiRes = await fetch(`${PRODIGI_API}/orders`, {
      method:  'POST',
      headers: {
        'X-API-Key':    PRODIGI_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prodigiPayload),
    });

    const prodigiData = await prodigiRes.json();

    if (!prodigiRes.ok) {
      console.error('[prodigi] order error:', prodigiData);
      return NextResponse.json(
        { error: prodigiData.detail || 'Prodigi order failed' },
        { status: 500 }
      );
    }

    const prodigiOrderId = prodigiData.order?.id;

    // Update our order with Prodigi order ID
    await supabase
      .from('orders')
      .update({
        gelato_order_id:   prodigiOrderId, // reusing this field for Prodigi
        fulfillment_status: 'submitted',
        fulfillment_source: 'prodigi',
      })
      .eq('id', order_id);

    // Send shipping confirmation email
    try {
      await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'Un Momento Prints <orders@unmomentoprints.com>',
          to:      recipient_email,
          subject: 'Your Un Momento print is on its way! 🎓',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #0f172a;">Your order is being printed!</h2>
              <p>Hi ${recipient_name.split(' ')[0]},</p>
              <p>Your graduation keepsake print has been submitted to our print partner
              and will ship within 2–4 business days.</p>
              <p><strong>Shipping to:</strong><br/>
              ${address_line1}${address_line2 ? ', ' + address_line2 : ''}<br/>
              ${city}, ${state} ${zip}</p>
              <p>We'll send you a tracking number as soon as your order ships.</p>
              <p>Questions? Reply to this email or contact
              <a href="mailto:ceojess@unmomentoprints.com">ceojess@unmomentoprints.com</a></p>
              <hr/>
              <p style="color: #94a3b8; font-size: 12px;">
                Un Momento Prints · The moments that matter most deserve to exist in the real world.
              </p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error('[prodigi] email error:', e);
    }

    return NextResponse.json({
      success:          true,
      prodigi_order_id: prodigiOrderId,
      status:           prodigiData.order?.status?.stage,
    });

  } catch (err: any) {
    console.error('[prodigi]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — check order status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prodigiOrderId   = searchParams.get('prodigi_order_id');

    if (!prodigiOrderId) {
      return NextResponse.json({ error: 'Missing prodigi_order_id' }, { status: 400 });
    }

    const res  = await fetch(`${PRODIGI_API}/orders/${prodigiOrderId}`, {
      headers: { 'X-API-Key': PRODIGI_KEY },
    });
    const data = await res.json();

    return NextResponse.json({
      status:          data.order?.status?.stage,
      tracking:        data.order?.shipments?.[0]?.tracking,
      tracking_url:    data.order?.shipments?.[0]?.trackingUrl,
      carrier:         data.order?.shipments?.[0]?.carrier,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}