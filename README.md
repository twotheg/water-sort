# 🧪 물 정렬 퍼즐 (Water Sort Puzzle)

가족과 함께 즐기는 물 색깔 정렬 퍼즐 게임입니다.

- **총 300 스테이지** (Easy → Hard)
- 병 하나당 **5칸**
- **빈 병**을 활용해 한 가지 색으로만 정렬
- 병이 완성되면 **빛나는 효과** ✨
- 클리어 시 **Level Clear!** 축하 모달
- **PWA**로 설치해서 모바일에서 풀스크린 게임
- **Web Push** 알림 지원

## 🚀 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Drizzle ORM
- **Push**: web-push
- **PWA**: Service Worker + Manifest
- **Deploy**: Vercel + Neon

## 📦 설치 및 로컬 실행

```bash
npm install
# PostgreSQL 실행 후 스키마 적용
npx drizzle-kit push
npm run dev
```

## 🔑 환경 변수

`.env.example`을 참고하여 `.env`를 만드세요.

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

VAPID 키는 아래 명령어로 생성할 수 있습니다.

```bash
npx web-push generate-vapid-keys
```

## 🌐 Vercel + Neon 배포

1. [Neon](https://neon.tech)에서 PostgreSQL 데이터베이스를 만듭니다.
2. 연결 문자열을 `DATABASE_URL`로 Vercel 환경 변수에 추가합니다.
3. 위에서 생성한 VAPID 키 3개도 환경 변수로 추가합니다.
4. `npx drizzle-kit push`로 데이터베이스 스키마를 Neon에 적용합니다.
5. Vercel에 프로젝트를 업로드/배포합니다.

## 📱 PWA 설치

- **Android/Chrome**: 브라우저 메뉴 → "홈 화면에 추가"
- **iPhone/Safari**: 공유 버튼 → "홈 화면에 추가"

## 🔔 푸시 알림

앱 내 메뉴(설정)에서 "푸시 알림 받기"를 누륾면 새 스테이지 안내 등을 받을 수 있습니다.

## 🎮 게임 방법

1. 위 색상이 같은 병끼리 옮겨서 한 병을 같은 색으로 채웁니다.
2. 빈 병을 전략적으로 사용하세요.
3. 모든 병이 완성되면 **Level Clear!**

## 📁 프로젝트 구조

- `src/app/page.tsx` — 메인 페이지
- `src/components/GameBoard.tsx` — 게임 로직 & UI
- `src/components/Bottle.tsx` — 병 컴포넌트
- `src/lib/game.ts` — 300 레벨 생성 & 퍼즐 규칙
- `src/db/schema.ts` — 진행 상황, 푸시 구독 테이블
- `public/sw.js` — Service Worker
- `public/manifest.json` — PWA 매니페스트

## 📄 라이선스

MIT
