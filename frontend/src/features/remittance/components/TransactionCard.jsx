import { t } from '../../../i18n/translate.js';
import { Clock, ArrowDownCircle } from 'lucide-react';
import { formatAmount, formatDate } from '../../../utils/formatters';
import { EXCHANGE_PROVIDERS, getWalletName } from '../../../data/providers';

export default function TransactionCard({ transaction, compact = false }) {
  const provider = EXCHANGE_PROVIDERS.find((item) => item.id === transaction.provider);
  const destination = transaction.destination;
  const complete = transaction.status === 'DEMO_COMPLETED';
  return <article className="glass-card animate-fade-in-up" style={{ padding: 18, border: '1px solid rgba(108,99,255,0.12)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ArrowDownCircle size={24} color="var(--accent)" />
        <div><p style={{ fontSize: 14, fontWeight: 700 }}>{transaction.senderName}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{transaction.referenceNumber}</p></div>
      </div>
      <div style={{ textAlign: "end" }}><p style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{formatAmount(transaction.netAmount)}</p>
        <span className={`badge ${complete ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>{complete ? t("مكتملة — تجريبي") : t(transaction.status)}</span></div>
    </div>
    {!compact && <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[
        [t("رقم العملية"), transaction.id], [t("شركة التحويل"), provider?.nameEn || transaction.provider],
        [t("البلد المرسل"), transaction.senderCountry], [t("المبلغ الأصلي"), formatAmount(transaction.amount, transaction.currency)],
        [t("المبلغ بالدينار"), formatAmount(transaction.amountJOD)], [t("الرسوم"), formatAmount(transaction.fee)],
        [t("الصافي"), formatAmount(transaction.netAmount)],
        [t("الوجهة"), t(destination?.type === 'bank' ? destination.bankName : getWalletName(destination?.walletId, destination?.walletName))],
        [t("الحساب / الهاتف"), destination?.iban || destination?.walletPhone],
      ].map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>{t(label)}</span><span dir="auto" style={{ overflowWrap: 'anywhere', textAlign: "end" }}>{value || '—'}</span>
      </div>)}
    </div>}
    <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
      <Clock size={12} />{formatDate(transaction.confirmedAt)}
    </p>
  </article>;
}
