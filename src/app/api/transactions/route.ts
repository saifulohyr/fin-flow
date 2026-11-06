import { NextRequest, NextResponse } from 'next/server';
import { getAllTransactions, createTransaction } from '@/controllers/transactionController';
import { nanoid } from 'nanoid';


export async function GET() {
  try {
    const data = await getAllTransactions();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createTransaction({ id: nanoid(), ...body });
    return NextResponse.json(result[0], { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
