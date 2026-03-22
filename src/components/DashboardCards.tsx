import { Users, Banknote, Package } from "lucide-react";

interface DashboardCardsProps {
  totalClients: number;
  totalDebt: number;
  totalUnpaidPieces: number;
}

export function DashboardCards({ totalClients, totalDebt, totalUnpaidPieces }: DashboardCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Total clienți</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{totalClients}</p>
      </div>
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg debt-bg flex items-center justify-center">
            <Banknote className="w-5 h-5 debt-text" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Bani neachitați</span>
        </div>
        <p className="text-2xl font-bold debt-text">{totalDebt.toLocaleString("ro-RO")} lei</p>
      </div>
      <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg debt-bg flex items-center justify-center">
            <Package className="w-5 h-5 debt-text" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">Bucăți neachitate</span>
        </div>
        <p className="text-2xl font-bold debt-text">{totalUnpaidPieces}</p>
      </div>
    </div>
  );
}
