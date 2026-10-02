// 개발 모드 전용 데모: 4월 종합 검사 → 6월 가치관만 다시 (제3세트 58번·69번 응답)
// 주소 #/demo 로 열면 이 기기의 저장 내용을 데모로 덮어쓴다. 빌드(prod)에는 포함되지 않음.
import fixtures from '../../tests/fixtures/set3-prototype.json';
import type { Snapshot } from '../lib/history';
import { useStore } from '../store/useStore';

type Fx = Record<string, { ans: Record<string, number>; md: Snapshot['values'] extends infer V ? V extends { md: infer M } ? M : never : never }>;

export function loadDemo() {
  const f = fixtures as unknown as Fx;
  const apr = new Date(2026, 3, 12, 10).getTime(), jun = new Date(2026, 5, 20, 10).getTime();
  const mbti = { letters: { EI: 'I', SN: 'N', TF: 'F', JP: 'P' }, pct: { TF: 68 } };
  const attach = { style: '불안형' as const, anxiety: 72 };
  const temper = { pct: { HA: 70, P: 40 } };
  const history: Snapshot[] = [
    { id: 's-demo1', at: apr, updatedAt: apr, changed: ['values', 'mbti', 'attach', 'temper'], values: { ans: f['58'].ans, md: f['58'].md }, mbti, attach, temper },
    { id: 's-demo2', at: jun, updatedAt: jun, changed: ['values'], values: { ans: f['69'].ans, md: f['69'].md }, mbti, attach, temper },
  ];
  useStore.setState({
    profile: { name: '주익', onboarded: true },
    values: { step: 0, ans: f['69'].ans, md: f['69'].md, perm: {}, flags: {}, selfRating: {} },
    mbti, attach, temper, history,
  });
}
