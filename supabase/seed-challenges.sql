-- =========================================================
--  챌린지 과제 시드 — Shopify 기본 설정 매뉴얼 14개
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
--  (setup.sql 을 먼저 실행해 challenges 테이블/컬럼이 있어야 합니다)
--  * 같은 제목이 이미 있으면 건너뜁니다 (중복 실행 안전)
-- =========================================================

insert into public.challenges (title, category, cohort, points, manual, active)
select v.title, '기본 설정', 1, 10,
       jsonb_build_array(jsonb_build_object('title', v.title, 'url', v.url)),
       true
from (values
  ('Shopify 신상품 영역 제작 매뉴얼',   'https://www.notion.so/Shopify-38f1b029d9a48023b174d7ce38650879?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('카테고리 바로가기 생성 매뉴얼',      'https://www.notion.so/Shopify-38e1b029d9a480ac8b0bdb7db24aebcc?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 리뷰 만들기',              'https://drive.google.com/open?id=1kL_inJNgCFY-HpkQ1U4EZHbZad0YstJD&usp=drive_copy'),
  ('Shopify 메가 메뉴 설정 매뉴얼',     'https://www.notion.so/38a1b029d9a480d192cce668c32077f8?source=copy_link'),
  ('Shopify 배송 설정 매뉴얼',         'https://www.notion.so/Shopify-3891b029d9a48027baadcac802ad63c2?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 세금 및 관세 설정 매뉴얼',  'https://www.notion.so/Shopify-3891b029d9a4800a89c2c685de40e9dc?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 마켓 설정 매뉴얼',         'https://www.notion.so/Shopify-3891b029d9a48000b97eed31341828f2?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 쿠키 배너 설정 매뉴얼',     'https://www.notion.so/Shopify-3891b029d9a4800c8fe7d17f221f0bee?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('AutoDS 사용방법',                 'https://www.notion.so/AutoDS-3881b029d9a48079927ac0b4100dc1bb?source=copy_link'),
  ('Zendrop 사용 매뉴얼',             'https://www.notion.so/3871b029d9a480f984bec7e075e2111f?source=copy_link'),
  ('Shopify 추천상품 영역 설정하기',    'https://www.notion.so/Shopify-38f1b029d9a48061b782d71e3b4ae903?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 브랜드 정보 섹션 설정하기', 'https://app.notion.com/p/Shopify-3901b029d9a480d29c34c0dc3d7bde9c?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 히어로 배너 제작 매뉴얼',   'https://www.notion.so/PageFly-38f1b029d9a480eb997fe3b2d757532d?v=24c1b029d9a481348608000c44534ead&source=copy_link'),
  ('Shopify 2단계 인증 설정',          'https://app.notion.com/p/Shopify-2-3911b029d9a480f0b161c7e104ae169f?source=copy_link')
) as v(title, url)
where not exists (
  select 1 from public.challenges c where c.title = v.title
);
