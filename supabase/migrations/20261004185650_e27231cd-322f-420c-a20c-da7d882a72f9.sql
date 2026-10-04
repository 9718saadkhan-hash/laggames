REVOKE EXECUTE ON FUNCTION public.check_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_coupon(text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_coupon(text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, numeric) TO service_role;