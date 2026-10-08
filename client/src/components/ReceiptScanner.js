import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Loader2, CheckCircle2, AlertTriangle, RefreshCw, Edit3, Zap } from 'lucide-react';

const NOISE = /пдв|pdv|знижк|бонус|комісія|rrn|код авт|решта|нарахован|списано|початок|залишок|баланс|касир|без\s*знижки/i;

const KEYWORDS = [
  { re: /\bсума\b/i,               pri: 10 },
  { re: /підсумок/i,                pri:  9 },
  { re: /\bразом\b/i,               pri:  8 },
  { re: /до\s+сплати/i,             pri:  7 },
  { re: /безготівков/i,              pri:  5 },
  { re: /\bготівка\b/i,              pri:  4 },
  { re: /\d\s*(?:ГРН|грн|UAH)\s*$/, pri:  3 },
];

function parseNum(raw) {
  let s = raw.trim();
  const spaceDecimal = s.match(/^(\d+)\s+(\d{2})$/);
  if (spaceDecimal) s = `${spaceDecimal[1]}.${spaceDecimal[2]}`;
  s = s.replace(/\s/g, '').replace(',', '.');
  const v = parseFloat(s);
  return Number.isFinite(v) && v > 1.0 && v < 50000 ? v : null;
}

function collectCandidates(text, boost = 0) {
  const results = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || NOISE.test(line)) continue;
    let pri = 0;
    for (const { re, pri: p } of KEYWORDS) {
      if (re.test(line) && p > pri) pri = p;
    }
    if (pri === 0) continue;
    for (const pat of [/(\d{1,6}\s\d{2})\b/g, /(\d[\d\s]*[,.]?\d{2})\b/g]) {
      for (const m of line.matchAll(pat)) {
        const v = parseNum(m[1]);
        if (v && v > 1.0) results.push({ pri: pri + boost, v, line });
      }
    }
  }
  return results;
}

function consensusPick(allCands) {
  if (!allCands.length) return { amount: null, confidence: 'low', line: '' };
  const maxPri = Math.max(...allCands.map(c => c.pri));
  const top    = allCands.filter(c => c.pri >= Math.max(maxPri - 2, 3));
  const groups = new Map();
  for (const c of top) {
    const b = Math.round(c.v * 2) / 2;
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b).push(c);
  }
  const [, bestGroup] = [...groups.entries()].reduce((best, cur) => {
    const [, bg] = best;
    const [, cg] = cur;
    const cScore = [cg.length, Math.max(...cg.map(c => c.pri))];
    const bScore = [bg.length, Math.max(...bg.map(c => c.pri))];
    return cScore[0] > bScore[0] || (cScore[0] === bScore[0] && cScore[1] > bScore[1]) ? cur : best;
  });
  const winner = bestGroup.reduce((a, b) => (a.pri >= b.pri ? a : b));
  const votes  = bestGroup.length;
  const confidence =
    votes >= 2 || winner.pri >= 9 ? 'high' :
    winner.pri >= 7               ? 'high' :
    winner.pri >= 5               ? 'medium' : 'low';
  return { amount: winner.v, confidence, line: winner.line };
}

function upscaleImage(file, scale, contrast) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c   = document.createElement('canvas');
      c.width   = img.naturalWidth  * scale;
      c.height  = img.naturalHeight * scale;
      const ctx = c.getContext('2d');
      ctx.filter = `contrast(${contrast * 100}%)`;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(resolve, 'image/png');
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function runTesseract(file, onProgress) {
  const ocr = (src, psm) =>
    Tesseract.recognize(src, 'ukr+eng', {
      logger: m => {
        if (m.status === 'recognizing text' && psm === 6)
          onProgress(Math.round(m.progress * 55));
      },
      tessedit_pageseg_mode: psm,
    }).then(r => r.data.text);

  const [t6, t4] = await Promise.all([ocr(file, 6), ocr(file, 4)]);
  onProgress(60);
  const upBlob  = await upscaleImage(file, 3, 1.5);
  onProgress(65);
  const tUp = await Tesseract.recognize(upBlob, 'ukr+eng', {
    logger: m => {
      if (m.status === 'recognizing text')
        onProgress(65 + Math.round(m.progress * 20));
    },
    tessedit_pageseg_mode: 6,
  }).then(r => r.data.text);
  onProgress(86);

  const allCands = [
    ...collectCandidates(t6,  0),
    ...collectCandidates(t4,  0),
    ...collectCandidates(tUp, 1),
  ];
  return consensusPick(allCands);
}

const VISION_SYSTEM = `You are a receipt OCR parser. Extract ONLY the final purchase total from the receipt image.
The total is labelled: СУМА, Сума, ПІДСУМОК, РАЗОМ, До сплати, or TOTAL.
Ignore: ПДВ/VAT lines, ЗНИЖКА/discount, РЕШТА/change, ГОТІВКА if it differs from total.

Return ONLY a raw JSON object — no markdown, no explanation:
{"amount": number, "currency": "UAH"|"USD"|"EUR", "confidence": "high"|"medium"|"low"}

If you cannot find the total, return {"amount": 0, "confidence": "low", "currency": "UAH"}.`;

async function runVisionFallback(file, onProgress) {
  const toBase64 = f => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const mimeType = file.type?.startsWith('image/') ? file.type : 'image/jpeg';
  const base64   = await toBase64(file);
  onProgress(92);

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 120,
      system: VISION_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text',  text: 'Return only the JSON with the total amount.' },
        ],
      }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Vision API ${resp.status}`);
  }

  const data  = await resp.json();
  const raw   = (data.content || []).map(b => b.text || '').join('').trim()
                  .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  onProgress(98);

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Не вдалося розпізнати відповідь Vision API');
    parsed = JSON.parse(m[0]);
  }

  return {
    amount:     parsed.amount > 0 ? parsed.amount : null,
    confidence: parsed.amount > 0 ? (parsed.confidence || 'medium') : 'low',
    line:       `Vision API: ${parsed.amount > 0 ? parsed.amount : '—'} ${parsed.currency || 'UAH'}`,
    source:     'vision',
  };
}

function needsFallback(tessResult) {
  if (!tessResult.amount || tessResult.amount < 5)   return true;
  if (tessResult.confidence === 'low')               return true;
  return false;
}

const SOURCE_LABEL = { tesseract: 'Tesseract OCR', vision: 'Vision AI' };
const SOURCE_COLOR = {
  tesseract: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  vision:    'text-purple-600 bg-purple-50 border-purple-200',
};

const CONF_STYLE = {
  high:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700   bg-amber-50   border-amber-200',
  low:    'text-red-600     bg-red-50     border-red-200',
};
const CONF_LABEL = {
  high:   'Розпізнано',
  medium: 'Перевірте суму',
  low:    'Введіть вручну',
};

const ReceiptScanner = ({ onScanComplete }) => {
  const [phase,      setPhase]      = useState('idle');
  const [progress,   setProgress]   = useState(0);
  const [statusMsg,  setStatusMsg]  = useState('');
  const [result,     setResult]     = useState(null);
  const [errMsg,     setErrMsg]     = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editing,    setEditing]    = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setPhase('idle'); setResult(null); setErrMsg('');
    setProgress(0); setStatusMsg(''); setEditing(false); setEditAmount('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase('scanning'); setProgress(0); setResult(null); setErrMsg('');

    try {

      setStatusMsg('Сканування…');
      const tessResult = await runTesseract(file, setProgress);
      setProgress(88);

      let final = { ...tessResult, source: 'tesseract' };


      if (needsFallback(tessResult)) {
        setStatusMsg('Vision AI (fallback)…');
        setProgress(90);
        try {
          const visionResult = await runVisionFallback(file, setProgress);
          if (visionResult.amount && visionResult.amount > (tessResult.amount || 0)) {
            final = visionResult;
          }
        } catch (vErr) {

          console.warn('[ReceiptScanner] Vision fallback failed:', vErr.message);
          final.visionError = vErr.message;
        }
      }

      setProgress(100);
      setStatusMsg('');
      setResult(final);
      setEditAmount(final.amount != null ? String(final.amount) : '');
      setPhase('done');

      if (final.amount) {
        onScanComplete({ amount: String(final.amount), confidence: final.confidence });
      }

    } catch (err) {
      console.error('[ReceiptScanner]', err);
      setErrMsg(err.message || 'Помилка сканування');
      setPhase('error');
    }
  };

  const commitEdit = () => {
    const v = parseFloat(editAmount.replace(',', '.'));
    if (!isNaN(v) && v > 0) {
      onScanComplete({ amount: String(v), confidence: 'medium' });
    }
    setEditing(false);
  };


  if (phase === 'idle') return (
    <div className="w-full mb-6">
      <label className="flex flex-col items-center justify-center gap-4 p-8 rounded-[35px] border-4 border-dashed bg-orange-50/50 border-orange-100 hover:border-orange-400 cursor-pointer transition-all group">
        <Camera className="text-orange-400 group-hover:text-orange-500 transition-colors" size={48} />
        <div className="text-center">
          <span className="block font-black text-orange-600 uppercase text-xs tracking-widest">
            Сканування чеку
          </span>
          <p className="text-[10px] text-orange-400 font-bold uppercase mt-1 tracking-tighter">
            Автоматичне розпізнавання суми
          </p>
        </div>
        <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={handleFile} />
      </label>
    </div>
  );


  if (phase === 'scanning') return (
    <div className="w-full mb-6 flex flex-col items-center gap-4 p-8 rounded-[35px] bg-orange-50/50 border-4 border-orange-100">
      <Loader2 className="animate-spin text-orange-500" size={44} />
      <div className="text-center">
        <p className="font-black text-orange-600 uppercase text-xs tracking-widest">
          {statusMsg || 'Розпізнавання…'} {progress}%
        </p>
        <p className="text-[10px] text-orange-400 font-bold uppercase mt-1">
          {progress < 88 ? '· Пошук СУМИ ·' : 'Vision AI · Резервний аналіз'}
        </p>
      </div>
      <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: progress >= 88
              ? 'linear-gradient(90deg,#a78bfa,#7c3aed)'
              : '#f97316',
          }}
        />
      </div>
    </div>
  );


  if (phase === 'error') return (
    <div className="w-full mb-6 space-y-3">
      <div className="flex items-start gap-3 p-5 rounded-3xl bg-red-50 border border-red-100">
        <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-black text-red-700 text-sm uppercase tracking-wider">Помилка сканування</p>
          <p className="text-[11px] text-red-500 font-medium mt-1">{errMsg}</p>
        </div>
      </div>
      <button onClick={reset}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl bg-white border border-gray-200 font-black uppercase text-[10px] tracking-widest text-gray-500 hover:text-orange-600 transition-all">
        <RefreshCw size={14} /> Спробувати ще раз
      </button>
    </div>
  );


  if (phase === 'done' && result) {
    const source  = result.source || 'tesseract';
    const confCls = CONF_STYLE[result.confidence] ?? CONF_STYLE.low;
    const confLbl = CONF_LABEL[result.confidence] ?? 'Перевірте';

    return (
      <div className="w-full mb-6 space-y-3">
        <div className="p-5 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-3">

          {}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
              <span className="font-black text-gray-800 text-sm uppercase tracking-wide">
                Чек оброблено
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {}
              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${SOURCE_COLOR[source]}`}>
                {source === 'vision' && <Zap size={9} className="inline mr-1" />}
                {SOURCE_LABEL[source]}
              </span>
              {}
              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${confCls}`}>
                {confLbl}
              </span>
            </div>
          </div>

          {}
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number" step="0.01" min="0"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitEdit()}
                className="flex-1 p-3 bg-gray-50 rounded-2xl border-2 border-orange-300 font-black text-2xl text-orange-600 outline-none focus:ring-2 ring-orange-400"
                autoFocus
              />
              <span className="font-black text-orange-400 text-lg">₴</span>
              <button onClick={commitEdit}
                className="px-5 py-3 bg-black text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-orange-600 transition-all">
                ОК
              </button>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tighter ${result.amount ? 'text-orange-500' : 'text-gray-300'}`}>
                {result.amount
                  ? result.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })
                  : '—'}
              </span>
              {result.amount && <span className="font-black text-orange-400 text-sm">₴</span>}
              <button onClick={() => setEditing(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-all">
                <Edit3 size={11} /> Виправити
              </button>
            </div>
          )}

          {}
          {result.line && (
            <p className="text-[10px] text-gray-400 font-mono bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 truncate">
              «{result.line.replace(/^\[3x\]\s*/, '').substring(0, 60)}»
            </p>
          )}

          {}
          {result.visionError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={13} />
              <p className="text-[10px] text-amber-700 font-bold leading-snug">
                Vision AI недоступний ({result.visionError}). Показано результат Tesseract.
              </p>
            </div>
          )}

          {}
          {result.confidence === 'low' && !result.visionError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={13} />
              <p className="text-[10px] text-amber-700 font-bold leading-snug">
                Рядок СУМА не знайдено. Введіть суму вручну або перефотографуйте чек ближче і рівніше.
              </p>
            </div>
          )}
        </div>

        <button onClick={reset}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-gray-200 font-black uppercase text-[9px] tracking-widest text-gray-500 hover:text-orange-500 hover:border-orange-200 transition-all">
          <RefreshCw size={12} /> Сканувати новий чек
        </button>
      </div>
    );
  }

  return null;
};

export default ReceiptScanner;