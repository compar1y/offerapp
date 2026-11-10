import { DESCONTO } from '../../shared/desconto'

// Presente da primeira compra, SEM relógio e sem prazo: o link com desconto da Wiapy não expira,
// então nada aqui diz que o desconto acaba (Levi, 10/11: sem escassez falsa).

/** faixa do presente já ganho: onde ele vale ou, na oferta, o preço com desconto */
export function FaixaDesconto({ pct, texto, de, por }: { pct: number; texto?: string; de?: string; por?: string }) {
  return (
    <div className="faixa-desconto" role="status">
      <span className="fd-titulo">🎁 Seu presente da primeira compra</span>
      {por ? (
        <span className="fd-preco"><s>R${de}</s> por <b>R${por}</b></span>
      ) : (
        <span className="fd-texto">{texto ?? `${pct}% de presente em mais um material`}</span>
      )}
    </div>
  )
}

/** aviso antes da compra (ela ainda não fez a primeira compra de extra) */
export function AvisoPresente({ texto, compacto }: { texto: string; compacto?: boolean }) {
  return (
    <div className={`aviso-presente${compacto ? ' compacto' : ''}`}>
      <span className="ap-ico" aria-hidden="true">🎁</span>
      <span><b>Seu presente da primeira compra</b>{texto}</span>
    </div>
  )
}

/** barrinha fixa no topo da página de oferta: o desconto já vale aqui, ou comprando ela ganha */
export function BarraPresente({ ativo }: { ativo?: boolean }) {
  return (
    <div className="barra-presente" role="status">
      {ativo ? <>🎁 <b>{DESCONTO.pct}% de presente</b> aqui</> : <>🎁 Primeira compra: <b>{DESCONTO.pct}% de presente</b> em mais um</>}
    </div>
  )
}
