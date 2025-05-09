// utils/env.ts
// Helper to safely access environment variables with fallbacks

// Razorpay Keys
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_85BkwJA6PWgMDC';
export const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY || 'zt37Bx3wvGQnIaUlujCN6ixc';
export const NEXT_PUBLIC_RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_85BkwJA6PWgMDC';

// Function to log environment status (helpful for debugging)
export const logEnvironmentStatus = () => {
  console.log('=== Environment Variables Status ===');
  console.log('RAZORPAY_KEY_ID present:', !!process.env.RAZORPAY_KEY_ID);
  console.log('RAZORPAY_SECRET_KEY present:', !!process.env.RAZORPAY_SECRET_KEY);
  console.log('NEXT_PUBLIC_RAZORPAY_KEY_ID present:', !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('===================================');
};
