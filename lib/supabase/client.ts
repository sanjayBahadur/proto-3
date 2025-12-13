import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // #region agent log
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  fetch('http://127.0.0.1:7242/ingest/a0648e96-4ca1-4d2b-9831-626e9ff9c273',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:6',message:'createClient env check',data:{urlDefined:!!url,urlValue:url?.substring(0,30),keyDefined:!!key,keyLength:key?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

