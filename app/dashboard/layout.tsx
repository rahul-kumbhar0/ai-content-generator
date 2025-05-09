// app/dashboard/layout.tsx
'use client'
import React, { useState } from 'react'
import SideNav from './_components/SideNav';
import { TotalUsageContext } from '../(context)/TotalUsageContext';

function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [totalUsage, setTotalUsage] = useState<number>(0);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [isCreditsAvailable, setIsCreditsAvailable] = useState<boolean>(true);
  const [maxCredits, setMaxCredits] = useState<number>(500000);

  return (
    <TotalUsageContext.Provider value={{ 
      totalUsage, 
      setTotalUsage, 
      userPlan, 
      setUserPlan,
      isCreditsAvailable,
      setIsCreditsAvailable,
      maxCredits,
      setMaxCredits
    }}>
      <div className='bg-slate-100 min-h-screen' suppressHydrationWarning>
        <div className='md:w-64 hidden md:block fixed h-full'>
          <SideNav />
        </div>
        <div className='md:ml-64'>
          {children}
        </div>
      </div>
    </TotalUsageContext.Provider>
  )
}

export default DashboardLayout