// app/api/billing/upgrade/route.ts
import { db } from '@/utils/db';
import { AiOutput, PaymentHistory } from '@/utils/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/utils/razorpay';

export async function POST(req: Request) {
    try {
        console.log('API Route: Received request to /api/billing/upgrade');
        
        const body = await req.json();
        console.log('Request body:', JSON.stringify(body));
        
        const {
            userId,
            email,
            planName,
            credits,
            amount,
            action
        } = body;

        // Create Razorpay order
        if (action === 'create_order') {
            console.log('Creating Razorpay order for amount:', amount);
            // Generate a shorter receipt ID (under 40 chars)
            const timestamp = Date.now().toString().substring(6); // Only use last 7 digits of timestamp
            const shortUserId = userId ? userId.substring(0, 8) : 'anon'; // First 8 chars of userId or 'anon'
            const receipt = `rcpt_${shortUserId}_${timestamp}`;
            console.log('Receipt ID:', receipt, '(length:', receipt.length, ')');
            
            try {
                const order = await createRazorpayOrder(amount, 'INR', receipt);
                console.log('Order created successfully:', order);
                
                return NextResponse.json({ 
                    success: true, 
                    orderId: order.id,
                    amount: order.amount,
                    receipt: order.receipt,
                    currency: order.currency
                });
            } catch (orderError) {
                console.error('Error creating order:', orderError);
                return NextResponse.json({ 
                    success: false, 
                    message: 'Failed to create order',
                    error: String(orderError)
                }, { status: 500 });
            }
        }
        
        // Verify payment and update user's plan
        if (action === 'verify_payment') {
            const { orderId, paymentId, signature } = body;
            
            // Verify the payment signature
            const isValidPayment = verifyRazorpayPayment(orderId, paymentId, signature);
            
            if (!isValidPayment) {
                return NextResponse.json(
                    { success: false, message: 'Invalid payment signature' },
                    { status: 400 }
                );
            }
            
            // Ensure we're getting the right credits from the plan
            console.log('Credits value received from frontend:', credits);
            console.log('Credits type:', typeof credits);
            
            // Convert credits string to integer by removing commas
            let newCreditsAsNumber = parseInt(credits?.replace(/,/g, '') || '0');
            
            // Make sure we're not using the default 20000
            if (newCreditsAsNumber === 0 || isNaN(newCreditsAsNumber)) {
                // If we somehow get a bad value, look at the plan name to determine credits
                if (planName === 'Basic Plan') {
                    newCreditsAsNumber = 50000;
                } else if (planName === 'Pro Plan') {
                    newCreditsAsNumber = 500000; // Updated to 500,000 for Pro Plan
                } else if (planName === 'Enterprise Plan') {
                    newCreditsAsNumber = 1000000; // Updated to 1,000,000 for Enterprise Plan
                } else {
                    newCreditsAsNumber = 500000; // Updated fallback to 500,000
                }
                console.log('Used plan name to determine credits:', newCreditsAsNumber);
            }
            
            console.log('Final plan credits amount to be used:', newCreditsAsNumber);
            
            // First, check if user exists in the database
            const existingUser = await db.select()
                .from(AiOutput)
                .where(eq(AiOutput.createdBy, email));
                
            if (existingUser && existingUser.length > 0) {
                console.log('Existing user found, updating credits');
                
                // Get the user's current credits from the database
                const currentCredits = existingUser[0].credits || 0;
                console.log('Current credits before update:', currentCredits);
                
                // Add the new credits to the existing balance instead of replacing them
                const totalCredits = currentCredits + newCreditsAsNumber;
                console.log('Adding new credits:', newCreditsAsNumber);
                console.log('New total credits after addition:', totalCredits);
                
                // Update existing user with the accumulated credits
                await db.update(AiOutput)
                    .set({
                        credits: totalCredits,
                        plan: planName,
                        lastPaymentDate: new Date(),
                    })
                    .where(eq(AiOutput.createdBy, email));
            } else {
                console.log('No existing user found, creating new record');
                // Create a new user record if it doesn't exist
                await db.insert(AiOutput).values({
                    formData: JSON.stringify({ planPurchase: true }),  // Required field
                    templateSlug: 'payment',  // Required field
                    createdBy: email,  // Required field
                    credits: newCreditsAsNumber,
                    plan: planName,
                    lastPaymentDate: new Date(),
                    createdAt: new Date().toISOString(),
                    paymentStatus: 'completed'
                });
            }
            
            // Record this payment in the payment history table
            try {
                await db.insert(PaymentHistory).values({
                    userId: userId,
                    transactionId: paymentId,  // Use the Razorpay payment ID
                    amount: amount.toString(),
                    planName: planName,
                    creditsAdded: newCreditsAsNumber,
                    createdAt: new Date()
                });
                console.log('Payment history recorded successfully');
            } catch (historyError) {
                console.error('Error recording payment history:', historyError);
                // Continue even if payment history recording fails
                // We don't want to fail the whole transaction if just the history recording fails
            }
            
            console.log(`Credits updated successfully to ${newCreditsAsNumber} for plan ${planName}`);

            return NextResponse.json({ 
                success: true, 
                message: 'Plan upgraded successfully',
                credits: newCreditsAsNumber,
                plan: planName
            });
        }

        return NextResponse.json(
            { success: false, message: 'Invalid action' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Upgrade error:', error);
        return NextResponse.json(
            { success: false, message: 'Error upgrading plan', error: String(error) },
            { status: 500 }
        );
    }
}