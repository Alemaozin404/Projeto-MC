import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(request: Request) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Configuração do Mercado Pago ausente (MP_ACCESS_TOKEN). Adicione o token nos Secrets do AI Studio.' },
        { status: 500 }
      );
    }

    // Initialize Mercado Pago client inside the handler to pick up latest env vars
    const client = new MercadoPagoConfig({ accessToken });
    const payment = new Payment(client);

    const body = await request.json();
    const { amount, description, userEmail, userId } = body;

    if (!process.env.MP_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'Configuração do Mercado Pago ausente (MP_ACCESS_TOKEN). Adicione o token nos Secrets do AI Studio.' },
        { status: 500 }
      );
    }

    const appUrl = process.env.APP_URL;
    if (!appUrl) {
      console.warn('APP_URL não configurado. O webhook pode não funcionar corretamente.');
    }

    // Create Pix payment
    const paymentData = {
      body: {
        transaction_amount: Number(amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: userEmail || 'test@example.com', // Fallback if email is missing
        },
        metadata: {
          user_id: userId,
        },
        // Webhook URL for payment confirmation
        // Only include if appUrl is present to avoid invalid URL errors
        ...(appUrl ? { notification_url: `${appUrl}/api/webhooks/mercadopago` } : {}),
      },
    };

    const result = await payment.create(paymentData);
    console.log('Mercado Pago Payment Result:', result);

    // Extract Pix info
    const pixInfo = {
      id: result.id,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      status: result.status,
    };

    return NextResponse.json(pixInfo);
  } catch (error: any) {
    console.error('Mercado Pago Full Error:', error);
    
    // Mercado Pago SDK errors often have details in error.apiResponse
    let errorMessage = 'Erro ao processar pagamento';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    if (error.apiResponse?.body?.message) {
      errorMessage = error.apiResponse.body.message;
    } else if (error.apiResponse?.body?.cause?.[0]?.description) {
      errorMessage = error.apiResponse.body.cause[0].description;
    }

    // Ensure errorMessage is a string and not empty
    const finalMessage = typeof errorMessage === 'string' && errorMessage.length > 0 
      ? errorMessage 
      : 'Erro desconhecido no processamento do Mercado Pago';

    return NextResponse.json(
      { error: finalMessage },
      { status: 500 }
    );
  }
}
