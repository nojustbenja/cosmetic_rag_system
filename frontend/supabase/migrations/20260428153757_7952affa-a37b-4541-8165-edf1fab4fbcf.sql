
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

INSERT INTO public.products (name, brand, category, price, description, image_url, stock, tags) VALUES
('Auriculares Aero Pro', 'Sonix', 'Electrónica', 249.00, 'Auriculares inalámbricos con cancelación activa de ruido y 30h de batería.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', 24, ARRAY['audio','viaje','trabajo']),
('Smartwatch Pulse 7', 'Nordik', 'Electrónica', 329.00, 'Reloj inteligente con GPS, monitor cardíaco y resistencia al agua.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', 18, ARRAY['fitness','salud','deporte']),
('Laptop Stratus 14', 'Vexa', 'Electrónica', 1299.00, 'Ultrabook 14" con 16GB RAM, 512GB SSD, ideal para creadores.', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80', 9, ARRAY['trabajo','portátil','creador']),
('Cámara Mirrorless Lyra', 'Atlas', 'Electrónica', 899.00, 'Cámara compacta 24MP con video 4K y estabilización óptica.', 'https://images.unsplash.com/photo-1519183071298-a2962be96fc4?w=800&q=80', 12, ARRAY['fotografía','viaje']),
('Chaqueta Térmica Nordica', 'Fjeld', 'Moda', 189.00, 'Chaqueta ultraligera resistente al viento, ideal para invierno.', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&q=80', 30, ARRAY['invierno','outdoor','abrigo']),
('Zapatillas Trail Runner', 'Kade', 'Deporte', 159.00, 'Zapatillas con grip avanzado y amortiguación para trail running.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 40, ARRAY['running','outdoor','deporte']),
('Mochila Urbana 22L', 'Onyx', 'Moda', 119.00, 'Mochila minimalista con compartimento para portátil hasta 15".', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 35, ARRAY['urbano','viaje','trabajo']),
('Lentes de Sol Solstice', 'Halo', 'Moda', 89.00, 'Lentes polarizados con montura ligera y protección UV400.', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 50, ARRAY['verano','accesorio']),
('Cafetera Espresso Brio', 'Vello', 'Hogar', 449.00, 'Máquina espresso semiautomática con vaporizador profesional.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', 14, ARRAY['café','cocina']),
('Lámpara Ambient Glow', 'Lumen', 'Hogar', 79.00, 'Lámpara LED de mesa con 16M de colores y control por app.', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80', 60, ARRAY['decoración','iluminación']),
('Yoga Mat Premium', 'Zen', 'Deporte', 65.00, 'Mat antideslizante de 6mm con correa de transporte.', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80', 80, ARRAY['yoga','fitness']),
('Bicicleta Urbana Vento', 'Ciclo', 'Deporte', 749.00, 'Bicicleta híbrida ligera ideal para ciudad y paseos largos.', 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&q=80', 7, ARRAY['ciclismo','urbano','outdoor']);
