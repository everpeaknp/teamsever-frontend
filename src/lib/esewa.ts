/**
 * eSewa Payment Integration - Frontend Utilities
 */

export interface EsewaPaymentRequest {
  amount: number;
  tax_amount: number;
  product_service_charge: number;
  product_delivery_charge: number;
  total_amount: number;
  transaction_uuid: string;
  product_code: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface PaymentInitiateResponse {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    transactionUuid: string;
    paymentRequest: EsewaPaymentRequest;
    paymentUrl: string;
    plan: {
      id: string;
      name: string;
      price: number;
    };
  };
}

/**
 * Submit payment form to eSewa
 * Creates a hidden form and auto-submits it
 */
export const submitEsewaPayment = (
  paymentUrl: string,
  paymentRequest: EsewaPaymentRequest
): void => {
  // Create form element
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;
  form.style.display = 'none';

  // Add all payment parameters as hidden inputs
  Object.entries(paymentRequest).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  // Append form to body and submit
  document.body.appendChild(form);
  form.submit();
};

/**
 * Decode eSewa payment data from URL
 */
export const decodeEsewaData = (encodedData: string): any => {
  try {
    const decodedString = atob(encodedData);
    return JSON.parse(decodedString);
  } catch (error) {
    console.error('Failed to decode eSewa data:', error);
    return null;
  }
};
