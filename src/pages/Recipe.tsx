import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { RECIPES } from '../data/content'
import { guideOffer, toggleDone, track, useStore } from '../lib/store'
import { Layout, OfferCta, Picture } from '../components/ui'

export function Recipe() {
  const { id } = useParams()
  const s = useStore()
  const recipe = RECIPES.find((r) => r.id === id)

  useEffect(() => {
    if (recipe) track('receita_aberta', { recipe: recipe.id })
  }, [recipe])

  if (!recipe) return <Navigate to="/" replace />
  const done = !!s.done[recipe.id]
  const offer = guideOffer(s)

  return (
    <Layout title="Receita" back="/">
      <article className="recipe">
        <Picture id={recipe.image} className="hero" />
        <h1>{recipe.title}</h1>
        <p className="lead">{recipe.summary}</p>
        <div className="meta">
          <span>⏱ {recipe.time}</span>
          <span>🍞 {recipe.yield}</span>
        </div>

        <h2>Ingredientes</h2>
        <ul className="ingredients">
          {recipe.ingredients.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>

        <h2>Modo de preparo</h2>
        <ol className="steps">
          {recipe.steps.map((st) => (
            <li key={st}>{st}</li>
          ))}
        </ol>

        <button className={done ? 'btn btn-done btn-block' : 'btn btn-primary btn-block'} onClick={() => toggleDone(recipe.id)}>
          {done ? '✓ Você já fez essa receita' : 'Fiz essa receita!'}
        </button>
      </article>

      {offer && <OfferCta product={offer} source="receita" text={recipe.nextStep} />}
    </Layout>
  )
}
