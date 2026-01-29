import { useState, useEffect } from 'react'

export function useScrollSpy(sectionIds: string[], offset: number = 100) {
  const [activeSection, setActiveSection] = useState<string>(sectionIds[0] || '')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + offset

      // Find the section that is currently in view
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const sectionId = sectionIds[i]
        const element = document.getElementById(sectionId.replace('#', ''))
        
        if (element) {
          const { offsetTop } = element
          
          if (scrollPosition >= offsetTop) {
            setActiveSection(sectionId)
            return
          }
        }
      }
      
      // Default to first section if at top
      setActiveSection(sectionIds[0] || '')
    }

    handleScroll() // Initial check
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sectionIds, offset])

  return activeSection
}
