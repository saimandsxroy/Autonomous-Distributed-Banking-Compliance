import { useState } from "react";
import { TotalBalance } from "../components/dashboard/TotalBalance";
import { QuickTransfer } from "../components/dashboard/QuickTransfer";
import { RecentTransactions } from "../components/dashboard/RecentTransactions";

export function DashboardPage() {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <>
      <header className="mb-12">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
          Dashboard
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="md:col-span-2 lg:col-span-3">
          <TotalBalance isRevealed={isRevealed} setIsRevealed={setIsRevealed} />
        </div>

        <div className="md:col-span-1 lg:col-span-1">
          <QuickTransfer isRevealed={isRevealed} />
        </div>

        <div className="md:col-span-1 lg:col-span-2">
          <RecentTransactions isRevealed={isRevealed} />
        </div>
      </div>
    </>
  );
}

