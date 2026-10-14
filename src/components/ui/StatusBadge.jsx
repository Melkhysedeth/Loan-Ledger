import { getLoanStatus } from '../../constants/loanStatus'

export default function StatusBadge({ status, withDot = false }) {
    const cfg = getLoanStatus(status)
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
            {withDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
            {cfg.label}
        </span>
    )
}
