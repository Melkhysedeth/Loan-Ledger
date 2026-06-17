import { useRef, useState, useEffect, Children } from 'react'

export default function Carousel({ children }) {
    const trackRef = useRef(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const slides = Children.toArray(children)

    useEffect(() => {
        const track = trackRef.current
        if (!track) return

        let frame = null
        function handleScroll() {
            if (frame) return
            frame = requestAnimationFrame(() => {
                const slideWidth = track.clientWidth
                if (slideWidth > 0) {
                    const index = Math.round(track.scrollLeft / slideWidth)
                    setActiveIndex(prev => (prev !== index ? index : prev))
                }
                frame = null
            })
        }

        track.addEventListener('scroll', handleScroll, { passive: true })
        return () => track.removeEventListener('scroll', handleScroll)
    }, [])

    function goTo(index) {
        const track = trackRef.current
        if (!track) return
        track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
    }

    if (slides.length === 0) return null

    return (
        <div className="relative">
            <div
                ref={trackRef}
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-4 px-0 no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
            >
                {slides.map((slide, i) => (
                    <div key={i} className="snap-center shrink-0 w-full px-4 first:pl-4 last:pr-4">
                        {slide}
                    </div>
                ))}
            </div>

            {slides.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            aria-label={`Ir al slide ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all ${
                                i === activeIndex
                                    ? 'w-6 bg-blue-500'
                                    : 'w-1.5 bg-gray-300 dark:bg-gray-600'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}