-- Huisstijl-teksten voor standaardmails (Fluweel-stem).
insert into public.email_templates (slug, naam, onderwerp, inhoud) values
  ('bevestiging', 'Bevestiging ontvangst', 'We hebben je bericht · Fluweel',
   E'Beste {{naam}},\n\nDank je. Je aanvraag is binnen — we lezen hem met aandacht en nemen snel contact op.\n\nGeen standaardformat. Wel een herinnering die jouw merk vooruithelpt.'),
  ('followup', 'Follow-up gesprek', 'Vervolg op ons gesprek · Fluweel',
   E'Beste {{naam}},\n\nLeuk dat we hebben gesproken. We denken graag verder met je mee — tot in het detail.\n\nHeb je nog iets op je lijst? Mail of bel ons. We zijn er.'),
  ('offerte', 'Offerte', 'Je offerte van Fluweel',
   E'Beste {{naam}},\n\nHierbij onze offerte. Geen copy-paste, wel een voorstel voor een avond die blijft hangen.\n\nBekijk hem in de bijlage of via het portaal. Vragen? We denken scherp met je mee.')
on conflict (slug) do update set
  naam = excluded.naam,
  onderwerp = excluded.onderwerp,
  inhoud = excluded.inhoud;
