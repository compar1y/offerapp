// Aulas em vídeo (entregável de quem tem o kit): 25 tutoriais curtos, verticais 9:16, sem rosto.
// Cada vídeo é referenciado SÓ pelo nome do arquivo. Sem YouTube e sem embed: o endereço sai de VITE_AULAS_VIDEO_BASE_URL + nome.
// Base vazia = os vídeos ainda não foram hospedados; a lista aparece e o player mostra um aviso amigável.

export const AULAS_VIDEO_BASE_URL: string = import.meta.env.VITE_AULAS_VIDEO_BASE_URL ?? ''
export const AULAS_ON: boolean = AULAS_VIDEO_BASE_URL.trim() !== ''
export const aulaVideoUrl = (file: string): string => `${AULAS_VIDEO_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(file)}`

export { AULAS, AULA_BY_FILE, MODULOS, durLabel, type Aula, type Modulo } from '../../shared/aulas'
