import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Waves, Plus, SlidersHorizontal, CloudSun, MapPin } from 'lucide-react';
import type { Forecast, GeoLocation, PlanRequest, Spot } from '../../domain/models';
import {
  createTripRequest,
  methodLabel,
  parseTripMessage,
  type TripDraft,
} from '../../planners/conversationPlanner';
import { PlanForm } from './PlanForm';
import { TripResults, PlaceTripResults } from './TripResults';
import { areaLabel, matchesArea } from '../../config/regions';
import {
  classifyTripQuestion,
  createWeatherRequest,
  type ConversationTopic,
} from '../../planners/conversationIntent';
import { WeatherConversation } from './WeatherConversation';

type Report = {
  request: PlanRequest;
  version: string;
  topic: ConversationTopic;
  spot?: Spot;
};
type Message = { id: number; role: 'user' | 'assistant'; text: string; report?: Report };
const starters = [
  '明天上午，台钓鲫鱼，30公里以内',
  '明天上午，看看主城九区',
  '明天上午，看看全重庆',
  '后天下午，想试试路亚',
  '先看看明天上午的天气',
];

export function AgentPlanner({
  location,
  locationLabel,
  forecast,
  spots,
  loading,
  error,
  onRefresh,
}: {
  location: GeoLocation;
  locationLabel: string;
  forecast: Forecast | null;
  spots: Spot[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}) {
  const [draft, setDraft] = useState<TripDraft>({});
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [formVersion, setFormVersion] = useState(0);
  const [topic, setTopic] = useState<ConversationTopic>({ intent: 'SPOTS', focus: 'overview' });
  const [selectedSpot, setSelectedSpot] = useState<Spot | undefined>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages]);
  const sequence = useRef(0);
  const version = `${forecast?.fetchedAt}/${forecast?.stale}/${forecast?.isDemo}/${loading}`;
  const [invalidated, setInvalidated] = useState(false);
  const addExchange = (text: string, response: string, report?: Report) =>
    setMessages((old) => [
      ...old,
      { id: sequence.current++, role: 'user', text },
      { id: sequence.current++, role: 'assistant', text: response, report },
    ]);
  const makeReport = (request: PlanRequest, nextTopic = topic, spot?: Spot): Report => ({
    request,
    version,
    topic: nextTopic,
    spot,
  });
  const submitText = (text: string) => {
    if (!text.trim()) return;
    setInput('');
    if (
      /收费|多少钱|费用|营业|开放|门票|买.*装备/.test(text) &&
      !/天气|下雨|降水|气温|温度|风速/.test(text)
    ) {
      addExchange(
        text,
        selectedSpot
          ? `${selectedSpot.name}的费用、营业时间与现场安排尚无最新资料，可打开场所资料查看来源并联系场所。`
          : '场所费用和营业安排需要具体地点。先告诉我想了解哪个场所；我可以展示已有资料，缺少的内容会直接说明。',
      );
      return;
    }
    const mentioned = spots.filter((spot) => text.includes(spot.name));
    const namedSpots = mentioned.filter(
      (spot) =>
        !mentioned.some((other) => other.name !== spot.name && other.name.includes(spot.name)),
    );
    if (namedSpots.length > 1) {
      addExchange(
        text,
        `这句话提到了多个场所：${namedSpots.map((spot) => `${spot.name}（${spot.district}）`).join('、')}。请先指定一个场所，我再查询对应位置。`,
      );
      return;
    }
    const namedSpot = namedSpots.length === 1 ? namedSpots[0] : undefined;
    const nextTopic = classifyTripQuestion(text, topic);
    const isWeather = nextTopic.intent !== 'SPOTS';
    const fullDay = isWeather && /全天|整天/.test(text);
    const parseText = (namedSpot ? text.replace(namedSpot.name, '') : text).replace(
      isWeather ? /全天|一整天|整天/g : /$^/,
      '',
    );
    const parsed = parseTripMessage(parseText, draft);
    if (parsed.issues.length) {
      addExchange(text, parsed.issues.join(' '));
      return;
    }
    if (!parsed.recognized.length && !nextTopic.explicit && !namedSpot && !fullDay) {
      addExchange(
        text,
        '这句话我还没理解。可以问“明天上午会下雨吗”“风大不大”“几点去合适”，也可以说“找几个附近钓点”。',
      );
      return;
    }
    const nextDraft = { ...parsed.draft };
    if (
      fullDay ||
      (isWeather &&
        nextTopic.explicit &&
        parsed.recognized.includes('日期') &&
        !parsed.recognized.includes('时段'))
    ) {
      delete nextDraft.start;
      delete nextDraft.end;
    }
    const referenceOnly = /(?:当前|现在的|出发)?参考位置|当前位置|(?:查|看)出发地天气/.test(text);
    if (referenceOnly || (/附近/.test(text) && !parsed.recognized.includes('区域')))
      delete nextDraft.searchArea;
    let spot = namedSpot ?? selectedSpot;
    if (
      referenceOnly ||
      (parsed.recognized.includes('区域') && spot && !matchesArea(spot, nextDraft.searchArea)) ||
      parsed.recognized.includes('范围')
    )
      spot = undefined;
    if (namedSpot && !matchesArea(namedSpot, nextDraft.searchArea)) delete nextDraft.searchArea;
    setSelectedSpot(spot);
    setTopic(nextTopic);
    setDraft(nextDraft);
    const result =
      nextTopic.intent === 'SPOTS'
        ? createTripRequest(nextDraft, spot?.location ?? location)
        : createWeatherRequest(nextDraft, spot?.location ?? location);
    if (result.issue) {
      setInvalidated(true);
      addExchange(
        text,
        `${parsed.recognized.length ? `已记录${parsed.recognized.join('、')}。` : ''}${result.issue}`,
      );
      return;
    }
    setInvalidated(false);
    addExchange(
      text,
      nextTopic.intent === 'WEATHER'
        ? {
            overview: '先看你问的这段天气。',
            rain: '看看这段时间的降雨预报。',
            wind: '看看这段时间的风速。',
            temperature: '看看这段时间的气温变化。',
          }[nextTopic.focus]
        : nextTopic.intent === 'TIMING'
          ? '按这段时间的降水和风速，比较适合安排的时段。'
          : `${nextDraft.searchArea ? areaLabel(nextDraft.searchArea) : `以${spot?.name ?? locationLabel}为中心，${nextDraft.radius ?? 30} 公里内`}的场所在下面，选一个可以继续查当地天气。`,
      makeReport(result.request!, nextTopic, spot),
    );
  };
  const exactSubmit = (request: PlanRequest) => {
    const nextTopic: ConversationTopic = { intent: 'SPOTS', focus: 'overview' };
    setTopic(nextTopic);
    setSelectedSpot(undefined);
    setDraft({
      date: request.startAt.slice(0, 10),
      start: request.startAt.slice(11, 16),
      end: request.endAt.slice(11, 16),
      species: request.targetSpecies,
      method: request.method,
      radius: request.radiusKm,
      searchArea: request.searchArea,
    });
    setInvalidated(false);
    addExchange('按精确设置核查这次出钓计划。', '已读取你的出行条件，核查结果已生成。', {
      request,
      version,
      topic: nextTopic,
    });
  };
  return (
    <div className="agent-layout">
      <section className="agent-workspace" aria-label="对话式出钓规划">
        <div className="agent-toolbar">
          <button
            onClick={() => {
              setMessages([]);
              setDraft({});
              setTopic({ intent: 'SPOTS', focus: 'overview' });
              setSelectedSpot(undefined);
              setInput('');
              setInvalidated(false);
              setFormVersion((v) => v + 1);
              inputRef.current?.focus();
            }}
          >
            <Plus size={15} />
            新对话
          </button>
        </div>
        {messages.length > 2 && (
          <details className="agent-history">
            <summary>之前的对话（{messages.length - 2} 条）</summary>
            {messages.slice(0, -2).map((m) => (
              <p key={m.id} className={`agent-history-message ${m.role}`}>
                <b>{m.role === 'user' ? '你' : 'FishCast'}：</b>
                {m.text}
              </p>
            ))}
          </details>
        )}
        <div
          ref={conversationRef}
          className="agent-conversation"
          role="log"
          aria-label="规划对话"
          aria-live="polite"
        >
          {!messages.length && (
            <div className="agent-welcome">
              <span className="agent-emblem">
                <Waves size={36} strokeWidth={1} />
              </span>
              <h2>把时间留给水边</h2>
              <div className="agent-starters">
                {starters.map((text) => (
                  <button key={text} onClick={() => submitText(text)}>
                    {text}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.slice(-2).map((message) => (
            <article
              className={`agent-message ${message.role}`}
              key={message.id}
              aria-label={message.role === 'assistant' ? 'FishCast 的回复' : '你的消息'}
            >
              <p>{message.text}</p>
              {message.report && (
                <div className="agent-report">
                  {(message.report.topic.intent === 'SPOTS' &&
                    message.report.version !== version) ||
                  invalidated ? (
                    <p className="notice warning">
                      条件或天气已变化，这份核查已失效。请发送新条件或重新核查。
                    </p>
                  ) : message.report.topic.intent !== 'SPOTS' ? (
                    <WeatherConversation
                      key={message.id}
                      request={message.report.request}
                      topic={message.report.topic}
                      spot={message.report.spot}
                      spots={spots}
                      forecast={forecast}
                      loading={loading}
                      error={error}
                      locationLabel={locationLabel}
                      onRefresh={onRefresh}
                      onAsk={submitText}
                      onSelect={setSelectedSpot}
                    />
                  ) : message.report.spot?.location ? (
                    <PlaceTripResults
                      spot={message.report.spot}
                      request={message.report.request}
                      spots={spots}
                      onAdjust={submitText}
                      onSelect={setSelectedSpot}
                    />
                  ) : (
                    <TripResults
                      request={message.report.request}
                      spots={spots}
                      forecast={forecast}
                      onAdjust={submitText}
                      onSelect={setSelectedSpot}
                    />
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
        <form
          className="agent-composer"
          onSubmit={(e) => {
            e.preventDefault();
            submitText(input);
          }}
        >
          <textarea
            ref={inputRef}
            id="trip-message"
            aria-label="告诉助手你的出钓想法"
            value={input}
            maxLength={500}
            rows={2}
            onChange={(e) => setInput(e.target.value)}
            placeholder="问问天气、找个钓点，或接着聊刚才的计划…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submitText(input);
              }
            }}
          />
          <div>
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="发送消息"
              title="发送（Enter）；Shift + Enter 换行"
            >
              <ArrowUp size={19} />
            </button>
          </div>
        </form>
      </section>
      <aside className="agent-sidebar" aria-label="出行草稿">
        <div className="agent-draft">
          <h2>出行草稿</h2>
          <dl>
            <dt>{selectedSpot ? '所选场所' : '出发地'}</dt>
            <dd>
              <MapPin size={14} />
              {selectedSpot?.name ?? locationLabel}
            </dd>
            <dt>日期 / 时段</dt>
            <dd>
              {draft.date ?? '待定'}
              {draft.date && (
                <>
                  <br />
                  {draft.start
                    ? `${draft.start}–${draft.end}`
                    : topic.intent === 'SPOTS'
                      ? '时段待定'
                      : '全天'}
                </>
              )}
            </dd>
            {(draft.species || draft.method) && (
              <>
                <dt>鱼种 / 钓法</dt>
                <dd>
                  {draft.species ?? '暂不限定'} / {methodLabel(draft.method)}
                </dd>
              </>
            )}
            <dt>探索范围</dt>
            <dd>{draft.searchArea ? areaLabel(draft.searchArea) : `${draft.radius ?? 30} km`}</dd>
          </dl>
          <button
            className="agent-recheck"
            disabled={!draft.date || (topic.intent === 'SPOTS' && !draft.start) || loading}
            onClick={() => {
              const result =
                topic.intent === 'SPOTS'
                  ? createTripRequest(draft, selectedSpot?.location ?? location)
                  : createWeatherRequest(draft, selectedSpot?.location ?? location);
              setInvalidated(false);
              addExchange(
                '重新核查当前草稿。',
                result.issue ?? '已按当前天气和候选资料重新核查。',
                result.request ? makeReport(result.request, topic, selectedSpot) : undefined,
              );
            }}
          >
            重新核查草稿 <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="agent-data">
          <CloudSun size={21} />
          <div>
            <strong>
              {loading
                ? '正在读取天气'
                : forecast?.isDemo
                  ? 'DEMO / 示例天气'
                  : forecast?.stale
                    ? '非实时天气缓存'
                    : forecast
                      ? '天气已更新'
                      : '天气暂不可用'}
            </strong>
          </div>
          <button onClick={onRefresh} disabled={loading}>
            刷新天气
          </button>
        </div>
        <details className="agent-settings">
          <summary>
            <SlidersHorizontal size={15} />
            精确设置新计划
          </summary>
          <PlanForm
            key={formVersion}
            location={location}
            onChange={() => setInvalidated(true)}
            onSubmit={exactSubmit}
          />
        </details>
      </aside>
    </div>
  );
}
