// 앱 안 공개 검사 (성격 OEJTS · 애착 ECR-R · 기질 IPIP 단축판) — 한 화면에 한 문항, 고르면 자동으로 넘어감
import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ITEMS_OF, TESTS, type BipolarItem, type LikertItem, type TestKind } from '../data/tests/defs';
import { ecrrToAttach, oejtsToMbti, temperFromAnswers } from '../lib/tests/scoring';
import { attachDetail, mbtiDetail, mbtiText, TEMPER_NAME } from '../lib/summary';
import { useStore, type TestRun } from '../store/useStore';
import { PIECE_COLORS } from '../components/Pieces';

const KINDS: TestKind[] = ['oejts', 'ecrr', 'temper'];
const BACK: Record<TestKind, string> = { oejts: '/mbti', ecrr: '/attach', temper: '/temper' };
const COLOR: Record<TestKind, string> = { oejts: PIECE_COLORS[1], ecrr: PIECE_COLORS[2], temper: PIECE_COLORS[3] };

/** 사람마다 섞되, 같은 척도의 문항이 세 개 이상 연달아 나오지 않게 하나씩 뽑는다 */
export function shuffledOrder(kind: TestKind, rand: () => number = Math.random): string[] {
  const items = ITEMS_OF[kind];
  const scaleOf = (id: string) => { const it = items.find(i => i.id === id)!; return 'scale' in it ? it.scale : ''; };
  const pool = items.map(i => i.id);
  const out: string[] = [];
  while (pool.length) {
    const blocked = out.length >= 2 && scaleOf(out[out.length - 1]) !== '' && scaleOf(out[out.length - 1]) === scaleOf(out[out.length - 2]) ? scaleOf(out[out.length - 1]) : null;
    const allowed = pool.filter(id => scaleOf(id) !== blocked);
    const from = allowed.length ? allowed : pool;
    const pick = from[Math.floor(rand() * from.length)];
    out.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

export function finishTest(kind: TestKind, run: TestRun) {
  const s = useStore.getState();
  if (kind === 'oejts') s.setMbti(oejtsToMbti(run.ans));
  else if (kind === 'ecrr') s.setAttach(ecrrToAttach(run.ans));
  else s.setTemper(temperFromAnswers(run.ans));
  s.setTest(kind, { ...run, finishedAt: Date.now() });
}

export default function PublicTest() {
  const { kind: k } = useParams();
  const kind = k as TestKind;
  const run = useStore(s => s.tests[kind]);
  const setTest = useStore(s => s.setTest);
  const nav = useNavigate();
  const valid = KINDS.includes(kind);
  useEffect(() => { if (valid && (!run || run.finishedAt)) setTest(kind, { ans: {}, order: shuffledOrder(kind), step: 0 }); }, [valid, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.scrollTo(0, 0); }, [run?.step]);
  if (!valid) return <Navigate to="/tests" replace />;
  if (!run || run.finishedAt) return null;
  const T = TESTS[kind], items = ITEMS_OF[kind], n = run.order.length;
  const go = (d: number) => {
    const step = run.step + d;
    if (step < 0) { nav(BACK[kind]); return; }
    if (step > n) { finishTest(kind, run); nav(`/test/${kind}/result`, { replace: true }); return; }
    setTest(kind, { ...run, step });
  };

  if (run.step === 0) return (
    <>
      <div className="wrap">
        <div className="top"><button className="back" onClick={() => go(-1)} aria-label="이전">‹</button></div>
        <div className="anim" style={{ paddingTop: 16 }}>
          <div className="part" style={{ color: COLOR[kind] }}>{T.title} · {n}문항 · 약 {T.minutes}분</div>
          <h1>{kind === 'oejts' ? <>어떻게 생각하고<br />정보를 다루나요?</> : kind === 'ecrr' ? <>가까운 사람과<br />어떻게 연결되나요?</> : <>자극에<br />어떻게 반응하나요?</>}</h1>
          <p className="lead">{T.intro}</p>
          <div className="card"><h3>이 검사는</h3>
            <p className="note" style={{ margin: 0 }}>{T.source}<br />{T.license}<br />공개된 검사를 한국어로 옮겼어요. 원래 검사와 똑같다고 보장할 수는 없어서, 결과는 대략적인 경향으로 봐 주세요.</p></div>
        </div>
      </div>
      <div className="cta"><button onClick={() => go(1)}>시작하기</button></div>
    </>
  );

  const id = run.order[run.step - 1];
  const it = items.find(i => i.id === id)!;
  const a = run.ans[id];
  const pick = (v: number) => {
    const next = { ...run, ans: { ...run.ans, [id]: v } };
    setTest(kind, next);
    setTimeout(() => {
      const cur = useStore.getState().tests[kind];
      if (!cur || cur.step !== run.step) return;
      if (run.step >= n) { finishTest(kind, cur); nav(`/test/${kind}/result`, { replace: true }); }
      else setTest(kind, { ...cur, step: run.step + 1 });
    }, 220);
  };

  return (
    <>
      <div className="wrap">
        <div className="top">
          <button className="back" onClick={() => go(-1)} aria-label="이전">‹</button>
          <div className="bar"><i style={{ width: `${run.step / n * 100}%`, background: COLOR[kind] }} /></div>
          <span className="count">{run.step}/{n}</span>
        </div>
        <div className="part" style={{ color: COLOR[kind] }}>{T.title}</div>
        {kind === 'oejts' ? <BipolarQ it={it as BipolarItem} a={a} pick={pick} /> : <LikertQ it={it as LikertItem} a={a} pick={pick} points={T.points} labels={T.labels} color={COLOR[kind]} />}
      </div>
      <div className="cta"><button disabled={a === undefined} onClick={() => go(1)}>{run.step >= n ? '결과 보기' : '다음'}</button></div>
    </>
  );
}

function BipolarQ({ it, a, pick }: { it: BipolarItem; a?: number; pick: (v: number) => void }) {
  const lc = a === 1 ? 'on' : a === 2 ? 'half' : a !== undefined && a >= 4 ? 'dim' : '';
  const rc = a === 5 ? 'on' : a === 4 ? 'half' : a !== undefined && a <= 2 ? 'dim' : '';
  const dotCls = ['l', 'l near', 'm', 'r near', 'r'];
  return (
    <>
      <h2>나와 더 가까운 쪽은?</h2>
      <div className="poles">
        <button className={`pole l ${lc}`} onClick={() => pick(a === 1 ? 2 : 1)}>{it.L}</button>
        <button className={`pole r ${rc}`} onClick={() => pick(a === 5 ? 4 : 5)}>{it.R}</button>
      </div>
      <div className="dots">{[1, 2, 3, 4, 5].map(v => <button key={v} className={`dot ${dotCls[v - 1]} ${a === v ? 'sel' : ''}`} onClick={() => pick(v)} aria-label={`${v}`} />)}</div>
      <div className="dothint"><span>← 왼쪽</span><span>반반</span><span>오른쪽 →</span></div>
    </>
  );
}

function LikertQ({ it, a, pick, points, labels, color }: { it: LikertItem; a?: number; pick: (v: number) => void; points: number; labels: string[]; color: string }) {
  return (
    <>
      <h2 style={{ minHeight: 96 }}>{it.text}</h2>
      <div className="likert" style={{ '--c': color, gridTemplateColumns: `repeat(${points}, 1fr)` } as React.CSSProperties}>
        {Array.from({ length: points }, (_, i) => i + 1).map(v => (
          <button key={v} className={`lk ${a === v ? 'sel' : ''}`} onClick={() => pick(v)} aria-label={labels[v - 1] || `${v}`}>
            <span className="lk-dot" style={{ width: 18 + Math.abs(v - (points + 1) / 2) * 5, height: 18 + Math.abs(v - (points + 1) / 2) * 5 }} />
            <span className="lk-label">{labels[v - 1]}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function PublicTestResult() {
  const { kind: k } = useParams();
  const kind = k as TestKind;
  const { mbti, attach, temper, setTest } = useStore();
  const nav = useNavigate();
  if (!KINDS.includes(kind)) return <Navigate to="/tests" replace />;
  const T = TESTS[kind];
  const bar = (label: string, left: string, right: string, pct: number, color: string, bipolar = false) => (
    <div className="res-bar" key={label}>
      <div className="res-bar-h"><b>{label}</b><span>{left} · {right}</span></div>
      <div className="track" style={{ '--c': color } as React.CSSProperties}><span className="fill" style={bipolar ? { left: `${Math.min(50, pct)}%`, width: `${Math.abs(pct - 50)}%` } : { left: 0, width: `${pct}%` }} />{bipolar && <span className="c" />}<span className="m" style={{ left: `${pct}%` }} /></div>
    </div>
  );
  let body: React.ReactNode = null;
  if (kind === 'oejts') {
    const pairs = [['EI', 'E 외향', 'I 내향'], ['SN', 'S 감각', 'N 직관'], ['TF', 'T 사고', 'F 감정'], ['JP', 'J 판단', 'P 인식']] as const;
    body = (<>
      <div className="type-name" style={{ marginTop: 8 }}>{mbtiText(mbti)}</div>
      <p className="note">{mbtiDetail(mbti)}</p>
      {pairs.map(([d, x, y]) => {
        const l = mbti.letters[d], p = mbti.pct[d] ?? 50;
        const towardRight = l === y[0];
        return bar(`${l === x[0] ? x : y} ${p}%`, x, y, towardRight ? p : 100 - p, COLOR[kind], true);
      })}
    </>);
  } else if (kind === 'ecrr') {
    body = (<>
      <div className="type-name" style={{ marginTop: 8 }}>{attach.style}</div>
      <p className="note">{attachDetail(attach)}</p>
      {bar('애착 불안', '관계가 멀어질까 걱정하는 정도', `${attach.anxiety}%`, attach.anxiety ?? 0, COLOR[kind])}
      {bar('애착 회피', '가까워지는 게 불편한 정도', `${attach.avoidance}%`, attach.avoidance ?? 0, COLOR[kind])}
      <p className="note">유형은 두 점수가 척도 가운데보다 높은지로만 나눴어요. 한국 사람 기준의 평균(규준)이 없어서, 다른 사람과 비교한 위치는 아니에요.</p>
    </>);
  } else {
    const DESC = { NS: '새롭고 짜릿한 걸 찾는 정도', HA: '걱정하고 조심하는 정도', RD: '다른 사람의 감정과 인정에 민감한 정도', P: '보상이 없어도 버티는 정도' };
    body = (<>
      {(['NS', 'HA', 'RD', 'P'] as const).map(d => bar(TEMPER_NAME[d], DESC[d], `${temper.pct[d]}%`, temper.pct[d] ?? 0, COLOR[kind]))}
      <p className="note">각 기질을 8문항으로 짧게 잰 결과예요. 다른 사람과 비교한 백분위가 아니라, 문항에 얼마나 '그래요'라고 답했는지를 0~100으로 옮긴 거예요.</p>
    </>);
  }
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="top"><Link className="back" to="/tests" aria-label="검사로">‹</Link><span className="count" style={{ marginLeft: 'auto' }}>{T.title} 결과</span></div>
      <div className="anim" style={{ paddingTop: 12 }}>
        <div className="part" style={{ color: COLOR[kind] }}>{T.title} 결과</div>
        {body}
        <div className="card" style={{ marginTop: 16 }}><p className="note" style={{ margin: 0 }}>{T.source}<br />{T.license}</p></div>
        <Link to="/" className="ghost primary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>나에게서 보기</Link>
        <button className="ghost" onClick={() => { setTest(kind, undefined); nav(`/test/${kind}`); }}>다시 검사하기</button>
      </div>
    </div>
  );
}
