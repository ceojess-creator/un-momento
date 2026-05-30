import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers }      from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Haversine distance in miles
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R    = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_id,
      event_slug,
      fulfillment_type,
      customer_lat,
      customer_lng,
    } = body;

    if (!order_id || !event_slug) {
      return NextResponse.json(
        { error: 'Missing order_id or event_slug' },
        { status: 400 }
      );
    }

    // Detect if request is from LAN
    const headerList  = await headers();
    const forwardedIp = headerList.get('x-forwarded-for') || '';
    const clientIp    = forwardedIp.split(',')[0].trim();

    // Get event and routing rules
    const { data: event } = await supabase
      .from('event_pages')
      .select('*, fulfillment_rules(*)')
      .eq('slug', event_slug)
      .eq('is_active', true)
      .single();

    if (!event) {
      return NextResponse.json(
        { route: 'gelato', reason: 'No active event found' }
      );
    }

    const rules        = event.fulfillment_rules?.[0];
    const lanSubnet    = rules?.lan_subnet || '';
    const geoRadius    = rules?.geo_radius_miles || 5;
    const maxQueue     = rules?.max_queue_depth  || 160;
    const shippingCost = rules?.shipping_charge_default || 6.00;

    // Check LAN detection
    const isLan = lanSubnet
      ? clientIp.startsWith(lanSubnet)
      : false;

    // Check geo proximity if coordinates provided
    let isNearby = false;
    if (customer_lat && customer_lng && event.venue_lat && event.venue_lng) {
      const dist = haversine(
        customer_lat, customer_lng,
        event.venue_lat, event.venue_lng
      );
      isNearby = dist <= geoRadius;
    }

    // Get current queue depth
    const { data: hardware } = await supabase
      .from('event_hardware')
      .select('queue_depth')
      .eq('event_id', event.id)
      .eq('is_online', true)
      .in('device_type', ['photo_printer', 'sticker_printer']);

    const totalQueued = (hardware || [])
      .reduce((sum, h) => sum + (h.queue_depth || 0), 0);

    // Routing decision
    let route:   string;
    let reason:  string;
    let addShipping = false;
    let shippingAmt = 0;

    const wantsPickup = fulfillment_type === 'pickup' || isLan;

    if (wantsPickup) {
      if (!event.booth_active) {
        route        = 'gelato';
        reason       = 'Booth not active — routing to Gelato';
        addShipping  = true;
        shippingAmt  = shippingCost;
      } else if (totalQueued >= maxQueue) {
        route        = 'gelato_overflow';
        reason       = `Queue full (${totalQueued}/${maxQueue}) — overflow to Gelato`;
        addShipping  = true;
        shippingAmt  = shippingCost;
      } else {
        route        = 'local';
        reason       = `Local print — queue at ${totalQueued}/${maxQueue}`;
      }
    } else {
      route       = 'gelato';
      reason      = 'Ship to door via Gelato';
      addShipping = true;
      shippingAmt = shippingCost;
    }

    // Update order with routing decision
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        fulfillment_source: route,
        fulfillment_status: route === 'local' ? 'queued' : 'pending',
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('[route-order] update error:', updateError);
    }

    // If local — create order_assembly record
    if (route === 'local') {
      await supabase.from('order_assembly').upsert({
        order_id,
        event_id:       event.id,
        status:         'pending',
        items_expected: 1,
        pickup_location: 'Un Momento booth — see Hand-off Associate',
      }, { onConflict: 'order_id' });
    }

    // If Gelato — add to Gelato queue (webhook handles actual submission)
    if (route === 'gelato' || route === 'gelato_overflow') {
      await supabase.from('orders').update({
        fulfillment_source: route,
      }).eq('id', order_id);
    }

    return NextResponse.json({
      route,
      reason,
      queue_depth:    totalQueued,
      max_queue:      maxQueue,
      booth_active:   event.booth_active,
      is_lan:         isLan,
      is_nearby:      isNearby,
      add_shipping:   addShipping,
      shipping_amount: shippingAmt,
    });

  } catch (err: any) {
    console.error('[route-order]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}