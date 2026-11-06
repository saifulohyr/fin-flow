import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 });
  }

  const systemMsg = {
    role: 'system',
    content: 'Kamu adalah asisten keuangan pribadi FinFlow. Bantu user memahami kondisi keuangan, merencanakan anggaran, dan mencatat transaksi. Jawab dalam bahasa Indonesia yang ringkas. Jika user menyebut nominal uang, format dalam Rupiah (Rp).'
  };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [systemMsg, ...messages], max_tokens: 1024 }),
  });

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  const data = await res.json();
  return NextResponse.json({ reply: data.choices[0].message.content });
}
