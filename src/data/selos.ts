// Desenhos dos selos. Os 12 selos do GPT (WebP com transparência, 256x256, em public/selos/<arquivo>.webp) usam a imagem.
// Quem não tem arquivo (Receita de casa dourada, presente e variedade) e qualquer imagem que falhe ficam no SVG funcional (src/components/Seal.tsx).
// Nomes dos arquivos: ver SEAL_FILES em shared/game.ts.
import type { SealIcon } from '../../shared/game'

export const SEAL_IMAGES_READY: ReadonlySet<SealIcon> = new Set<SealIcon>(['aprendiz', 'fornada', 'confeiteira', 'mestra', 'receita', 'sequencia', 'desafio', 'socorro', 'encomenda', 'conta', 'contas', 'venda'])
