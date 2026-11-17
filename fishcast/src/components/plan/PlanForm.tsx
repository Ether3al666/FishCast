import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { GeoLocation, PlanRequest, FishingMethod } from '../../domain/models';
import { MAIN_CITY_DISTRICTS, OUTER_DISTRICTS, type SearchArea } from '../../config/regions';
export function PlanForm({
  location,
  onSubmit,
  onChange,
}: {
  location: GeoLocation;
  onSubmit: (request: PlanRequest) => void;
  onChange: () => void;
}) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
    new Date(Date.now() + 86400000),
  );
  const [date, setDate] = useState(tomorrow),
    [start, setStart] = useState('06:00'),
    [end, setEnd] = useState('12:00');
  const [species, setSpecies] = useState('鲫鱼'),
    [method, setMethod] = useState<FishingMethod>('TAIDIAO'),
    [radius, setRadius] = useState(30),
    [error, setError] = useState('');
  const [searchArea, setSearchArea] = useState<SearchArea | undefined>();
  return (
    <form
      onChange={onChange}
      onSubmit={(event) => {
        event.preventDefault();
        const startAt = `${date}T${start}:00+08:00`,
          endAt = `${date}T${end}:00+08:00`;
        if (
          date < today ||
          !(new Date(endAt) > new Date(startAt)) ||
          new Date(startAt).getTime() < Date.now()
        ) {
          setError('请选择未来日期与时间，并让结束时间晚于开始时间。');
          return;
        }
        setError('');
        onSubmit({
          location,
          targetSpecies: species,
          method,
          radiusKm: radius,
          searchArea,
          startAt,
          endAt,
        });
      }}
    >
      <div className="form-row">
        <label className="field">
          目标鱼种
          <select value={species} onChange={(e) => setSpecies(e.target.value)}>
            <option>鲫鱼</option>
            <option>鲤鱼</option>
            <option>草鱼</option>
            <option>暂不限定</option>
          </select>
        </label>
        <label className="field">
          钓法
          <select value={method} onChange={(e) => setMethod(e.target.value as FishingMethod)}>
            <option value="TAIDIAO">台钓</option>
            <option value="LUYA">路亚</option>
            <option value="OTHER">其他</option>
          </select>
        </label>
      </div>
      <label className="field">
        出钓日期（北京时间）
        <input
          type="date"
          value={date}
          min={today}
          max={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(
            new Date(Date.now() + 6 * 86400000),
          )}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>
      <div className="form-row">
        <label className="field">
          开始时间
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="field">
          结束时间
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
      </div>
      <label className="field">
        查找区域
        <select
          value={searchArea ?? ''}
          onChange={(e) => setSearchArea((e.target.value || undefined) as SearchArea | undefined)}
        >
          <option value="">按公里半径</option>
          <option value="CHONGQING">全重庆 · 不限半径</option>
          <option value="MAIN_CITY">主城九区 · 不限半径</option>
          <optgroup label="主城九区（传统口径）">
            {MAIN_CITY_DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </optgroup>
          <optgroup label="现行新区">
            <option>两江新区</option>
          </optgroup>
          <optgroup label="其他区县">
            {OUTER_DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </optgroup>
        </select>
      </label>
      {!searchArea && (
        <label className="field range-label">
          搜索半径 <b>{radius} km</b>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary submit" type="submit">
        核查出钓计划 <ArrowRight size={17} />
      </button>
    </form>
  );
}
