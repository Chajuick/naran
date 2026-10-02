// 공개 검사 결과 직접 입력 — MBTI 스타일 / 애착 / 기질. 자체 검사는 문항 설계·검증 후 추가 (docs/07)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, type AttachStyle, type MbtiDim, type TemperDim, type TestKind } from '../store/useStore';
import { ITEMS_OF, TESTS } from '../data/tests/defs';

function Header({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <div className="top"><Link className="back" to="/tests" aria-label="검사로">‹</Link></div>
      <h1 style={{ marginTop: 16 }}>{title}</h1>
      <p className="lead">{sub}</p>
    </>
  );
}

function TakeTest({ kind }: { kind: TestKind }) {
  const run = useStore(s => s.tests[kind]);
  const T = TESTS[kind], n = ITEMS_OF[kind].length;
  const going = run && !run.finishedAt && run.step > 0;
  return (
    <Link to={`/test/${kind}`} className="take-test">
      <div><b>직접 검사하기</b><span>{n}문항 · 약 {T.minutes}분{going ? ` · ${run.step - 1}/${n} 진행 중` : ''}</span></div>
      <span className="mod-go static">{going ? '이어하기' : run?.finishedAt ? '다시 하기' : '시작'}</span>
    </Link>
  );
}

function Or() {
  return <div className="or"><span>또는 알고 있는 결과 입력</span></div>;
}

function Pct({ value, onChange, left, right }: { value: number | undefined; onChange: (v: number | undefined) => void; left?: string; right?: string }) {
  const on = value !== undefined;
  return (
    <div className="pct">
      {on ? (
        <>
          <div className="pct-row"><input type="range" min={0} max={100} value={value} onChange={e => onChange(+e.target.value)} /><b>{value}%</b></div>
          {(left || right) && <div className="seg-hint"><span>{left}</span><span>{right}</span></div>}
          <button className="link" onClick={() => onChange(undefined)}>% 지우기</button>
        </>
      ) : <button className="link" onClick={() => onChange(50)}>+ %도 알고 있어요</button>}
    </div>
  );
}

const MBTI: [MbtiDim, string, string, string, string][] = [
  ['EI', 'E', '외향', 'I', '내향'], ['SN', 'S', '감각', 'N', '직관'], ['TF', 'T', '사고', 'F', '감정'], ['JP', 'J', '판단', 'P', '인식'],
];

export function MbtiInput() {
  const saved = useStore(s => s.mbti), setMbti = useStore(s => s.setMbti), nav = useNavigate();
  const [m, setM] = useState(saved);
  return (
    <div className="wrap">
      <Header title="성격 · MBTI" sub="직접 검사하거나, 이미 알고 있는 MBTI 결과를 입력해 주세요." />
      <TakeTest kind="oejts" />
      <Or />
      {MBTI.map(([d, a, an, b, bn]) => (
        <div key={d} className="card">
          <div className="seg two">
            <button className={m.letters[d] === a ? 'sel' : ''} onClick={() => setM({ ...m, letters: { ...m.letters, [d]: a } })}><b>{a}</b> {an}</button>
            <button className={m.letters[d] === b ? 'sel' : ''} onClick={() => setM({ ...m, letters: { ...m.letters, [d]: b } })}><b>{b}</b> {bn}</button>
          </div>
          {m.letters[d] && <Pct value={m.pct[d]} onChange={x => setM({ ...m, pct: { ...m.pct, [d]: x } })} left={`${m.letters[d]} 쪽 정도`} />}
        </div>
      ))}
      <div className="cta"><button onClick={() => { setMbti({ ...m, source: 'self', raw: undefined }); nav('/tests'); }}>저장하기</button></div>
    </div>
  );
}

const STYLES: [AttachStyle, string][] = [
  ['안정형', '가까워지는 것도, 혼자 있는 것도 비교적 편안해요'],
  ['불안형', '관계가 멀어질까 걱정되고 확인받고 싶을 때가 많아요'],
  ['회피형', '너무 가까워지면 부담스럽고 혼자가 편해요'],
  ['혼란형', '가까워지고 싶으면서도 동시에 두려워요'],
];

export function AttachInput() {
  const saved = useStore(s => s.attach), setAttach = useStore(s => s.setAttach), nav = useNavigate();
  const [a, setA] = useState(saved);
  return (
    <div className="wrap">
      <Header title="애착" sub="직접 검사하거나, 다른 곳에서 받은 결과를 입력해 주세요." />
      <TakeTest kind="ecrr" />
      <Or />
      {STYLES.map(([s, d]) => (
        <button key={s} className={`opt ${a.style === s ? 'sel' : ''}`} onClick={() => setA({ ...a, style: a.style === s ? undefined : s })}>
          <b>{s}</b><br /><span style={{ fontSize: 14, fontWeight: 400 }}>{d}</span>
        </button>
      ))}
      <div className="card" style={{ marginTop: 12 }}><h3>점수도 알고 있다면</h3>
        <div className="sub-h" style={{ marginTop: 0 }}>애착 불안 — 관계가 멀어질까 걱정하는 정도</div>
        <Pct value={a.anxiety} onChange={x => setA({ ...a, anxiety: x })} left="낮음" right="높음" />
        <div className="sub-h">애착 회피 — 가까워지는 게 불편한 정도</div>
        <Pct value={a.avoidance} onChange={x => setA({ ...a, avoidance: x })} left="낮음" right="높음" />
      </div>
      <div className="cta"><button onClick={() => { setAttach({ ...a, source: 'self', raw: undefined }); nav('/tests'); }}>저장하기</button></div>
    </div>
  );
}

const TEMPER: [TemperDim, string, string][] = [
  ['NS', '자극 추구', '새롭고 짜릿한 것을 찾는 정도'],
  ['HA', '위험 회피', '걱정하고 조심하는 정도'],
  ['RD', '사회적 민감성', '남의 반응과 인정에 민감한 정도'],
  ['P', '인내력', '보상이 없어도 버티는 정도'],
];

export function TemperInput() {
  const saved = useStore(s => s.temper), setTemper = useStore(s => s.setTemper), nav = useNavigate();
  const [t, setT] = useState(saved);
  return (
    <div className="wrap">
      <Header title="기질" sub="직접 검사하거나, 기질 검사(TCI 등) 결과가 있으면 백분위를 입력해 주세요." />
      <TakeTest kind="temper" />
      <Or />
      {TEMPER.map(([k, name, d]) => (
        <div key={k} className="card"><h3 style={{ marginBottom: 4 }}>{name}</h3><p className="note" style={{ margin: '0 0 8px' }}>{d}</p>
          <Pct value={t.pct[k]} onChange={x => setT({ ...t, pct: { ...t.pct, [k]: x } })} left="낮음" right="높음" />
        </div>
      ))}
      <div className="cta"><button onClick={() => { setTemper({ ...t, source: 'self' }); nav('/tests'); }}>저장하기</button></div>
    </div>
  );
}
