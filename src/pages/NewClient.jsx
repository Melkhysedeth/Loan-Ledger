import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../db/db'

const empty = { name: '', phone: '', cedula: '', address: '', notes: '' }

export default function NewClient() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditing = !!id
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEditing) {
      db.clients.get(Number(id)).then(c => { if (c) setForm(c) })
    }
  }, [id])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit() {
    if (!form.name || !form.phone) {
      alert('Nombre y teléfono son obligatorios.')
      return
    }
    setSaving(true)
    if (isEditing) {
      await db.clients.update(Number(id), form)
      navigate('/clients')
    } else {
      const newId = await db.clients.add({ ...form, createdAt: new Date().toISOString(), status: 'active' })
      const fromLoan = searchParams.get('from') === 'loan'
      navigate(fromLoan ? `/new-loan?clientId=${newId}` : '/clients')
    }
    setSaving(false)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-blue-500 text-lg">←</button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h1>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm mb-4 space-y-3">
        <Field label="Nombre completo *" name="name" value={form.name} onChange={handleChange} placeholder="Ej: Juan Pérez" />
        <Field label="Teléfono *" name="phone" value={form.phone} onChange={handleChange} placeholder="Ej: 3001234567" type="tel" />
        <Field label="Cédula" name="cedula" value={form.cedula} onChange={handleChange} placeholder="Ej: 1234567890" />
        <Field label="Dirección" name="address" value={form.address} onChange={handleChange} placeholder="Ej: Cra 5 #10-20" />
        <Field label="Notas" name="notes" value={form.notes} onChange={handleChange} placeholder="Observaciones..." textarea />
      </section>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-2xl shadow active:scale-95 transition disabled:opacity-50"
      >
        {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
      </button>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder, type = 'text', textarea }) {
  const cls = "w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  return (
    <div>
      <label className="text-sm text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
      {textarea
        ? <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} className={cls} rows={2} />
        : <input name={name} value={value} onChange={onChange} placeholder={placeholder} type={type} className={cls} />
      }
    </div>
  )
}