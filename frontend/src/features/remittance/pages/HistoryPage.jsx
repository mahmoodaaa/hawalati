import { useNavigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import Header from "../../../components/layout/Header";
import BottomNav from "../../../components/layout/BottomNav";
import useRemittanceHistory from "../hooks/useRemittanceHistory";
import TransactionCard from "../components/TransactionCard";

export default function HistoryPage() {
  const navigate = useNavigate();
  const { transactions, loading, error, reload } = useRemittanceHistory();
  return <div className="bg-animated" style={{ minHeight: "100vh", paddingBottom: 80 }}>
    <Header title="سجل العمليات" />
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div><h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>سجل الحوالات</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>عمليات حسابك المحفوظة، حتى بعد إعادة فتح الصفحة</p></div>
        <button className="btn-secondary" style={{ width: "auto" }} onClick={reload} disabled={loading}>تحديث</button>
      </div>
      {loading ? <p role="status" className="glass-card" style={{ padding: 24, textAlign: "center" }}>جارٍ تحميل سجل العمليات…</p>
        : error ? <div role="alert" className="glass-card" style={{ padding: 24 }}><p style={{ color: "var(--danger)" }}>{error}</p>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={reload}>إعادة المحاولة</button></div>
          : transactions.length === 0 ? <div className="glass-card animate-fade-in-up" style={{ padding: 32, textAlign: "center" }}>
            <Inbox size={44} style={{ margin: "0 auto 16px", color: "var(--text-muted)" }} /><h3 style={{ marginBottom: 8 }}>لا توجد عمليات بعد</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>ستظهر هنا حوالاتك بعد إتمام الاستلام بنجاح.</p>
            <button id="btn-history-receive" className="btn-primary" style={{ marginTop: 20 }} onClick={() => navigate("/check-remittance")}>استلام حوالة</button>
          </div> : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} />)}</div>}
    </div>
    <BottomNav />
  </div>;
}
