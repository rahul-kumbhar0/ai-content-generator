'use client'
import React, { createContext, useState } from 'react';

interface TotalUsageContextType {
    totalUsage: number;
    setTotalUsage: (value: number) => void;
    userPlan: string;
    setUserPlan: (value: string) => void;
    isCreditsAvailable: boolean;
    setIsCreditsAvailable: (value: boolean) => void;
    maxCredits: number;
    setMaxCredits: (value: number) => void;
}

const defaultValue: TotalUsageContextType = {
    totalUsage: 0,
    setTotalUsage: () => {},
    userPlan: 'free',
    setUserPlan: () => {},
    isCreditsAvailable: true,
    setIsCreditsAvailable: () => {},
    maxCredits: 500000,
    setMaxCredits: () => {},
};

export const TotalUsageContext = createContext<TotalUsageContextType>(defaultValue);

export const TotalUsageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [totalUsage, setTotalUsage] = useState<number>(0);
    const [userPlan, setUserPlan] = useState<string>('free');
    const [isCreditsAvailable, setIsCreditsAvailable] = useState<boolean>(true);
    const [maxCredits, setMaxCredits] = useState<number>(500000); // Default to 500000 for free plan

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
            {children}
        </TotalUsageContext.Provider>
    );
};