'use client'
import { Button } from '@/components/ui/button';
import { db } from '@/utils/db';
import { AiOutput } from '@/utils/schema';
import { useUser } from '@clerk/nextjs';
import React, { useContext, useEffect, useState } from 'react';
import { HISTORY } from '../history/page';
import { eq } from 'drizzle-orm';
import { TotalUsageContext } from '@/app/(context)/TotalUsageContext';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import PricingPlans from '../billing/_components/PricingPlans';
import { useToast } from "../../../hooks/use-toast";

function UsageTrack() {
  const { user } = useUser();
  const { toast } = useToast();
  const context = useContext(TotalUsageContext);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  if (!context) {
    throw new Error('UsageTrack must be used within a TotalUsageContext.Provider');
  }

  const { 
    totalUsage, 
    setTotalUsage, 
    userPlan: contextUserPlan, 
    setUserPlan: setUserPlanContext, 
    isCreditsAvailable, 
    setIsCreditsAvailable,
    maxCredits,
    setMaxCredits 
  } = context;

  useEffect(() => {
    if (user) {
      getData(user);
    }
  }, [user]);

  const getData = async (user: any) => {
    try {
      const result = await db.select().from(AiOutput)
        .where(eq(AiOutput.createdBy, user?.primaryEmailAddress?.emailAddress));
      
      // Check if the user has any records and get their plan/credits info
      if (result.length > 0) {
        const userRecord = result[0];
        console.log('User record found:', userRecord);
        
        // Get the user's plan and credits
        if (userRecord.plan) {
          setUserPlanContext(userRecord.plan);
          
          // Set the max credits based on the plan
          if (userRecord.credits) {
            setMaxCredits(userRecord.credits);
            console.log(`Setting max credits to ${userRecord.credits} based on plan ${userRecord.plan}`);
          }
        }
      }
      
      getTotalUsage(result);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch usage data.",
      });
    }
  };

  const getTotalUsage = (result: any[]) => {
    let total: number = 0;
    result.forEach(element => {
      // Safely handle null or undefined aiResponse
      const responseLength = element.aiResponse?.length || 0;
      total += Number(responseLength);
    });
    
    setTotalUsage(total);
    // Use the maxCredits from context instead of hardcoded 20000
    const creditLimit = context.maxCredits || 20000;
    setIsCreditsAvailable(total < creditLimit);
  };

  const handleUpgradeClick = () => {
    setIsUpgradeOpen(true);
  };

  // Safely get the max credits value
  const creditLimit = context.maxCredits || 500000;
  
  // Add this to fix hydration errors
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <div className='m-5' suppressHydrationWarning>
      <div className={`p-3 text-white rounded-lg ${
        totalUsage >= creditLimit ? 'bg-red-600' : 
        totalUsage >= (creditLimit * 0.75) ? 'bg-yellow-600' : 
        'bg-primary'
      }`}>
        <h2>Credits ({contextUserPlan || 'Free Plan'})</h2>
        {isClient ? (
          <>
            <div className='h-2 bg-[#9981f9] w-full rounded-full mt-3'>
              <div className='h-2 bg-white rounded-full'
                style={{
                  width: `${Math.min((totalUsage / creditLimit) * 100, 100)}%`
                }}>
              </div>
            </div>
            <h2 className='text-sm my-2'>{totalUsage}/{creditLimit.toLocaleString()} Credits used</h2>
            {totalUsage >= (creditLimit * 0.75) && (
              <p className='text-xs mt-1'>
                {totalUsage >= creditLimit ? 'Credits exhausted!' : 'Credits running low!'}
              </p>
            )}
          </>
        ) : (
          <div className='h-2 bg-[#9981f9] w-full rounded-full mt-3'>
            <div className='h-2 bg-white rounded-full' style={{ width: '0%' }}></div>
          </div>
        )}
      </div>

      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogTrigger asChild>
          <Button 
            variant={totalUsage >= creditLimit ? 'destructive' : 'secondary'}
            className='w-full my-3'
            onClick={handleUpgradeClick}
          >
            {totalUsage >= creditLimit ? 'Upgrade Now' : 'Upgrade'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[900px]">
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <PricingPlans onSuccess={() => setIsUpgradeOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UsageTrack;