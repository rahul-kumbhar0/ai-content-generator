'use client'
import { Button } from "@/components/ui/button"
import { useUser } from "@clerk/nextjs"
import { useToast } from "@/components/ui/use-toast"
import { useContext, useEffect, useState } from "react"
import { TotalUsageContext } from "@/app/(context)/TotalUsageContext"
import { NEXT_PUBLIC_RAZORPAY_KEY_ID } from "@/utils/env"

// Conversion rate from USD to INR (approximate)
const USD_TO_INR_RATE = 75;

const pricingPlans = [
    {
        name: 'Basic Plan',
        credits: "50,000",
        priceUSD: 9.99,
        priceINR: Math.round(9.99 * USD_TO_INR_RATE),
        features: [
            '50,000 Credits',
            'Basic Support',
            'Standard Response Time',
            'Basic Analytics'
        ]
    },
    {
        name: 'Pro Plan',
        credits: "500,000",
        priceUSD: 19.99,
        priceINR: Math.round(19.99 * USD_TO_INR_RATE),
        features: [
            '500,000 Credits',
            'Priority Support',
            'Faster Response Time',
            'Advanced Analytics',
            'Custom Templates'
        ]
    },
    {
        name: 'Enterprise Plan',
        credits: "1,000,000",
        priceUSD: 49.99,
        priceINR: Math.round(49.99 * USD_TO_INR_RATE),
        features: [
            '1,000,000 Credits',
            '24/7 Support',
            'Instant Response Time',
            'Full Analytics Suite',
            'Custom Integration',
            'Dedicated Account Manager'
        ]
    }
]

interface PricingPlansProps {
    onSuccess?: () => void;
}

export default function PricingPlans({ onSuccess }: PricingPlansProps) {
    const { user } = useUser()
    const { toast } = useToast()
    const { setTotalUsage, setUserPlan } = useContext(TotalUsageContext)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
            setScriptLoaded(true);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Function to handle creating a Razorpay order
    const createRazorpayOrder = async (plan: typeof pricingPlans[0]) => {
        try {
            // Use the plan's INR price
            const amountInINR = plan.priceINR;
            
            const response = await fetch('/api/billing/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user?.id,
                    action: 'create_order',
                    amount: amountInINR
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create order');
            }

            const orderData = await response.json();
            return orderData;
        } catch (error) {
            console.error('Error creating order:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to initiate payment. Please try again.",
            });
            return null;
        }
    };

    // Handle payment success
    const handlePaymentSuccess = async (paymentDetails: any, plan: typeof pricingPlans[0]) => {
        try {
            // Debug the plan data
            console.log('Payment successful for plan:', plan);
            console.log('Plan credits:', plan.credits);
            console.log('Plan credits type:', typeof plan.credits);
            
            const response = await fetch('/api/billing/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user?.id,
                    email: user?.primaryEmailAddress?.emailAddress,
                    planName: plan.name,
                    credits: plan.credits,
                    transactionId: paymentDetails.razorpay_payment_id,
                    amount: plan.priceINR,
                    action: 'verify_payment',
                    orderId: paymentDetails.razorpay_order_id,
                    paymentId: paymentDetails.razorpay_payment_id,
                    signature: paymentDetails.razorpay_signature
                }),
            })

            if (response.ok) {
                // Get the response data which includes the updated credits and plan
                const responseData = await response.json();
                console.log('Payment verification response:', responseData);
                
                // Update the TotalUsageContext with the new information
                setTotalUsage(0); // Reset usage since they just got new credits
                setUserPlan(plan.name);
                
                toast({
                    title: "Upgrade Successful!",
                    description: `You've successfully upgraded to ${plan.name} with ${plan.credits} credits!`,
                });
                
                // Force page refresh to show updated credits
                window.location.reload();
                
                onSuccess?.();
            } else {
                throw new Error('Failed to update plan')
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to process upgrade. Please contact support.",
            })
        }
    }

    // TypeScript interface for Razorpay
    interface RazorpayOptions {
        key: string;
        amount: number;
        currency: string;
        name: string;
        description: string;
        order_id: string;
        handler: (response: any) => void;
        prefill?: {
            name?: string;
            email?: string;
        };
        theme?: {
            color?: string;
        };
        modal?: {
            ondismiss?: () => void;
        };
    }

    // Extend Window interface
    interface WindowWithRazorpay extends Window {
        Razorpay?: any;
    }

    // Open Razorpay checkout when a plan is selected
    const handlePlanSelection = async (plan: typeof pricingPlans[0]) => {
        if (!scriptLoaded || !(window as WindowWithRazorpay).Razorpay) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Payment system is loading. Please try again in a moment.",
            });
            return;
        }

        const orderData = await createRazorpayOrder(plan);
        if (!orderData) return;

        // Get the INR price from the plan
        const amountInINR = plan.priceINR;

        const options = {
            key: NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: orderData.amount, // Amount in smallest currency unit (paise)
            currency: "INR",
            name: "AI Content Generator",
            description: `${plan.name} - ${plan.credits} Credits`,
            order_id: orderData.orderId,
            handler: function (response: any) {
                handlePaymentSuccess(response, plan);
            },
            prefill: {
                name: user?.fullName || '',
                email: user?.primaryEmailAddress?.emailAddress || '',
            },
            theme: {
                color: "#3399cc",
            },
            modal: {
                ondismiss: function () {
                    toast({
                        title: "Payment Cancelled",
                        description: "You cancelled the payment process.",
                    });
                },
            },
        };

        const razorpayInstance = new ((window as WindowWithRazorpay).Razorpay)(options as RazorpayOptions);
        razorpayInstance.open();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold text-center mb-8">
                Choose Your Plan
            </h1>

            <div className="grid md:grid-cols-3 gap-6">
                {pricingPlans.map((plan) => (
                    <div key={plan.name} className="border rounded-lg p-6 shadow-lg">
                        <h2 className="text-xl font-bold mb-4">{plan.name}</h2>
                        <p className="text-3xl font-bold mb-6">
                            ₹{plan.priceINR}
                            <span className="text-sm font-normal">/month</span>
                        </p>
                        <p className="text-sm text-gray-500 -mt-4 mb-2">
                            (${plan.priceUSD} USD)
                        </p>
                        <div className="mb-6">
                            <p className="text-lg font-semibold mb-2">Credits:</p>
                            <p className="text-2xl font-bold text-primary">
                                {plan.credits}
                            </p>
                        </div>
                        <ul className="mb-6 space-y-2">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-center text-sm">
                                    <svg
                                        className="w-4 h-4 mr-2 text-green-500"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        {user ? (
                            <Button 
                                className="w-full" 
                                onClick={() => handlePlanSelection(plan)}
                            >
                                Upgrade Now
                            </Button>
                        ) : (
                            <Button className="w-full" variant="outline">
                                Sign in to upgrade
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}