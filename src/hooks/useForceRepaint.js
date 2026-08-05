// Fix para bug de compositing en WebKit (PWA standalone iOS):
// tras un setState async, el DOM se actualiza pero el compositor a veces
// no repinta los tiles ya compuestos hasta que el usuario hace scroll real.
// Simulamos un scroll mínimo para forzar la recomposición de tiles.
export function forceTileRepaint() {
    const root = document.getElementById('root')
    requestAnimationFrame(() => {
        root.style.webkitTransform = 'translateZ(0.01px)'
        requestAnimationFrame(() => {
            root.style.webkitTransform = ''
        })
    })
}