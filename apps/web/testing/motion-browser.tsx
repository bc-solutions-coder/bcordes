import { createRoot } from 'react-dom/client'
import { FadeInView } from '../src/shared/motion'
import '../src/app/styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Motion fixture root is missing')
createRoot(root).render(
  <>
    <style>{'.caller-presentation { color: rgb(12, 34, 56); }'}</style>
    <h1>Reveal behavior</h1>
    <div style={{ height: '120vh' }} />
    <section id="reveal">
      <FadeInView threshold={0.5} delay={300} className="caller-presentation">
        <p style={{ height: 200 }}>Reveal target</p>
      </FadeInView>
    </section>
    <div style={{ height: '200vh' }} />
  </>,
)
