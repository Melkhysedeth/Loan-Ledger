import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../db/supabase'
import { useFormPersist } from '../hooks/useFormPersist'
import {
  ChevronLeft, User, IdCard, MapPin, FileText, Info, ArrowRight, Save,
} from 'lucide-react'

const empty = { name: '', phone: '', cedula: '', address: '', notes: '' }

export default function NewClient() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = !!id
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Persistir solo cuando es creación nueva, no edición
  // (edición siempre carga desde Supabase así que no necesita persistencia)
  const { clearPersisted } = useFormPersist(
    'new-client-form',
    form,
    setForm,
    { empty, exclude: [] }
  )

  useEffect(() => {
    if (isEditing) {
      // En edición: limpiar cualquier borrador guardado y cargar desde BD
      clearPersisted()
      supabase.from('clients').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) setForm(data) })
    }
  }, [id])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit() {
    if (!form.name || !form.phone) {
      setError('Nombre y teléfono son obligatorios.')
      return
    }
    setError('')
    setSaving(true)

    if (isEditing) {
      const { error } = await supabase.from('clients').update({
        name: form.name,
        phone: form.phone,
        cedula: form.cedula,
        address: form.address,
        notes: form.notes,
      }).eq('id', id)

      setSaving(false)
      if (error) { setError(error.message); return }
      navigate('/clients')
    } else {
      const { data, error } = await supabase.from('clients').insert({
        name: form.name,
        phone: form.phone,
        cedula: form.cedula,
        address: form.address,
        notes: form.notes,
        status: 'active',
      }).select().single()

      setSaving(false)
      if (error) { setError(error.message); return }

      // Limpiar borrador guardado al guardar con éxito
      clearPersisted()

      const fromLoan = searchParams.get('from') === 'loan'
      navigate(fromLoan ? `/new-loan?clientId=${data.id}` : '/clients')
    }
  }

  return (
    <div className="p-4 pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate(-1)} className="text-blue-500 dark:text-blue-400">
          <ChevronLeft size={26} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
          </h1>
          <p className="text-sm text-gray-400">
            {isEditing ? 'Actualiza la información del cliente' : 'Completa la información del cliente'}
          </p>
        </div>
      </div>

      {/* Card: Información personal */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mt-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <User size={18} className="text-blue-500" />
          </div>
          <h2 className="font-bold text-gray-800 dark:text-gray-100">Información personal</h2>
        </div>

        <Field
          label="Nombre completo *"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ej: Juan Pérez"
          Icon={User}
          autoCapitalize="words"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Teléfono *"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Ej: 3001234567"
            type="tel"
            Icon={IdCard}
          />
          <Field
            label="Cédula"
            name="cedula"
            value={form.cedula}
            onChange={handleChange}
            placeholder="Ej: 1234567890"
            Icon={IdCard}
          />
        </div>
      </section>

      {/* Card: Información adicional */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm mt-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <MapPin size={18} className="text-blue-500" />
          </div>
          <h2 className="font-bold text-gray-800 dark:text-gray-100">Información adicional</h2>
        </div>

        <Field
          label="Dirección"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Ej: Cra 5 #10-20"
          Icon={MapPin}
        />

        <Field
          label="Notas"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observaciones..."
          Icon={FileText}
          textarea
        />
      </section>

      {/* Info box */}
      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 rounded-2xl p-4 flex gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <Info size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Importante</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-300/70 mt-0.5">
            Asegúrate de verificar que la información sea correcta. Esta información será utilizada para la gestión de préstamos.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-2xl shadow mt-5 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
      >
        {saving
          ? 'Guardando...'
          : isEditing
            ? <>Guardar cambios <Save size={18} /></>
            : <>Crear cliente <ArrowRight size={18} /></>
        }
      </button>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder, type = 'text', Icon, textarea, autoCapitalize }) {
  const baseCls = "w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl pl-10 pr-3 py-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"

  return (
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-300 mb-1.5 block font-medium">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        )}
        {textarea
          ? <textarea name={name} value={value || ''} onChange={onChange} placeholder={placeholder} className={`${baseCls} resize-none`} rows={3} />
          : <input name={name} value={value || ''} onChange={onChange} placeholder={placeholder} type={type} autoCapitalize={autoCapitalize} className={baseCls} />
        }
      </div>
    </div>
  )
}