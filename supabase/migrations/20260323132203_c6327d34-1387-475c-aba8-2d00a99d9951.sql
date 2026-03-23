
CREATE TABLE public.client_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, product_id)
);

ALTER TABLE public.client_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on client_balances" ON public.client_balances
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE public.client_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('adaugat', 'scazut')),
  quantity integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on client_history" ON public.client_history
  FOR ALL TO public USING (true) WITH CHECK (true);
