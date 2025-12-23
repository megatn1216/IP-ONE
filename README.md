# NET-IP UI (React) v7

반영 내용

1) 필터 순서 변경  
- 망속성 → 망유형1 → 망유형2 → IP유형1 → IP유형2 → IP유형3 → OS유형 → 장비유형 → 기준 날짜 → 키워드

2) topbar__context / networkPage__filters / networkPage__table  
- 세 영역의 **내부 좌우 패딩을 완전히 동일**하게 맞춤  
- 공통 토큰으로 관리:  
  --section-pad-y / --section-pad-x

3) 엑셀 업로드 안내 문구 톤 정리  
- 사내 웹 솔루션에서 사용하는 정중한 안내 문장으로 변경

4) 중복 안내 문구 변경  
- IP가 중복됩니다. (업로드된 전체 데이터가 저장되지 않습니다.)

## 실행

```bash
npm install
npm run dev
```


추가 반영

- filtersGrid의 내부 최대폭 제한을 제거하여 상단 컨텍스트/필터/테이블 3영역의 내부 좌우 여백 시각을 완전히 일치시킴
