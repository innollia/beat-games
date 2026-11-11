// 글을 사도 말투로 바꾸는 규칙 엔진. 브라우저(window.TV)와 node(require) 둘 다에서 돈다.
(function (root) {
  const B = 0xAC00;
  const isH = c => c && c.charCodeAt(0) >= B && c.charCodeAt(0) <= 0xD7A3;
  const dec = c => { const n = c.charCodeAt(0) - B; return [Math.floor(n / 588), Math.floor((n % 588) / 28), n % 28]; };
  const com = (a, b, c) => String.fromCharCode(B + a * 588 + b * 28 + c);
  const jong = s => { const c = s.slice(-1); return isH(c) ? dec(c)[2] : 0; };
  const hasB = s => jong(s) !== 0;
  const J_B = 17, J_N = 4, J_SS = 20, J_L = 8;

  // 받침에 따라 조사 고르기
  function josa(w, a, b) { // a=받침 있을 때, b=없을 때
    const c = w.slice(-1);
    if (!isH(c)) return w + b;
    const j = dec(c)[2];
    if (a === '으로' && j === J_L) return w + '로';
    return w + (j ? a : b);
  }

  const IRR_B = /(덥|춥|어렵|쉽|귀엽|무섭|고맙|반갑|즐겁|아름답|가깝|맵|가볍|무겁|뜨겁|차갑|부럽|아깝|더럽|부끄럽|외롭|새롭|괴롭|싱겁|간지럽|사랑스럽|자랑스럽|놀랍|눕|굽|줍|돕|곱)$/;
  const IRR_D = /(듣|걷|묻|깨닫|싣)$/;
  const IRR_S = /(낫|짓|붓|잇)$/;
  const IRR_H = { 그렇: '그래', 이렇: '이래', 저렇: '저래', 어떻: '어때', 빨갛: '빨개', 노랗: '노래', 하얗: '하얘', 파랗: '파래', 까맣: '까매' };
  const bright = v => v === 0 || v === 8 || v === 2; // ㅏ ㅗ ㅑ

  // 용언 줄기 -> 해체(…어/…아)
  function conj(st) {
    if (!st) return st;
    for (const k in IRR_H) if (st.endsWith(k)) return st.slice(0, -k.length) + IRR_H[k];
    if (st.endsWith('하')) return st.slice(0, -1) + '해';
    if (st.endsWith('이') && st.length === 1) return '이야';
    const L = st.slice(-1), pre = st.slice(0, -1);
    if (!isH(L)) return st;
    const [c, v, j] = dec(L);
    if (j) {
      if (j === J_B && IRR_B.test(st)) return pre + com(c, v, 0) + ((st.endsWith('돕') || st.endsWith('곱')) ? '와' : '워');
      if (j === 7 && IRR_D.test(st)) return pre + com(c, v, J_L) + (bright(v) ? '아' : '어');
      if (j === 19 && IRR_S.test(st)) return pre + com(c, v, 0) + (bright(v) ? '아' : '어');
      if (j === J_SS) return st + '어'; // 했/갔 + 어
      return st + (bright(v) ? '아' : '어');
    }
    if (L === '르' && pre) { // 르 불규칙: 모르->몰라
      const P = pre.slice(-1), [pc, pv, pj] = dec(P);
      if (!pj) return pre.slice(0, -1) + com(pc, pv, J_L) + com(5, bright(pv) ? 0 : 4, 0);
    }
    switch (v) {
      case 8: return pre + com(c, 9, 0);   // 오->와
      case 11: return pre + com(c, 10, 0); // 되->돼
      case 13: return pre + com(c, 14, 0); // 주->줘
      case 20: return c === 11 ? st + '어' : pre + com(c, 6, 0); // 이->이어, 시->셔
      case 18: { // ㅡ 탈락: 쓰->써, 바쁘->바빠
        const P = pre.slice(-1); const pb = P && isH(P) && bright(dec(P)[1]);
        return pre + com(c, pb ? 0 : 4, 0);
      }
      case 16: case 19: return st + '어';
      default: return st; // 가 서 보내 세 켜
    }
  }

  // 체언 + 이다(해체)
  const cop = n => (hasB(n) ? n + '이야' : n + '야');

  // 문장 끝을 해체로 맞춘다. 반환: {v, da}
  const END_KEEP = /(어|아|야|지|네|까|자|래|게|걸|구나|거든|잖아|는데|은데|던데|고|해|돼|와|워|줘|봐|써|가|나|냐|니|대|구|군|라)$/;
  const FIXED = [[/안녕하세요$|안녕하십니까$|안녕하셨어요$/, '안녕', '안녕하세요', '안녕하십니까'], [/(감사합니다|감사해요|고맙습니다)$/, '고마워', '고마워요', '감사합니다'], [/(죄송합니다|죄송해요)$/, '미안해', '미안해요', '죄송합니다'], [/(실례합니다)$/, '실례할게', '실례할게요', '실례합니다']];
  function toBase(s) {
    let m;
    for (const [re, v, y, f] of FIXED) if (re.test(s)) { const h = s.replace(re, ''); return { v: h + v, y: h + y, f: h + f, da: null }; }
    if ((m = s.match(/^(.*?)(입니다|입니까|이에요|예요|이에여|이었어요|였어요|이었습니다|였습니다)$/))) {
      const n = m[1];
      if (/었|였/.test(m[2])) return { v: n + (/이었/.test(m[2]) ? '이었어' : '였어'), da: n + (/이었/.test(m[2]) ? '이었다' : '였다') };
      return { v: cop(n), da: hasB(n) ? n + '이다' : n + '다' };
    }
    if ((m = s.match(/^(.*)아니에요$/))) return { v: m[1] + '아니야', da: m[1] + '아니다' };
    if ((m = s.match(/^(.*)(습니다|습니까)$/))) {
      const st = m[1];
      return { v: conj(st), da: jong(st) === J_SS ? st + '다' : null };
    }
    if ((m = s.match(/^(.*)([가-힣])(니다|니까)$/)) && jong(m[2]) === J_B) {
      const [c, v] = dec(m[2]); const st = m[1] + com(c, v, 0);
      return { v: conj(st), da: null };
    }
    if ((m = s.match(/^(.*)([가-힣])시다$/)) && jong(m[2]) === J_B) {
      const [c, v] = dec(m[2]); let st = m[1] + com(c, v, 0);
      if (st.endsWith('으') && hasB(st.slice(0, -1))) st = st.slice(0, -1);
      return { v: st + '자', da: null };
    }
    if ((m = s.match(/^(.*?)(으세요|으십시오|으셔요|세요|십시오|셔요|시어요)$/))) return { v: conj(m[1]), da: null };
    const tbl = [['지요', '지'], ['죠', '지'], ['네요', '네'], ['군요', '구나'], ['거든요', '거든'], ['잖아요', '잖아'], ['데요', '데'], ['고요', '고'], ['까요', '까'], ['래요', '래'], ['게요', '게'], ['걸요', '걸'], ['나요', '나'], ['대요', '대'], ['라고요', '라고']];
    for (const [a, b] of tbl) if (s.endsWith(a)) return { v: s.slice(0, -a.length) + b, da: null };
    if (s.endsWith('요') && s.length > 1) {
      const r = s.slice(0, -1);
      if (END_KEEP.test(r) || jong(r) === 0) return { v: r, da: null };
    }
    if ((m = s.match(/^(.*)다$/)) && m[1]) {
      const st = m[1], L = st.slice(-1);
      if (jong(st) === J_SS) return { v: st + '어', da: s };
      if (st.endsWith('이') && st.length > 1) return { v: cop(st.slice(0, -1)), da: s };
      if (st.endsWith('는') && st.length > 1) return { v: conj(st.slice(0, -1)), da: s };
      if (isH(L) && jong(L) === J_N && st.length > 0) { const [c, v] = dec(L); return { v: conj(st.slice(0, -1) + com(c, v, 0)), da: s }; }
      if (isH(L) && /[가-힣]/.test(L)) return { v: conj(st), da: s };
    }
    return { v: s, da: null };
  }

  // 해체 -> 해요체
  function toPolite(v) {
    let m;
    if ((m = v.match(/^(.*)이야$/))) return m[1] + '이에요';
    if ((m = v.match(/^(.*)아니야$/))) return m[1] + '아니에요';
    if ((m = v.match(/^(.*)야$/)) && m[1] && !hasB(m[1])) return m[1] + '예요';
    if (v.endsWith('지')) return v.slice(0, -1) + '죠';
    if (v.endsWith('구나')) return v.slice(0, -2) + '군요';
    if ((m = v.match(/^(.*)자$/)) && m[1]) return conj(m[1]) + '요';
    if (/(냐|니)$/.test(v)) return v.slice(0, -1) + '나요';
    return v + '요';
  }
  // 해체 -> 다 체
  function toDa(v, da) {
    if (da) return da;
    let m;
    if ((m = v.match(/^(.*[았었였했겠])어$/))) return m[1] + '다';
    if ((m = v.match(/^(.*)이야$/))) return m[1] + '이다';
    if ((m = v.match(/^(.*)야$/)) && m[1] && !hasB(m[1])) return m[1] + '다';
    return v;
  }
  // 해체 -> 합쇼체(대략)
  function toFormal(v, da) {
    let m;
    if ((m = v.match(/^(.*)아니야$/))) return m[1] + '아닙니다';
    if ((m = v.match(/^(.*)이야$/))) return m[1] + '입니다';
    if ((m = v.match(/^(.*)야$/)) && m[1] && !hasB(m[1])) return m[1] + '입니다';
    if ((m = v.match(/^(.*[았었였했겠])어$/))) return m[1] + '습니다';
    return toPolite(v);
  }

  // 대명사 바꾸기
  const ME_RE = /^(나|저|난|날|내|제)(는|가|도|를|한테|에게|에게도|한테도|랑|하고|만|의|보다|처럼|부터|까지|야)?$/;
  const YOU_RE = /^(너|넌|널|니|네|당신|선생님|자기)(는|가|도|를|한테|에게|에게도|한테도|랑|하고|만|의|보다|처럼|부터|까지|이|은|을)?$/;
  function pron(word, p, kind) { // kind: 'top'|'sub'|'obj'|'pos'|raw particle
    const special = { 나: { sub: '내가', pos: '내' }, 저: { sub: '제가', pos: '제' } }[word] || {};
    if (kind === 'sub') return special.sub || josa(word, '이', '가');
    if (kind === 'top') return josa(word, '은', '는');
    if (kind === 'obj') return josa(word, '을', '를');
    if (kind === 'pos') return special.pos || word + '의';
    if (kind === 'ya') return hasB(word) ? word + '이야' : word + '야';
    return word + (p || '');
  }
  function swapPron(tok, prof) {
    const lead = tok.match(/^[^가-힣]*/)[0], tail = tok.match(/[^가-힣]*$/)[0];
    const w = tok.slice(lead.length, tok.length - tail.length);
    if (!w) return tok;
    let m;
    if (prof.me && (m = w.match(ME_RE))) {
      const [, b, p] = m;
      if (b === '저' && !p) return tok; // '저 사람'의 저일 수 있음
      let kind = p;
      if (b === '난') kind = 'top'; else if (b === '날') kind = 'obj';
      else if (b === '내' || b === '제') kind = p === '가' ? 'sub' : (p ? null : 'pos');
      else if (p === '는') kind = 'top'; else if (p === '가') kind = 'sub'; else if (p === '를') kind = 'obj'; else if (p === '의') kind = 'pos'; else if (p === '야') kind = 'ya';
      if (kind === null) return tok;
      const me = prof.me;
      return lead + (['top', 'sub', 'obj', 'pos', 'ya'].includes(kind) ? pron(me, p, kind) : me + (p || '')) + tail;
    }
    if (prof.you && (m = w.match(YOU_RE))) {
      const [, b, p] = m;
      if (b === '네' && p !== '가') return tok; // '네'(대답)일 수 있음
      if (b === '자기' && !p) return tok;
      let kind = p;
      if (b === '넌') kind = 'top'; else if (b === '널') kind = 'obj';
      else if (b === '네' || b === '니') kind = 'sub';
      else if (p === '는' || p === '은') kind = 'top'; else if (p === '가' || p === '이') kind = 'sub'; else if (p === '를' || p === '을') kind = 'obj'; else if (p === '의') kind = 'pos';
      const you = prof.you;
      return lead + (['top', 'sub', 'obj', 'pos'].includes(kind) ? pron(you, p, kind) : you + (p || '')) + tail;
    }
    return tok;
  }

  // 교주에게 쓰는 높임(시·드리)을 사도 말투에 맞게 푼다
  const addSS = w => { const L = w.slice(-1); if (!isH(L)) return w; const [c, v] = dec(L); return w.slice(0, -1) + com(c, v, J_SS); };
  function plain(tok, prof) {
    if (prof.honor) return tok;
    tok = tok.replace(/^([가-힣]+?)셨/, (_, st) => addSS(conj(st)));
    if (!/^(마|다|모|아|시|가시|어디)/.test(tok)) {
      tok = tok.replace(/^([가-힣]*[가-힣])으실/, '$1을').replace(/^([가-힣]*[가-힣])실(래|게|거|까|수)/, (_, st, e) => { const L = st.slice(-1); const [c, v, j] = dec(L); return j ? _ : st.slice(0, -1) + com(c, v, J_L) + e; });
      tok = tok.replace(/^([가-힣]*[가-힣])(으)?시(면|고|니|는|지|죠|며|던|겠)/, '$1$2$3');
    }
    tok = tok.replace(/드릴/g, '줄').replace(/드려/g, '줘').replace(/드리/g, '주').replace(/드렸/g, '줬');
    tok = tok.replace(/^(계셔|계세요|계십니다)/, '있어');
    return tok;
  }

  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const pick = (a, r) => a[Math.floor(r() * a.length)];

  // 문장 하나 바꾸기
  function sentence(raw, prof, r) {
    const m = raw.match(/^(\s*)([\s\S]*?)([\s.!?~…。,·♡♥ㅋㅎㅠㅜ^;:)\]"'”’]*?)(\s*)$/);
    let [, sp, body, punc, ws] = m;
    if (!body || !/[가-힣]$/.test(body)) return raw;
    body = body.split(/(\s+)/).map(t => /\S/.test(t) ? plain(swapPron(t, prof), prof) : t).join('');
    for (const [a, b] of prof.words || []) body = body.split(a).join(b);
    const type = punc.includes('?') ? 'ask' : punc.includes('!') ? 'excl' : 'decl';
    const base = toBase(body);
    const forms = { v: base.v, y: base.y || toPolite(base.v), d: toDa(base.v, base.da), f: base.f || toFormal(base.v, base.da) };
    const E = prof.endings || {};
    const tpls = (E[type] && E[type].length ? E[type] : null) || (type === 'excl' && E.decl) || E.decl || ['{v}'];
    let t = pick(tpls, r);
    let out = t.replace(/\{([vydf])\}/g, (_, k) => forms[k]);
    // 템플릿에 문장부호가 있으면 원래 것 대신 쓴다
    const tplPunc = /[.!?~♡]$/.test(t);
    let p = punc;
    if (tplPunc) p = punc.replace(/[.!?~]+/, '');
    if (type === 'ask' && !/\?/.test(out + p)) p = '?' + p;
    return sp + out + p + ws;
  }

  function convert(text, prof, seed = 1) {
    const r = rng(seed);
    const lines = text.split('\n');
    const out = lines.map(line => {
      if (!line.trim()) return line;
      const parts = line.match(/[^.!?~…\n]+[.!?~…ㅋㅎㅠㅜ^♡♥\s]*|[.!?~…]+/g) || [line];
      return parts.map(s => sentence(s, prof, r)).join('');
    });
    let res = out.join('\n');
    const first = res.search(/\S/);
    if (prof.before && prof.before.length && r() < (prof.beforeRate ?? 0.5) && first >= 0) res = res.slice(0, first) + pick(prof.before, r) + ' ' + res.slice(first);
    if (prof.after && prof.after.length && r() < (prof.afterRate ?? 0.5)) res = res.replace(/\s*$/, '') + ' ' + pick(prof.after, r);
    return res;
  }

  const api = { convert, toBase, toPolite, toDa, toFormal, conj, swapPron };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TV = api;
})(this);
