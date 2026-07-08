/* =========================================================
   Supabase 공통 클라이언트
   - 이 파일보다 먼저 CDN 라이브러리를 로드해야 함:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase.js"></script>
   - anon(publishable) 키는 프론트 공개용 (RLS로 보호). service_role 키는 넣지 말 것.
   ========================================================= */
window.SUPABASE_URL = 'https://unffhiygqmqxmnfaluep.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_MPMmFK4yKoVXrXl5UMJJcQ_2aZUTV8_';

window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
