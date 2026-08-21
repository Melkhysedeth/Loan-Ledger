import { Leaf } from 'lucide-react'

export default function Fuxion() {
    return (
        <div className="px-4 pt-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: '#7e22ce' }}>
                <Leaf size={28} color="white" />
            </div>
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">Módulo Fuxion</h1>
            <p className="text-sm text-gray-400 mt-1">Lo construimos en el próximo paso 🚀</p>
        </div>
    )
}