import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const SUPABASE_URL = "https://hpqdpdmkhnlskelhtqyb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hsczIrUGgqGh88tOIqaFrA_w7YgCzYJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
