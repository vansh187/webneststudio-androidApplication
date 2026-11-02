declare module 'react-native-razorpay' {
  export type CheckoutOptions = {
    key: string;
    amount: number;
    currency: string;
    order_id: string;
    name: string;
    description: string;
    prefill?: { name?: string; email?: string; contact?: string };
    notes?: Record<string, string>;
    theme?: { color?: string };
  };

  export type CheckoutSuccess = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open: (options: CheckoutOptions) => Promise<CheckoutSuccess>;
  };
  export default RazorpayCheckout;
}
