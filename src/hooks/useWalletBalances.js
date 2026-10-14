import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../db/supabase'
import { walletBalances } from '../utils/accounting'

// Trae solo las columnas necesarias y calcula el saldo de cada billetera.
// `excludeLoanId`: calcula el saldo como si ese préstamo no existiera (para editar su desembolso
// sin que el dinero que ya salió de ese préstamo cuente como "gastado").
async function fetchBalances(excludeLoanId) {
    const [inj, pay, lns, dis, wd] = await Promise.all([
        supabase.from('capital_injections').select('amount, date, payment_method'),
        supabase.from('payments').select('loan_id, date, total_paid, capital_paid, payment_method, method_breakdown, voided'),
        supabase.from('loans').select('id, amount, status, start_date, is_unification, payment_method, initial_capital_paid'),
        supabase.from('loan_disbursements').select('loan_id, payment_method, amount'),
        supabase.from('capital_withdrawals').select('amount, date, payment_method'),
    ])
    if ([inj, pay, lns, dis, wd].some(r => r.error)) return null

    return walletBalances({
        injections: inj.data,
        payments: pay.data,
        loans: lns.data.filter(l => l.id !== excludeLoanId),
        disbursements: dis.data.filter(d => d.loan_id !== excludeLoanId),
        withdrawals: wd.data,
    })
}

// `refresh()` vuelve a calcular y devuelve los saldos (útil para validar justo antes de guardar).
export function useWalletBalances(enabled = true, excludeLoanId = null) {
    const [balances, setBalances] = useState(null)

    const refresh = useCallback(async () => {
        const result = await fetchBalances(excludeLoanId)
        if (result) setBalances(result)
        return result
    }, [excludeLoanId])

    useEffect(() => {
        if (!enabled) return
        let cancelled = false
        fetchBalances(excludeLoanId).then(result => { if (!cancelled && result) setBalances(result) })
        return () => { cancelled = true }
    }, [enabled, excludeLoanId])

    return { balances, refresh }
}
