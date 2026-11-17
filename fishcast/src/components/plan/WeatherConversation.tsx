import { useState } from 'react';
import type { Forecast, PlanRequest, Spot } from '../../domain/models';
import type { ConversationTopic } from '../../planners/conversationIntent';
import { areaLabel, matchesArea } from '../../config/regions';
import { useWeather } from '../../hooks/useWeather';
import { WeatherReply } from './WeatherReply';

type Props = {
  request: PlanRequest;
  topic: ConversationTopic;
  spot?: Spot;
  spots: Spot[];
  forecast: Forecast | null;
  loading: boolean;
  error?: string | null;
  locationLabel: string;
  onRefresh: () => void;
  onAsk: (text: string) => void;
  onSelect: (spot: Spot) => void;
};

function PlaceWeatherReply({ spot, ...props }: Props & { spot: Spot }) {
  const weather = useWeather(spot.location!, spot.isDemo);
  return (
    <WeatherReply
      request={{ ...props.request, location: spot.location! }}
      forecast={weather.forecast}
      loading={weather.loading}
      error={weather.error}
      locationLabel={spot.name}
      intent={props.topic.intent === 'TIMING' ? 'TIMING' : 'WEATHER'}
      focus={props.topic.focus}
      onRefresh={weather.retry}
      onAsk={props.onAsk}
    />
  );
}

export function WeatherConversation(props: Props) {
  const [chosen, setChosen] = useState(props.spot);
  if (chosen?.location) return <PlaceWeatherReply key={chosen.id} {...props} spot={chosen} />;
  if (props.spot && !props.spot.location)
    return (
      <section className="weather-answer" aria-label="天气回答">
        <h3>{props.spot.name}</h3>
        <p>这个场所还没有参考坐标，暂时无法查询当地天气。</p>
        <button className="text-button" onClick={() => props.onAsk('查参考位置的天气')}>
          查看参考位置天气
        </button>
      </section>
    );
  if (props.request.searchArea) {
    const places = props.spots.filter(
      (spot) => !spot.isDemo && spot.location && matchesArea(spot, props.request.searchArea),
    );
    return (
      <section className="weather-answer" aria-label="天气回答">
        <h3>想查{areaLabel(props.request.searchArea)}哪里的天气？</h3>
        <label className="field">
          天气查询地点
          <select
            value=""
            onChange={(event) => {
              const spot = places.find((item) => item.id === event.target.value);
              if (spot) {
                setChosen(spot);
                props.onSelect(spot);
              }
            }}
          >
            <option value="">{places.length ? '选择一个场所' : '这个区域暂无有坐标的场所'}</option>
            {places.map((spot) => (
              <option key={spot.id} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button" onClick={() => props.onAsk('查参考位置的天气')}>
          查看参考位置天气
        </button>
      </section>
    );
  }
  return (
    <WeatherReply
      request={props.request}
      forecast={props.forecast}
      loading={props.loading}
      error={props.error}
      locationLabel={props.locationLabel}
      intent={props.topic.intent === 'TIMING' ? 'TIMING' : 'WEATHER'}
      focus={props.topic.focus}
      onRefresh={props.onRefresh}
      onAsk={props.onAsk}
    />
  );
}
