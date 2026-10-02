// 나란 유형 체계 (docs/06·07): 대표 유형 = 책임 축 × 경계 축, 수식어 = 표현 축 × 감정 축.
// - 대표 유형: 두 축 중 하나라도 균형이면 '조율형'
// - 수식어: 표현·감정 중 하나라도 균형이면 붙이지 않는다 (애매한 사람을 칸에 우겨넣지 않기 — GPT 판정 B안)
// - 유형명은 사람이 읽는 라벨일 뿐. AI에게는 축 점수와 설명서를 함께 넘긴다 (docs/07)
// TODO(이름 확정): '원칙형'은 평가적으로 들린다는 지적(docs/06) — 대안 '독립형' 검토 중

export type FamilyKey = 'A' | 'B' | 'C' | 'D' | 'E';
export type ModKey = '1' | '2' | '3' | '4';

export const FAMILY: Record<FamilyKey, { name: string; tagline: string; desc: string }> = {
  A: { name: '원칙형', tagline: '각자의 몫은 각자가 진다',
    desc: '잘못이 있으면 사정보다 결과와 책임을 먼저 보고, 가까운 사람의 선택도 그 사람의 몫으로 두는 게 맞다고 봐요.' },
  B: { name: '보호형', tagline: '기준은 세우고, 끝까지 챙긴다',
    desc: '결과에 대한 책임은 분명히 보되, 아끼는 사람이 위험해 보이면 직접 나서서 챙기는 게 맞다고 봐요.' },
  C: { name: '포용형', tagline: '사정을 보고, 믿고 맡긴다',
    desc: '잘못 앞에서 그 사람의 사정과 다시 일어설 여지를 먼저 보고, 선택은 본인에게 맡기는 게 맞다고 봐요.' },
  D: { name: '돌봄형', tagline: '사정을 헤아리고, 곁에서 챙긴다',
    desc: '잘못 앞에서 사정을 먼저 헤아리고, 아끼는 사람이 힘들어 보이면 곁에서 적극적으로 챙기는 게 맞다고 봐요.' },
  E: { name: '조율형', tagline: '상황마다 저울질한다',
    desc: '책임과 사정, 존중과 챙김 중 어느 한쪽을 정해두기보다, 사람과 상황을 보고 그때그때 무게를 정해요.' },
};

export const MODIFIER: Record<ModKey, { name: string; desc: string }> = {
  '1': { name: '단단한', desc: '알아야 할 말은 하고, 결론은 내용으로 내는 쪽이에요.' },
  '2': { name: '따뜻한', desc: '알아야 할 말은 하되, 상대의 마음도 결정에 넣는 쪽이에요.' },
  '3': { name: '차분한', desc: '관계의 평온을 지키되, 결론은 내용으로 내는 쪽이에요.' },
  '4': { name: '포근한', desc: '관계의 평온과 상대의 마음을 함께 지키는 쪽이에요.' },
};

export const FAMILY_BY_POLES: Record<string, FamilyKey> = { 책임자율: 'A', 책임보살핌: 'B', 이해자율: 'C', 이해보살핌: 'D' };
export const MOD_BY_POLES: Record<string, ModKey> = { 솔직구분: '1', 솔직헤아림: '2', 조화구분: '3', 조화헤아림: '4' };
