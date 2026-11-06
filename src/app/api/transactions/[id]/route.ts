import { NextRequest, NextResponse } from 'next/server';
import { deleteTransaction } from '@/controllers/transactionController';


export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const result = await deleteTransaction(resolvedParams.id);
    return NextResponse.json(result[0]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
