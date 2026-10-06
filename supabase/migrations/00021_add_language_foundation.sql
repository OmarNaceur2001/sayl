ALTER TABLE public.contacts
  ADD COLUMN language text
    CHECK (language IN ('fr', 'en', 'ar', 'tn')),
  ADD COLUMN language_confidence numeric
    CHECK (language_confidence IS NULL OR language_confidence BETWEEN 0 AND 1),
  ADD COLUMN language_source text
    CHECK (language_source IN ('detected', 'manual', 'default'));

ALTER TABLE public.conversations
  ADD COLUMN language text
    CHECK (language IN ('fr', 'en', 'ar', 'tn'));

ALTER TABLE public.workspaces
  ADD COLUMN default_language text NOT NULL DEFAULT 'fr'
    CHECK (default_language IN ('fr', 'en', 'ar', 'tn')),
  ADD COLUMN enabled_languages text[] NOT NULL
    DEFAULT ARRAY['fr', 'en', 'ar', 'tn']::text[]
    CHECK (
      cardinality(enabled_languages) > 0
      AND enabled_languages <@ ARRAY['fr', 'en', 'ar', 'tn']::text[]
    );
