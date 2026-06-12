import { useState, useEffect } from 'react'
import { Sun, Moon, Info, Download, LogOut, ChevronRight, Smartphone } from 'lucide-react'

const APP_VERSION = '1.0.0'

export default function More() {
    const [darkMode, setDarkMode] = useState(() => {
        return document.documentElement.classList.contains('dark')
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    return (
        <div className="px-4 pt-6 pb-24 space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Más</h1>
                <p className="text-sm text-gray-400 mt-0.5">Configuración y opciones</p>
            </div>

            {/* Apariencia */}
            <Section title="Apariencia">
                <RowToggle
                    Icon={darkMode ? Moon : Sun}
                    label={darkMode ? 'Modo oscuro' : 'Modo claro'}
                    sub="Cambia el tema de la app"
                    checked={darkMode}
                    onChange={() => setDarkMode(d => !d)}
                />
            </Section>

            {/* Información */}
            <Section title="Información">
                <RowInfo Icon={Smartphone} label="Versión de la app" value={APP_VERSION} />
                <RowInfo Icon={Info} label="Desarrollado por" value="LoanLedger" last />
            </Section>

            {/* Datos — futuro */}
            <Section title="Datos">
                <RowAction
                    Icon={Download}
                    label="Exportar datos"
                    sub="Próximamente"
                    disabled
                />
            </Section>

            {/* Cuenta — futuro Supabase */}
            <Section title="Cuenta">
                <RowAction
                    Icon={LogOut}
                    label="Cerrar sesión"
                    sub="Disponible al conectar Supabase"
                    disabled
                    danger
                />
            </Section>
        </div>
    )
}

// ── Componentes ────────────────────────────────────────────────

function Section({ title, children }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{title}</p>
            <div className="bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-700">
                {children}
            </div>
        </div>
    )
}

function RowToggle({ Icon, label, sub, checked, onChange }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100">{label}</p>
                {sub && <p className="text-xs text-gray-500">{sub}</p>}
            </div>
            <button
                onClick={onChange}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    )
}

function RowInfo({ Icon, label, value, last }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100">{label}</p>
            </div>
            <span className="text-sm text-gray-400">{value}</span>
        </div>
    )
}

function RowAction({ Icon, label, sub, disabled, danger }) {
    return (
        <button
            disabled={disabled}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition active:bg-gray-700 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-900/40' : 'bg-gray-700'}`}>
                <Icon size={15} className={danger ? 'text-red-400' : 'text-gray-300'} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-gray-100'}`}>{label}</p>
                {sub && <p className="text-xs text-gray-500">{sub}</p>}
            </div>
            {!disabled && <ChevronRight size={16} className="text-gray-600" />}
        </button>
    )
}