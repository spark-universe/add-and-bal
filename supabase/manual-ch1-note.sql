-- 챕터 1(쇼피파이 가입 방법): '확인 문제' 앞에 참고 안내 추가
-- "반복해도 미국으로 설정되지 않으면 챕터 2(미국 현지화 실습) 참고"
update public.manual_chapters
set body = replace(
  body,
  '<div class="callout quiz">',
  '<div class="callout note"><div class="callout-label">💡 참고</div>' ||
  '<p>위 과정을 반복해도 마켓이 <b>미국</b>으로 설정되지 않는다면, 챕터 2 ' ||
  '<a href="#localize">「미국 현지화 실습」</a>을 참고해 주세요.</p></div>' ||
  '<div class="callout quiz">'
)
where slug = 'signup'
  and body not like '%「미국 현지화 실습」%';   -- 이미 넣었으면 건너뜀(중복 방지)
