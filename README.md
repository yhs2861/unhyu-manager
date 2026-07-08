# 운휴매니저

React, TypeScript, Vite 기반의 모바일 우선 PWA 프로젝트입니다.

## 주요 기능

- React + TypeScript 앱 구조
- Vite 개발 서버와 빌드 설정
- PWA 매니페스트 및 서비스 워커 자동 업데이트
- 모바일 화면을 먼저 고려한 운휴 현황 UI

## 변경 기록

버전별 변경 내역은 [CHANGELOG.md](./CHANGELOG.md)에서 확인할 수 있습니다.

## 시작하기

```bash
npm install
npm run dev
```

개발 서버가 실행되면 터미널에 표시되는 주소로 접속하면 됩니다.

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

## GitHub Pages 배포

배포 전에 GitHub 저장소의 Pages 설정에서 배포 브랜치를 `gh-pages`로 선택하세요.

```bash
npm run deploy
```

`npm run deploy`는 빌드 후 `dist` 결과물을 `gh-pages` 브랜치로 배포합니다.
