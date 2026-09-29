-- FACULTATIF : ajoute 6 produits d'exemple avec photos pour voir la boutique remplie.
-- Supprimez-les ensuite depuis l'espace vendeur quand vous ajoutez vos vraies créations.
insert into public.products
  (name, reference, category, price_cents, compare_at_price_cents, stock, width_cm, length_cm, pile_height_mm, weight_kg,
   technique, material, origin, colors, made_to_order, featured, images, description) values
('Tapis Azilal aux losanges', 'TAP-AZI-001', 'tapis', 89000, null, 1, 160, 240, 15, 9, 'Noué main', 'Laine de mouton', 'Moyen Atlas',
  array['ecru','rouge','jaune'], true, true, array['/exemples/tapis-azilal-1.jpg','/exemples/tapis-azilal-2.jpg'],
  'Fond de laine écrue, losanges tracés à main levée en rouge garance, safran et indigo. Nœuds serrés, franges d’origine.'),
('Tapis Beni Ouarain', 'TAP-BEN-002', 'tapis', 124000, 145000, 1, 200, 300, 30, 16, 'Noué main', 'Laine de mouton', 'Moyen Atlas',
  array['ecru','brun'], true, true, array['/exemples/tapis-beni-ouarain-1.jpg','/exemples/tapis-beni-ouarain-2.jpg'],
  'Laine épaisse et moelleuse, lignes brunes naturelles non teintes.'),
('Kilim Zanafi', 'KIL-ZAN-003', 'tapis', 42000, null, 2, 120, 180, 5, 3.5, 'Tissage plat (kilim)', 'Laine de mouton', 'Haut Atlas',
  array['bleu','rouge','ecru','jaune'], false, true, array['/exemples/kilim-zanafi-1.jpg','/exemples/kilim-zanafi-2.jpg'],
  'Tissage plat réversible, bandes indigo et triangles.'),
('Coussin en laine tissée', 'COU-LAI-004', 'coussins', 6500, 8000, 6, 45, 45, null, null, 'Tissé main', 'Laine de mouton', 'Atelier',
  array['rouge','jaune'], false, true, array['/exemples/coussin-laine-1.jpg','/exemples/coussin-laine-2.jpg'],
  'Face tissée à la main, dos en coton épais. Garnissage plume fourni.'),
('Plaid Hanbel rayé', 'PLA-HAN-005', 'plaids', 18000, null, 3, 130, 190, null, 2, 'Tissé main', 'Laine de mouton', 'Atelier',
  array['noir','rouge','jaune','ecru'], false, false, array['/exemples/plaid-hanbel-1.jpg','/exemples/plaid-hanbel-2.jpg'],
  'Couverture de laine à rayures fines, pour le canapé ou le pied de lit.'),
('Petit tapis Boucherouite', 'TAP-BOU-006', 'tapis', 29000, null, 0, 90, 150, 20, null, 'Noué main', 'Laine et coton recyclé', 'Atelier',
  array['multicolore','rose'], false, false, array['/exemples/tapis-boucherouite-1.jpg','/exemples/tapis-boucherouite-2.jpg'],
  'Tissé à partir de chutes de laine et de tissus colorés.');

-- Bijoux et beauté traditionnelle (exemples)
insert into public.products (name, category, price_cents, stock, technique, material, origin, featured, images, description, metal, stones, jewelry_size, nickel_free, colors) values
('Collier kabyle argent et corail', 'bijoux', 18500, 2, 'Émail cloisonné', 'Perles de corail', 'Kabylie', true,
  array['/exemples/collier-kabyle-1.jpg','/exemples/collier-kabyle-2.jpg'], 'Disques ciselés, perles de corail et pendentif émaillé.', 'Métal argenté', 'Corail, émail', 'Longueur 46 cm', true, array['rouge','vert']),
('Boucles d’oreilles berbères émaillées', 'bijoux', 6500, 5, 'Émail cloisonné', '', 'Aurès', false,
  array['/exemples/boucles-berberes-1.jpg','/exemples/boucles-berberes-2.jpg'], 'Pendants losanges émaillés et pampilles.', 'Laiton argenté', 'Émail bleu', 'Hauteur 7 cm', true, array['bleu','rouge']);
-- Les cosmétiques d'exemple ne sont volontairement pas insérés : ils exigent une notification CPNP réelle avant mise en vente.
