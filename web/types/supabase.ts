export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionPlan = "free" | "basic" | "pro" | "premium";
export type PaymentStatus = "pending" | "success" | "failed";
export type PaymentType = "subscription" | "credits";
export type MediaType = "image" | "video";
export type GenerationStatus = "pending" | "processing" | "succeeded" | "failed";
export type ChatRole = "user" | "assistant" | "system";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          name: string | null;
          avatar_url: string | null;
          credits: number;
          tokens: number;
          plan: string;
          tier: "free" | "premium";
          subscription_plan: SubscriptionPlan;
          subscription_expires_at: string | null;
          starter_credits_granted: boolean;
          interest_profile: Json | null;
          convex_user_id: string | null;
          user_role: string;
          onboarding_state: Json | null;
          user_preferences: Json | null;
          referral_code: string | null;
          learning_streak_days: number;
          onboarding_completed_at: string | null;
          last_active_date_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          credits?: number;
          tokens?: number;
          plan?: string;
          tier?: "free" | "premium";
          subscription_plan?: SubscriptionPlan;
          subscription_expires_at?: string | null;
          starter_credits_granted?: boolean;
          interest_profile?: Json | null;
          convex_user_id?: string | null;
          user_role?: string;
          onboarding_state?: Json | null;
          user_preferences?: Json | null;
          referral_code?: string | null;
          learning_streak_days?: number;
          onboarding_completed_at?: string | null;
          last_active_date_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          convex_conversation_id: string | null;
          title: string;
          mode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          convex_conversation_id?: string | null;
          title?: string;
          mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chats"]["Insert"]>;
      };
      chat_messages: {
        Row: {
          id: string;
          chat_id: string;
          convex_message_id: string | null;
          role: ChatRole;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          convex_message_id?: string | null;
          role: ChatRole;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          convex_job_id: string | null;
          media_type: MediaType;
          category: string;
          prompt: string;
          provider_prediction_id: string | null;
          status: GenerationStatus;
          output_url: string | null;
          credits_charged: number;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          convex_job_id?: string | null;
          media_type: MediaType;
          category: string;
          prompt: string;
          provider_prediction_id?: string | null;
          status?: GenerationStatus;
          output_url?: string | null;
          credits_charged?: number;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["generations"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          provider: "paystack" | "stripe";
          reference: string;
          product_id: string;
          type: PaymentType;
          amount_ghs: number | null;
          plan_id: SubscriptionPlan | null;
          credits_granted: number | null;
          status: PaymentStatus;
          provider_response: Json | null;
          convex_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: "paystack" | "stripe";
          reference: string;
          product_id: string;
          type: PaymentType;
          amount_ghs?: number | null;
          plan_id?: SubscriptionPlan | null;
          credits_granted?: number | null;
          status?: PaymentStatus;
          provider_response?: Json | null;
          convex_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      token_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reference: string;
          tokens: number;
          action: string | null;
          balance_after: number | null;
          metadata: Json | null;
          convex_transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reference: string;
          tokens: number;
          action?: string | null;
          balance_after?: number | null;
          metadata?: Json | null;
          convex_transaction_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["token_transactions"]["Insert"]>;
      };
    };
  };
}

