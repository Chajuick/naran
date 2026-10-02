// 처음 온 사람을 위한 소개 — 나란이 뭔지, 네 가지 검사, 다 모으면 무엇을 할 수 있는지
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Pieces, { PIECE_COLORS } from '../components/Pieces';
import { useStore } from '../store/useStore';

const MODULES = [
  { title: '가치관', sees: '관계에서 가장 소중한 가치는 무엇인가요?', how: '나란 검사 · 약 7분' },
  { title: '성격 · MBTI', sees: '어떻게 생각하고 정보를 다루나요?', how: '내 MBTI 결과 입력' },
  { title: '애착', sees: '가까운 사람과 어떻게 연결되나요?', how: '알고 있는 결과 입력 · 검사 준비 중' },
  { title: '기질', sees: '자극에 어떻게 반응하나요?', how: '알고 있는 결과 입력 · 검사 준비 중' },
];
const FLOAT_WORDS = ['책임', '헤아림', 'INFP', '안정형', '자율', '솔직', '자극 추구', '보살핌'];

export default function Welcome() {
  const profile = useStore(s => s.profile);
  const setProfile = useStore(s => s.setProfile);
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name ?? '');
  const who = name.trim() ? `${name.trim()}님` : '나';

  const finish = () => { setProfile({ ...profile, name: name.trim() || undefined, onboarded: true }); nav('/', { replace: true }); };
  const next = () => (step < 3 ? setStep(step + 1) : finish());
  const cta = ['시작하기', name.trim() ? '다음' : '이름 없이 계속하기', '다음', name.trim() ? `${name.trim()}님 채우러 가기` : '채우러 가기'][step];

  return (
    <>
      <div className="wrap welcome">
        <div className="top">
          {step > 0 ? <button className="back" onClick={() => setStep(step - 1)} aria-label="이전">‹</button> : <span />}
          <div className="steps-dots">{[0, 1, 2, 3].map(i => <i key={i} className={i === step ? 'on' : ''} />)}</div>
        </div>

        {step === 0 && (
          <div key="s0" className="anim hero-center">
            <div className="float-stage">
              {FLOAT_WORDS.map((w, i) => <span key={w} className={`float-word w${i}`} style={{ color: PIECE_COLORS[i % 4] }}>{w}</span>)}
              <Pieces filled={[true, true, true, true]} size={168} animate delay={0.3} />
            </div>
            <div className="brand big">나란</div>
            <h1>나라는 사람을<br />한 조각씩 채워가요</h1>
            <p className="lead">가치관, 성격, 애착, 기질. 흩어져 있던 나에 대한 조각을 한곳에 모아, 나를 더 정확하게 설명해 줄 거예요.</p>
          </div>
        )}

        {step === 1 && (
          <div key="s1" className="anim" style={{ paddingTop: 56 }}>
            <div className="part">반가워요</div>
            <h1>뭐라고 불러드릴까요?</h1>
            <p className="lead">결과 화면과 분석 자료에서 이 이름으로 불러드려요.</p>
            <input className="name-input" autoFocus maxLength={12} placeholder="이름이나 별명" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') next(); }} />
          </div>
        )}

        {step === 2 && (
          <div key="s2" className="anim" style={{ paddingTop: 40 }}>
            <div className="part">네 가지 조각</div>
            <h1>{who === '나' ? '나를' : `${who}을`} 네 방향에서<br />비춰봐요</h1>
            {MODULES.map((m, i) => (
              <div key={m.title} className="intro-mod" style={{ '--c': PIECE_COLORS[i] } as React.CSSProperties}>
                <span className="intro-dot" />
                <div><div className="intro-title">{m.title}<span>{m.sees}</span></div><div className="intro-how">{m.how}</div></div>
              </div>
            ))}
            <p className="note" style={{ marginTop: 14 }}>순서는 상관없어요. 하고 싶은 것부터 하나씩 채우면 돼요.</p>
          </div>
        )}

        {step === 3 && (
          <div key="s3" className="anim" style={{ paddingTop: 40 }}>
            <Pieces filled={[true, true, true, true]} size={96} label={name.trim() ? name.trim().slice(0, 2) : '나'} animate />
            <div className="part">조각이 모이면</div>
            <h1>{who === '나' ? '나를' : `${who}을`} 설명하는<br />자료가 생겨요</h1>
            <div className="benefit"><b>나를 분석해요</b><span>연애, 갈등, 일, 스트레스 상황에서 나는 어떤지, 전문가나 AI에게 전달해 분석해요.</span></div>
            <div className="benefit"><b>검사끼리 맞춰봐요</b><span>검사 사이의 긴장과 모순을 풀고, 변해가는 내 모습을 기록해요.</span></div>
            <div className="benefit"><b>나만 볼 수 있어요</b><span>모든 답은 이 기기에만 저장돼요. 나 이외의 누구도 들여다볼 수 없어요.</span></div>
          </div>
        )}
      </div>
      <div className="cta"><button onClick={next}>{cta}</button></div>
    </>
  );
}
