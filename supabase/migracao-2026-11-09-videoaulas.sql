-- Rodar UMA vez no SQL Editor do Supabase ANTES de vender as Videoaulas (banco que já existe).
-- Sem isto, a compra das Videoaulas chega pelo webhook mas o banco recusa gravar (produto fora da lista).
alter table compras drop constraint if exists compras_produto_check;
alter table compras add constraint compras_produto_check check (produto in ('kit','recheios','encomenda','primeira','videoaulas'));
