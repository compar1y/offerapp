// Salvar um arquivo no celular sem sair do app.
//   Android, iPhone no Safari e computador: link de download (o arquivo vai para Downloads/Arquivos e a tela continua).
//   iPhone com o app instalado na tela de início: o iOS não baixa dentro do app instalado, então abre o "Compartilhar"
//   (Salvar imagem / Salvar em Arquivos / WhatsApp).

/** iPhone/iPad com o app aberto pelo ícone da tela de início */
export function iosInstalado(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios && nav.standalone === true
}

export const podeCompartilhar = (f: File): boolean => typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [f] })

/** abre o Compartilhar do celular com o arquivo (precisa ser chamado direto no toque) */
export async function compartilhar(f: File): Promise<boolean> {
  try {
    await navigator.share({ files: [f], title: f.name })
    return true
  } catch {
    return false // ela fechou o compartilhar
  }
}

/** baixa pelo link, no mesmo endereço do app (sem aba nova) */
export function baixarPorLink(f: Blob, nome: string) {
  const url = URL.createObjectURL(f)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** o jeito certo para este aparelho; devolve como salvou */
export async function salvarNoCelular(f: File): Promise<'compartilhar' | 'link' | null> {
  if (iosInstalado()) {
    if (podeCompartilhar(f)) return (await compartilhar(f)) ? 'compartilhar' : null
    location.href = URL.createObjectURL(f) // iOS antigo: abre por cima, com o botão de compartilhar do próprio iPhone
    return 'link'
  }
  baixarPorLink(f, f.name)
  return 'link'
}
