CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order numeric,
  max_discount numeric,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at date,
  expires_at date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.orders ADD COLUMN coupon_code text, ADD COLUMN discount numeric;

CREATE OR REPLACE FUNCTION public.check_coupon(_code text, _subtotal numeric)
RETURNS TABLE(code text, discount numeric, message text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.coupons; d numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(coupons.code) = upper(trim(_code));
  IF NOT FOUND OR NOT c.active THEN RETURN QUERY SELECT NULL::text, 0::numeric, 'Invalid coupon code.'; RETURN; END IF;
  IF c.starts_at IS NOT NULL AND current_date < c.starts_at THEN RETURN QUERY SELECT NULL::text, 0::numeric, 'This coupon is not active yet.'; RETURN; END IF;
  IF c.expires_at IS NOT NULL AND current_date > c.expires_at THEN RETURN QUERY SELECT NULL::text, 0::numeric, 'This coupon has expired.'; RETURN; END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RETURN QUERY SELECT NULL::text, 0::numeric, 'This coupon has reached its usage limit.'; RETURN; END IF;
  IF c.min_order IS NOT NULL AND _subtotal < c.min_order THEN RETURN QUERY SELECT NULL::text, 0::numeric, 'Minimum order of ₹' || c.min_order::text || ' required.'; RETURN; END IF;
  IF c.discount_type = 'percent' THEN d := round(_subtotal * c.discount_value / 100); ELSE d := c.discount_value; END IF;
  IF c.max_discount IS NOT NULL THEN d := least(d, c.max_discount); END IF;
  d := least(d, _subtotal);
  RETURN QUERY SELECT c.code, d, 'Coupon applied.';
END $$;

CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text, _subtotal numeric)
RETURNS TABLE(code text, discount numeric, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.check_coupon(_code, _subtotal);
  IF r.code IS NOT NULL THEN
    UPDATE public.coupons SET used_count = used_count + 1 WHERE coupons.code = r.code;
  END IF;
  RETURN QUERY SELECT r.code, r.discount, r.message;
END $$;
GRANT EXECUTE ON FUNCTION public.check_coupon(text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, numeric) TO anon, authenticated;