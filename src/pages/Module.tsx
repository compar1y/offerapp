import { Link, Navigate, useParams } from 'react-router-dom'
import { MODULES } from '../data/content'
import { owns, ownsGuide, useStore, type State } from '../lib/store'
import { Layout } from '../components/ui'

function canOpen(s: State, moduleId: string): boolean {
  if (moduleId === 'bonus') return owns(s, 'bump')
  if (moduleId === 'guia') return ownsGuide(s) === 'full'
  if (moduleId === 'essencial') return ownsGuide(s) !== null
  return false
}

export function Module() {
  const { id } = useParams()
  const s = useStore()
  const m = MODULES.find((x) => x.id === id)
  if (!m) return <Navigate to="/" replace />
  if (!canOpen(s, m.id)) return <Navigate to={`/oferta/${m.product}?de=cadeado`} replace />

  return (
    <Layout title={m.title} back="/">
      <h1>{m.title}</h1>
      <p className="lead">{m.subtitle}</p>
      <div className="list">
        {m.lessons.map((l, i) => (
          <Link key={l.id} to={`/modulo/${m.id}/${l.id}`} className="tile">
            <span className="num">{i + 1}</span>
            <span className="tile-body">
              <strong>{l.title}</strong>
            </span>
            <span className="chev">›</span>
          </Link>
        ))}
      </div>
    </Layout>
  )
}

export function Lesson() {
  const { id, lessonId } = useParams()
  const s = useStore()
  const m = MODULES.find((x) => x.id === id)
  const lesson = m?.lessons.find((l) => l.id === lessonId)
  if (!m || !lesson) return <Navigate to="/" replace />
  if (!canOpen(s, m.id)) return <Navigate to={`/oferta/${m.product}?de=cadeado`} replace />

  return (
    <Layout title={m.title} back={`/modulo/${m.id}`}>
      <article className="recipe">
        <h1>{lesson.title}</h1>
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </article>
    </Layout>
  )
}
