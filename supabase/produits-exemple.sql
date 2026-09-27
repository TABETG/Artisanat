-- FACULTATIF : ajoute 6 produits d'exemple avec photos pour voir la boutique remplie.
-- Supprimez-les ensuite depuis l'espace vendeur quand vous ajoutez vos vraies créations.
insert into public.products (name, category, price_cents, stock, width_cm, length_cm, material, origin, featured, images, description) values
('Tapis Azilal aux losanges', 'tapis', 89000, 1, 160, 240, 'Laine de mouton', 'Moyen Atlas', true,
  array['/exemples/tapis-azilal-1.jpg','/exemples/tapis-azilal-2.jpg'],
  'Fond de laine écrue, losanges tracés à main levée en rouge garance, safran et indigo. Nœuds serrés, franges d’origine.'),
('Tapis Beni Ouarain', 'tapis', 124000, 1, 200, 300, 'Laine de mouton', 'Moyen Atlas', true,
  array['/exemples/tapis-beni-ouarain-1.jpg','/exemples/tapis-beni-ouarain-2.jpg'],
  'Laine épaisse et moelleuse, lignes brunes naturelles non teintes.'),
('Kilim Zanafi', 'tapis', 42000, 2, 120, 180, 'Laine de mouton', 'Haut Atlas', true,
  array['/exemples/kilim-zanafi-1.jpg','/exemples/kilim-zanafi-2.jpg'],
  'Tissage plat réversible, bandes indigo et triangles.'),
('Coussin en laine tissée', 'coussins', 6500, 6, 45, 45, 'Laine de mouton', 'Atelier', true,
  array['/exemples/coussin-laine-1.jpg','/exemples/coussin-laine-2.jpg'],
  'Face tissée à la main, dos en coton épais. Garnissage plume fourni.'),
('Plaid Hanbel rayé', 'plaids', 18000, 3, 130, 190, 'Laine de mouton', 'Atelier', false,
  array['/exemples/plaid-hanbel-1.jpg','/exemples/plaid-hanbel-2.jpg'],
  'Couverture de laine à rayures fines, pour le canapé ou le pied de lit.'),
('Petit tapis Boucherouite', 'tapis', 29000, 0, 90, 150, 'Laine et coton recyclé', 'Atelier', false,
  array['/exemples/tapis-boucherouite-1.jpg','/exemples/tapis-boucherouite-2.jpg'],
  'Tissé à partir de chutes de laine et de tissus colorés.');
