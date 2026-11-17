-- Après avoir créé le compte du propriétaire dans
-- Supabase → Authentication → Users → Add user (email + mot de passe),
-- remplacer l'email ci-dessous puis exécuter :
insert into public.admins (user_id)
select id from auth.users where email = 'proprietaire@exemple.fr'
on conflict do nothing;
