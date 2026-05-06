DROP TABLE IF EXISTS produtos;

CREATE TABLE produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  marca TEXT NOT NULL,
  principio_ativo TEXT NOT NULL,
  descricao TEXT,
  url_imagem TEXT,
  link_compra TEXT
);

-- Mock Data (5 Produtos Reais/Fictícios baseados em ativos comuns)
INSERT INTO produtos (nome, marca, principio_ativo, descricao, url_imagem, link_compra) VALUES
('Sérum Niacinamida 10%', 'Principia', 'niacinamida', 'Sérum para redução de oleosidade e manchas superficiais.', 'https://via.placeholder.com/150?text=Sérum+Niacinamida', 'https://exemplo.com/comprar/niacinamida'),
('Gel de Limpeza Ácido Salicílico', 'CeraVe', 'ácido salicílico', 'Gel de limpeza para peles oleosas e com tendência à acne cosmética.', 'https://via.placeholder.com/150?text=Limpeza+Salicílico', 'https://exemplo.com/comprar/salicilico'),
('Hidratante Facial com Ácido Hialurônico', 'Sallve', 'ácido hialurônico', 'Hidratação profunda para todos os tipos de pele, melhorando a textura e linhas finas.', 'https://via.placeholder.com/150?text=Hidratante+Hialurônico', 'https://exemplo.com/comprar/hialuronico'),
('Sérum Vitamina C 20%', 'Mantecorp', 'vitamina c', 'Ação antioxidante que uniformiza o tom da pele e traz luminosidade.', 'https://via.placeholder.com/150?text=Vitamina+C', 'https://exemplo.com/comprar/vitamina-c'),
('Protetor Solar Toque Seco', 'La Roche-Posay', 'protetor solar', 'Proteção essencial para prevenir manchas e envelhecimento precoce.', 'https://via.placeholder.com/150?text=Protetor+Solar', 'https://exemplo.com/comprar/protetor');
