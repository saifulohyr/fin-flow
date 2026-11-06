import { NextRequest, NextResponse } from 'next/server';
import { parseTransactionNLU } from '@/lib/nlu-parser';


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg || msg.type !== 'text') return NextResponse.json({ status: 'ignored' });

    const text: string = msg.text.body;
    const phoneId = process.env.WA_PHONE_NUMBER_ID;
    const token = process.env.WA_ACCESS_TOKEN;
    const to: string = msg.from;

    const parsed = parseTransactionNLU(text);
    let reply: string;

    if (parsed && typeof parsed.amount === 'number' && parsed.amount > 0) {
      reply = `Transaksi tercatat: Rp ${parsed.amount.toLocaleString('id-ID')} - ${parsed.title ?? text}`;
    } else {
      reply = 'Format tidak dikenali. Contoh: "makan siang 35rb bca" atau "gaji 3jt mandiri"';
    }

    if (phoneId && token) {
      await fetch('https://graph.facebook.com/v18.0/' + phoneId + '/messages', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: reply } }),
      });
    }

    return NextResponse.json({ status: 'ok', reply });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
