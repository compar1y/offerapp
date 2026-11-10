-- Rodar UMA vez no SQL Editor do Supabase (banco que já existe).
-- Hora em que o pagamento foi APROVADO: é dela que contam as 3 h do presente da primeira compra e do popup de 30%.
-- O webhook só preenche quando chega o aviso de PAGO (PIX gerado/pendente não preenche) e nunca muda depois.
-- Antes de rodar, o app continua funcionando e gravando as compras, mas não mostra nenhum desconto (sem hora de aprovação).
alter table compras add column if not exists pago_em timestamptz;
