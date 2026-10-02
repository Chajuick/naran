import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Pieces from '../components/Pieces';
import { ITEMS, POOLS, type SjtItem, type SliderItem } from '../data/values/items';
import { tieInfo, type MdPick, type TieRec } from '../lib/values/scoring';
import { RESULT_STEP, STEPS, TOTAL_Q, qNumber, type Step } from '../lib/values/steps';
import { useStore } from '../store/useStore';

const isGeneric = (q: string) => q.startsWith('어느 쪽');

function shuffled(n: number): number[] {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}

export default function ValuesTest() {
  const nav = useNavigate();
  const v = useStore(s => s.values);
  const setValues = useStore(s => s.setValues);
  const dirRef = useRef(1);
  const step = Math.min(v.step, RESULT_STEP);
  const st = STEPS[step];

  const go = (d: number) => {
    dirRef.current = d;
    if (step + d < 0) { nav('/tests'); return; }
    setValues(x => ({ ...x, step: Math.max(0, Math.min(RESULT_STEP, x.step + d)), startedAt: x.startedAt ?? Date.now() }));
  };

  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // 동점이 없으면 순위 정하기 화면은 건너뛴다
  const tie = st.kind === 'tie' ? tieInfo(v, st.pool) : null;
  useEffect(() => {
    if (st.kind === 'tie' && !tie) {
      setValues(x => { const md = { ...x.md }; delete md[st.pool + 'Tie']; return { ...x, md, step: x.step + dirRef.current }; });
    }
    if (st.kind === 'result') {
      setValues(x => ({ ...x, finishedAt: x.finishedAt ?? Date.now() }));
      useStore.getState().recordHistory();
      nav('/values/result', { replace: true });
    }
  }, [st, tie, setValues, nav]);

  // sjt 선택지 순서 고정
  useEffect(() => {
    if (st.kind === 'item' && ITEMS[st.id].type === 'sjt' && !v.perm[st.id]) {
      const n = (ITEMS[st.id] as SjtItem).opts.length;
      setValues(x => ({ ...x, perm: { ...x.perm, [st.id]: shuffled(n) } }));
    }
  }, [st, v.perm, setValues]);

  if (st.kind === 'intro') return (
    <Shell next={{ label: '시작하기', onClick: () => go(1) }}>
      <div className="top"><button className="back" onClick={() => nav('/tests')} aria-label="검사로">‹</button></div>
      <div className="anim" style={{ paddingTop: 16 }}>
        <Pieces filled={[true, false, false, false]} size={88} label="가치" animate />
        <div className="part">나란 · 가치관 검사</div>
        <h1>관계에서 나는<br />무엇이 옳다고 볼까요</h1>
        <p className="lead">정답은 없어요. 평소 생각대로 고르면 돼요. 약 6~7분 걸려요.</p>
        <div className="card" style={{ marginTop: 28 }}><h3>이 검사는</h3>
          <p className="lead" style={{ margin: 0, fontSize: 15 }}>실제로 어떻게 행동하는지가 아니라, <b>무엇이 맞다고 생각하는지</b>를 봐요. 답은 이 기기에만 저장돼요.</p></div>
        <div className="card"><h3>애매한 문항이 있다면</h3>
          <p className="lead" style={{ margin: 0, fontSize: 15 }}>아래 <b>⚐ 이 문항 애매해요</b>를 눌러 한 줄 남겨주세요. 검사를 다듬는 데 쓰여요.</p></div>
      </div>
    </Shell>
  );

  if (st.kind === 'break') return (
    <Shell next={{ label: '계속하기', onClick: () => go(1) }}>
      <div className="top"><button className="back" onClick={() => go(-1)} aria-label="이전">‹</button></div>
      <div style={{ paddingTop: 76 }}><h1>{st.title}</h1><p className="lead" style={{ whiteSpace: 'pre-line' }}>{st.text}</p></div>
    </Shell>
  );

  if (st.kind === 'item') return <ItemScreen st={st} step={step} go={go} />;
  if (st.kind === 'md') return <MdScreen st={st} step={step} go={go} />;
  if (st.kind === 'tie' && tie) return <TieScreen pool={st.pool} t={tie} step={step} go={go} />;
  return null;
}

function Shell({ children, next }: { children: React.ReactNode; next?: { label: string; onClick: () => void; disabled?: boolean } }) {
  return (
    <>
      <div className="wrap">{children}</div>
      {next && <div className="cta"><button disabled={next.disabled} onClick={next.onClick}>{next.label}</button></div>}
    </>
  );
}

function Top({ step, go, label }: { step: number; go: (d: number) => void; label?: string }) {
  const n = qNumber(step);
  return (
    <div className="top">
      <button className="back" onClick={() => go(-1)} aria-label="이전">‹</button>
      <div className="bar"><i style={{ width: `${n / TOTAL_Q * 100}%` }} /></div>
      <span className="count">{label ?? `${n}/${TOTAL_Q}`}</span>
    </div>
  );
}

function FlagBox({ k }: { k: string }) {
  const f = useStore(s => s.values.flags[k]);
  const setValues = useStore(s => s.setValues);
  const set = (val: string | undefined) => setValues(x => { const flags = { ...x.flags }; if (val === undefined) delete flags[k]; else flags[k] = val; return { ...x, flags }; });
  return (
    <div className="flag">
      <button className={`flag-btn ${f !== undefined ? 'on' : ''}`} onClick={() => set(f !== undefined ? undefined : '')}>
        {f !== undefined ? '⚑ 애매해요 표시함' : '⚐ 이 문항 애매해요'}
      </button>
      {f !== undefined && (
        <textarea placeholder="어디가 애매했나요? (예: 둘 다 아니에요 / 정답이 보여요 / 상황이 잘 안 그려져요)"
          value={f} onChange={e => set(e.target.value)} />
      )}
    </div>
  );
}

function ItemScreen({ st, step, go }: { st: Extract<Step, { kind: 'item' }>; step: number; go: (d: number) => void }) {
  const it = ITEMS[st.id];
  const a = useStore(s => s.values.ans[st.id]);
  const perm = useStore(s => s.values.perm[st.id]);
  const setValues = useStore(s => s.setValues);
  const pick = (val: number) => {
    setValues(x => ({ ...x, ans: { ...x.ans, [st.id]: val } }));
    if (it.type === 'sjt') setTimeout(() => go(1), 220);
  };
  const sit = it.type === 'slider' && !isGeneric(it.q);

  let body: React.ReactNode;
  if (it.type === 'sjt') {
    body = (perm ?? it.opts.map((_, i) => i)).map(i => (
      <button key={i} className={`opt ${a === i ? 'sel' : ''}`} onClick={() => pick(i)}>{it.opts[i][0]}</button>
    ));
  } else {
    body = <Bipolar it={it} a={a} pick={pick} />;
  }

  return (
    <Shell next={{ label: '다음', onClick: () => go(1), disabled: a === undefined }}>
      <Top step={step} go={go} />
      <div className="part">{st.part}</div>
      {sit ? (<><p className="sit">상황</p><h2>{it.q}</h2><p className="help" style={{ marginTop: -8 }}>내 생각은 어느 쪽에 더 가까운가요?</p></>) : <h2>{it.q}</h2>}
      {body}
      <FlagBox k={st.id} />
    </Shell>
  );
}

function Bipolar({ it, a, pick }: { it: SliderItem; a: number | undefined; pick: (v: number) => void }) {
  const lc = a === 0 ? 'on' : a === 1 ? 'half' : a !== undefined && a >= 3 ? 'dim' : '';
  const rc = a === 4 ? 'on' : a === 3 ? 'half' : a !== undefined && a <= 1 ? 'dim' : '';
  const dotCls = ['l', 'l near', 'm', 'r near', 'r'];
  const aria = ['왼쪽 매우', '왼쪽', '반반', '오른쪽', '오른쪽 매우'];
  return (
    <>
      <div className="poles">
        <button className={`pole l ${lc}`} onClick={() => pick(a === 0 ? 1 : 0)} title="한 번 더 누르면 '가까워요'로 바뀌어요">{it.L[0]}</button>
        <button className={`pole r ${rc}`} onClick={() => pick(a === 4 ? 3 : 4)} title="한 번 더 누르면 '가까워요'로 바뀌어요">{it.R[0]}</button>
      </div>
      <div className="dots">
        {[0, 1, 2, 3, 4].map(i => <button key={i} className={`dot ${dotCls[i]} ${a === i ? 'sel' : ''}`} onClick={() => pick(i)} aria-label={aria[i]} />)}
      </div>
      <div className="dothint"><span>← 왼쪽</span><span>반반</span><span>오른쪽 →</span></div>
    </>
  );
}

function MdScreen({ st, step, go }: { st: Extract<Step, { kind: 'md' }>; step: number; go: (d: number) => void }) {
  const P = POOLS[st.pool], key = st.pool + st.idx;
  const m = (useStore(s => s.values.md[key]) ?? {}) as MdPick;
  const setValues = useStore(s => s.setValues);
  const pickMd = (which: 'w' | 'b', id: string) => setValues(x => {
    const cur = { ...((x.md[key] ?? {}) as MdPick) };
    const other = which === 'w' ? 'b' : 'w';
    if (cur[other] === id) delete cur[other];
    cur[which] = cur[which] === id ? undefined : id;
    return { ...x, md: { ...x.md, [key]: cur } };
  });
  return (
    <Shell next={{ label: '다음', onClick: () => go(1), disabled: !(m.w && m.b) }}>
      <Top step={step} go={go} />
      <div className="part">{P.part}</div>
      <h2>{P.q}</h2><p className="help">{P.help}</p>
      <div className="legend"><span className="n">{P.neg}</span><span className="p">{P.pos}</span></div>
      {st.set.map(id => (
        <div key={id} className={`md-card ${m.w === id ? 'neg' : ''} ${m.b === id ? 'pos' : ''}`}>
          <span className="t">{(P.cards as Record<string, readonly string[]>)[id][0]}</span>
          <button className={`md-btn neg ${m.w === id ? 'sel' : ''}`} onClick={() => pickMd('w', id)}>{P.neg}</button>
          <button className={`md-btn pos ${m.b === id ? 'sel' : ''}`} onClick={() => pickMd('b', id)}>{P.pos}</button>
        </div>
      ))}
      <FlagBox k={key} />
    </Shell>
  );
}

function TieScreen({ pool, t, step, go }: { pool: 'vice' | 'trait'; t: { ids: string[]; need: number }; step: number; go: (d: number) => void }) {
  const P = POOLS[pool], key = pool + 'Tie';
  const stored = useStore(s => s.values.md[key]) as TieRec | undefined;
  const setValues = useStore(s => s.setValues);
  const rec: TieRec = stored && stored.ids.join() === t.ids.join() ? stored : { ids: t.ids, need: t.need, picks: [] };
  const pickTie = (id: string) => setValues(x => {
    const picks = [...rec.picks], i = picks.indexOf(id);
    if (i >= 0) picks.splice(i, 1); else if (picks.length < rec.need) picks.push(id);
    return { ...x, md: { ...x.md, [key]: { ...rec, picks } } };
  });
  return (
    <Shell next={{ label: '다음', onClick: () => go(1), disabled: rec.picks.length !== t.need }}>
      <Top step={step} go={go} label="추가 1문항" />
      <div className="part">{P.part} · 순위 정하기</div>
      <h2 style={{ whiteSpace: 'pre-line' }}>{P.tieQ(t.need)}</h2>
      {t.ids.map(id => {
        const n = rec.picks.indexOf(id);
        return (
          <button key={id} className={`tie ${pool === 'trait' ? 'trait' : ''} ${n >= 0 ? 'sel' : ''}`} onClick={() => pickTie(id)}>
            <span className="no">{n >= 0 ? n + 1 : ''}</span>{(P.cards as Record<string, readonly string[]>)[id][0]}
          </button>
        );
      })}
    </Shell>
  );
}
