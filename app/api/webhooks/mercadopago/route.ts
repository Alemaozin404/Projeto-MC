import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase-admin';

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

const payment = new Payment(client);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Mercado Pago Webhook Received:', body);

    // Mercado Pago sends notifications in different formats
    // Usually it's { type: 'payment', data: { id: '...' } }
    const paymentId = body.data?.id || body.resource?.split('/').pop() || body.id;
    const type = body.type || body.topic;

    if (type === 'payment' && paymentId) {
      // Fetch payment details from Mercado Pago
      const paymentInfo = await payment.get({ id: paymentId });
      const status = paymentInfo.status; // 'approved', 'pending', 'cancelled', etc.
      
      console.log(`Payment ${paymentId} status: ${status}`);

      // Update Firestore
      // We need to find the purchase record with this confirmationKey (which is the paymentId)
      const purchasesRef = adminDb.collection('purchases');
      const snapshot = await purchasesRef.where('confirmationKey', '==', String(paymentId)).get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          status: status,
          updatedAt: new Date().toISOString()
        });
        console.log(`Purchase ${doc.id} updated to status: ${status}`);
      } else {
        console.warn(`No purchase found for confirmationKey: ${paymentId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    // Always return 200 to Mercado Pago to avoid retries if we received it
    return NextResponse.json({ error: error.message }, { status: 200 });
  }
}
