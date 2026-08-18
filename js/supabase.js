/* =========================================================
   백엔드 공통 클라이언트
   - 이 파일보다 먼저 CDN 라이브러리를 로드해야 함:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase.js"></script>

   백엔드는 Supabase 호스팅이 아니라 우리 서버(spark-postgres 의 addbal DB
   + PostgREST/GoTrue/storage-api)다. 스택 정의는 infra/ 참고.

   ── 어디서 호스팅하든 그대로 동작하게 ──────────────────────────────
   접속한 도메인만 보고 백엔드를 고른다. 그래서 이 폴더를 Vercel 에 올리든,
   Cloudflare Pages 에 올리든, serve.ps1 로 로컬에서 열든 코드 수정이 없다.
     · localhost / 127.0.0.1  → 로컬 게이트웨이(127.0.0.1:8100)
     · 그 외 모든 도메인      → 운영 게이트웨이(challenge.sparkuniverse.kr)

   새 프론트 도메인을 추가할 때 여기는 건드릴 필요 없다. 대신 GoTrue 의
   SITE_URL / URI_ALLOW_LIST(infra/.env)에 그 도메인을 넣어야 비밀번호
   재설정 메일 링크가 그 도메인으로 돌아온다.

   ANON 키는 브라우저에 공개되는 값이 맞다 (실제 방어선은 DB 의 RLS).
   service_role 키는 RLS 를 우회하므로 이 파일에 절대 넣지 말 것.
   ========================================================= */
(function () {
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '' || host === '[::1]';

  window.SUPABASE_URL = isLocal
    ? 'http://127.0.0.1:8100'
    : 'https://challenge.sparkuniverse.kr';

  window.SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NzgzNTM1LCJleHAiOjIxMDIxNDM1MzV9.NpKMRD_0M1tm8b04aLoSjXfDFi3rAi96is48gpevnRo';

  window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
})();
