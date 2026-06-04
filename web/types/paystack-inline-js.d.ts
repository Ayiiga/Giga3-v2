declare module "@paystack/inline-js" {
  export interface PaystackInlineTransaction {
    reference: string;
    message?: string;
    id?: number;
  }

  export interface PaystackInlineCallbacks {
    onSuccess?: (transaction: PaystackInlineTransaction) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
    onLoad?: (response: { accessCode?: string }) => void;
  }

  export interface PaystackNewTransactionOptions extends PaystackInlineCallbacks {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
  }

  export default class PaystackPop {
    newTransaction(options: PaystackNewTransactionOptions): unknown;
    resumeTransaction(
      accessCode: string,
      callbacks?: PaystackInlineCallbacks
    ): unknown;
  }
}
