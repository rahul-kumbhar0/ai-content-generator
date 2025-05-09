// utils/razorpay.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { RAZORPAY_KEY_ID, RAZORPAY_SECRET_KEY, logEnvironmentStatus } from './env';

// Initialize Razorpay instance with API keys
export const getRazorpayInstance = () => {
  // Log environment status for debugging
  logEnvironmentStatus();
  
  // Use our environment utility for consistent access to variables
  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_SECRET_KEY,
  });
};

// Create a Razorpay order
export const createRazorpayOrder = async (amount: number, currency: string = 'INR', receipt: string) => {
  try {
    const razorpay = getRazorpayInstance();
    const options = {
      amount: amount * 100, // Razorpay expects amount in smallest currency unit (paise for INR)
      currency,
      receipt,
    };
    
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

// Verify Razorpay payment signature
export const verifyRazorpayPayment = (orderId: string, paymentId: string, signature: string) => {
  console.log('Verifying signature for order:', orderId);
  
  // Create the string to be used for signature verification
  const body = orderId + "|" + paymentId;
  
  try {
    // Verify the signature using our env utility
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_SECRET_KEY)
      .update(body)
      .digest("hex");
    
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', signature);
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    // For testing purposes, return true in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Warning: Bypassing signature check in development mode');
      return true;
    }
    return false;
  }
};
