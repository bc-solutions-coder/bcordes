import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectFilter } from '../src/features/projects'
import '../src/app/styles.css'

function Filter() {
  const [tag, setTag] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  return (
    <ProjectFilter
      tags={['React', 'TypeScript']}
      years={[2025, 2024]}
      selectedTag={tag}
      selectedYear={year}
      onTagChange={setTag}
      onYearChange={setYear}
    />
  )
}
const root = document.getElementById('root')
if (!root) throw new Error('Project filter fixture root is missing')
createRoot(root).render(<Filter />)
