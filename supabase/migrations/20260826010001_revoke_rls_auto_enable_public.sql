-- La migración anterior revocó EXECUTE de anon/authenticated directamente, pero el
-- grant real está en el pseudo-rol PUBLIC (heredado por anon/authenticated), así que
-- ese revoke fue un no-op y el advisor seguía marcando el warning. Se revoca de PUBLIC.
revoke execute on function public.rls_auto_enable() from public;
