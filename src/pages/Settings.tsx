// 설정 — 이름, 소개 다시 보기, 백업 내보내기·가져오기, 전체 삭제
// 모든 기록이 이 기기(localStorage)에만 있으므로 백업 파일이 유일한 옮기기 수단이다
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { APP_VERSION, BUILD_ID } from '../lib/appUpdate';

const BACKUP_KIND = 'naran-backup';

export default function Settings() {
  const { profile, history, setProfile } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState(profile.name ?? '');
  const [msg, setMsg] = useState('');
  const [armed, setArmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const { profile, values, mbti, attach, temper, history } = useStore.getState();
    const data = { kind: BACKUP_KIND, version: 1, exportedAt: new Date().toISOString(), state: { profile, values, mbti, attach, temper, history } };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `naran-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('백업 파일을 저장했어요.');
  };

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (data.kind !== BACKUP_KIND || !data.state || !Array.isArray(data.state.history)) throw new Error('형식');
      const s = data.state;
      useStore.setState({ profile: s.profile ?? {}, values: s.values, mbti: s.mbti, attach: s.attach, temper: s.temper, history: s.history });
      setName(s.profile?.name ?? '');
      setMsg(`가져왔어요. ${s.history.length}회차 기록이 들어왔어요.`);
    } catch {
      setMsg('나란 백업 파일이 아니에요. 다시 확인해 주세요.');
    }
  };

  const wipe = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
    useStore.setState({ profile: {}, values: { step: 0, ans: {}, md: {}, perm: {}, flags: {}, selfRating: {} }, mbti: { letters: {}, pct: {} }, attach: {}, temper: { pct: {} }, history: [] });
    nav('/welcome', { replace: true });
  };

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="top"><Link className="back" to="/" aria-label="나로">‹</Link><span className="count" style={{ marginLeft: 'auto' }}>설정</span></div>
      <h1 style={{ marginTop: 16 }}>설정</h1>

      <div className="sec" style={{ marginTop: 20 }}>이름</div>
      <div className="card">
        <input className="name-input" style={{ marginTop: 0, fontSize: 20, background: 'transparent' }} maxLength={12} placeholder="이름이나 별명" value={name} onChange={e => setName(e.target.value)} />
        <button className="ghost" style={{ marginTop: 12, background: '#fff' }} disabled={name.trim() === (profile.name ?? '')}
          onClick={() => { setProfile({ ...profile, name: name.trim() || undefined }); setMsg('이름을 바꿨어요.'); }}>저장</button>
      </div>

      <div className="sec">내 기록 옮기기</div>
      <div className="card">
        <p className="note" style={{ marginTop: 0 }}>모든 기록은 이 기기에만 있어요. 휴대폰을 바꾸거나 브라우저 기록을 지우면 사라지니, 가끔 백업해 두세요. 지금 {history.length}회차 기록이 있어요.</p>
        <button className="ghost" style={{ background: '#fff' }} onClick={exportBackup}>백업 파일로 저장</button>
        <button className="ghost" style={{ background: '#fff' }} onClick={() => fileRef.current?.click()}>백업 파일 불러오기</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ''; }} />
        <p className="note" style={{ marginBottom: 0 }}>불러오면 지금 기기의 기록은 백업 내용으로 바뀌어요.</p>
      </div>
      {msg && <p className="toast">{msg}</p>}

      <div className="sec">나란</div>
      <Link to="/welcome" className="setting-row">소개 다시 보기<span>›</span></Link>
      <div className="setting-row static">앱 버전<span>v{APP_VERSION} · {BUILD_ID.split('-').pop()}</span></div>
      <div className="setting-row static">가치관 검사 버전<span>v0.4.5 · 검증 중</span></div>
      <button className="setting-row danger" onClick={wipe}>{armed ? '한 번 더 누르면 모든 기록이 지워져요' : '모든 기록 지우기'}</button>
    </div>
  );
}
