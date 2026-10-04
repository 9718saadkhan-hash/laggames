ALTER ROLE authenticated SET statement_timeout = '30s';
ALTER ROLE anon SET statement_timeout = '15s';
NOTIFY pgrst, 'reload config';